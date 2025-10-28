import { UIMessage } from '@/types/chat';

/**
 * Demo messages for preview/demo mode
 * Used when NEXT_PUBLIC_DEMO_MODE is set to 'true'
 */
export const DEMO_MESSAGES: UIMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'What is current Product Roadmap?',
  },
  {
    id: '2',
    role: 'assistant',
    content:
      "Based on your query about 'What is current Product Roadmap?', I found relevant information from your knowledge sources. The data shows significant growth trends in Q4 2024, with revenue increasing by 23% compared to the previous quarter. This growth was primarily driven by new product launches and expanded market presence in key demographics.",
    model: 'gpt-3.5-turbo',
    citations: [
      {
        id: '1',
        title: 'Q4 Financial Report 2024',
        platform: 'SharePoint',
        content:
          'Revenue increased by 23% compared to Q3, driven primarily by our new product launches and expanded market presence. Revenue increased by 23% compared to Q3, driven primarily by our new product launches and expanded market presence.',
      },
      {
        id: '2',
        title: 'New Product',
        platform: 'SharePoint',
        content:
          'Revenue increased by 23% compared to Q3, driven primarily by our new product launches and expanded market presence. Revenue increased by 23% compared to Q3, driven primarily by our new product launches and expanded market presence.',
      },
    ],
  },
  {
    id: '3',
    role: 'user',
    content: 'How are you doing today?',
  },
  {
    id: '4',
    role: 'assistant',
    content: 'I\'m doing well, thank you for asking! I\'m here to help you with any questions you might have. How can I assist you today?',
    model: 'gpt-3.5-turbo',
    // No citations for this response
  },
];

