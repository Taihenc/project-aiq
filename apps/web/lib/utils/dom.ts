/**
 * Walks up the DOM tree to find the nearest scrollable ancestor of `el`.
 * Returns `null` if no scrollable ancestor exists.
 */
export function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el;
  while (node) {
    const { overflow, overflowY } = getComputedStyle(node);
    if (
      /auto|scroll/.test(overflow + overflowY) &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
