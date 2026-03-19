/**
 * StreamingTextGuard
 *
 * Client-side defense-in-depth layer for token events emitted by the search-flow service.
 *
 * The search-flow `_handle_token()` state machine already extracts only the human-readable
 * text from the `"response"` field of the LLM's JSON output, so tokens that arrive at the
 * frontend are already clean text. However, this guard exists to:
 *
 *  1. Silently drop any structural JSON characters (`{`, `}`, `[`, `]`, `"`, `:`) that
 *     could appear before real text has started (e.g., during schema refactors or edge cases
 *     in the service's streaming logic).
 *  2. Provide a single, testable place to evolve token-filtering logic without touching
 *     the main hook.
 *
 * Usage:
 *   const guard = new StreamingTextGuard();
 *   // reset() once per new assistant message (before the stream loop)
 *   guard.reset();
 *   // For each "token" event:
 *   const safeText = guard.feed(event.content);
 *   if (safeText) appendToMessage(safeText);
 */

// Characters that are only ever structural in a JSON schema response.
// A run consisting *solely* of these characters (plus whitespace) before any
// real prose has been seen is considered a JSON artifact and is dropped.
const JSON_STRUCTURAL_ONLY = /^[\s{}\[\]",:0-9]*$/;

export class StreamingTextGuard {
  /** Whether we have already emitted at least one real (non-structural) character. */
  private _seenText = false;

  /**
   * Feed a raw token string received from a `token` SSE event.
   *
   * Returns the portion of the token that is safe to append to the UI.
   * May return an empty string (token should be ignored).
   */
  feed(token: string): string {
    if (!token) return '';

    // If we haven't seen any real text yet, check whether this chunk is purely
    // structural. If so, discard it silently.
    if (!this._seenText) {
      if (JSON_STRUCTURAL_ONLY.test(token)) {
        return '';
      }

      // The token contains at least one non-structural character — real text has
      // started. Strip any leading structural chars from this first token so they
      // don't bleed into the output.
      const leadingStructural = /^[\s{}\[\]",:0-9]*/;
      const cleaned = token.replace(leadingStructural, '');
      if (!cleaned) return '';

      this._seenText = true;
      return cleaned;
    }

    // We're in the middle of real text — pass the token through as-is.
    // The service's _handle_token already handles unescaping (\n, \t, etc.).
    return token;
  }

  /**
   * Reset internal state. Call this once before starting a new assistant message stream.
   */
  reset(): void {
    this._seenText = false;
  }
}
