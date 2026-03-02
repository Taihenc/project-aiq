export const PAGINATION = {
  /** Number of chat sessions fetched per page in the sidebar history */
  HISTORY_PAGE_SIZE:
    Number(process.env.NEXT_PUBLIC_HISTORY_PAGE_SIZE) || 20,

  /** Number of messages fetched per page (initial load + load-older batches) */
  MESSAGES_PAGE_SIZE:
    Number(process.env.NEXT_PUBLIC_MESSAGES_PAGE_SIZE) || 30,
} as const;
