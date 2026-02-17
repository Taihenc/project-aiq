import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom, Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  ChatRequestDto,
  ChatCompletionsRequestDto,
} from './dto/chat-request.dto';
import {
  ChatResponseDto,
  ChatCompletionsResponseDto,
  ChoiceDto,
  UsageDto,
  CitationDto,
} from './dto/chat-response.dto';
import { v4 as uuidv4 } from 'uuid';
import { ChatHistoryService } from '../chat-history/chat-history.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly chatHistoryService: ChatHistoryService,
  ) { }

  getAiServiceBaseUrl(): string {
    return (
      this.configService.get<string>('aiService.baseUrl') ||
      'http://127.0.0.1:8000'
    );
  }

  getAiEngineBaseUrl(): string {
    return (
      this.configService.get<string>('aiService.aiEngineBaseUrl') ||
      'http://127.0.0.1:8001'
    );
  }

  getDefaultCrew(): string {
    return (
      this.configService.get<string>('aiService.defaultCrew') ||
      'aiq_search_crew'
    );
  }

  // Legacy method for backward compatibility
  async chatWithAi(
    chatRequest: ChatRequestDto,
    userId: string,
  ): Promise<ChatResponseDto> {
    const aiServiceBaseUrl = this.getAiServiceBaseUrl();
    const aiServiceUrl = `${aiServiceBaseUrl}/v1/chat/`;
    const axiosResponse = await firstValueFrom(
      this.httpService.post<ChatResponseDto>(aiServiceUrl, chatRequest),
    );
    return axiosResponse.data;
  }

  // OpenAI-compatible method with adapter logic using AI Engine workflows
  async chatWithAiEngine(
    chatRequest: ChatCompletionsRequestDto,
    userId: string,
  ): Promise<ChatCompletionsResponseDto> {
    try {
      const sessionId = chatRequest.session_id || '';

      this.logger.debug(`Processing chat request for session: ${sessionId}`);

      // 1. Get History Context
      const sessionData =
        await this.chatHistoryService.getSessionSummary(sessionId);
      const existingSummary = sessionData?.summary || '';

      this.logger.verbose(
        `Existing summary retrieved: ${existingSummary.substring(0, 50)}...`,
      );

      const unsummarizedMessages =
        await this.chatHistoryService.getUnsummarizedMessages(
          sessionId,
          sessionData?.lastSummarizedMessageId,
        );

      this.logger.verbose(
        `Retrieved ${unsummarizedMessages.length} unsummarized messages`,
      );

      // 2. Prepare and Call AI Engine
      const aiEngineRequest = this.prepareAiEngineRequest(
        chatRequest,
        unsummarizedMessages,
        existingSummary,
      );

      const aiEngineUrl = this.getAiEngineCompletionUrl();
      this.logger.debug(`Calling AI Engine at: ${aiEngineUrl}`);

      const axiosResponse = await firstValueFrom(
        this.httpService.post<any>(aiEngineUrl, aiEngineRequest),
      );

      this.logger.verbose('Received raw response from AI Engine');

      // 3. Transform Response
      const transformed = this.transformAiEngineToOpenAI(
        this.parseAiEngineResponse(axiosResponse.data.data.result),
        chatRequest,
      );

      // 4. Post-Chat Actions
      if (sessionId) {
        await this.handlePostChatActions(
          sessionId,
          userId,
          aiEngineRequest.inputs.user_query,
          transformed,
          sessionData?.lastSummarizedMessageId ?? undefined,
          existingSummary,
        );
      }

      return transformed;
    } catch (error) {
      this.logger.error('Error in chatWithAiEngine:', error);
      throw error;
    }
  }

  async chatWithAiEngineStream(
    chatRequest: ChatCompletionsRequestDto,
    userId: string,
  ): Promise<Observable<MessageEvent>> {
    try {
      const sessionId = chatRequest.session_id || '';
      const sessionData =
        await this.chatHistoryService.getSessionSummary(sessionId);
      const existingSummary = sessionData?.summary || '';
      const unsummarizedMessages =
        await this.chatHistoryService.getUnsummarizedMessages(
          sessionId,
          sessionData?.lastSummarizedMessageId,
        );

      const aiEngineRequest = this.prepareAiEngineRequest(
        chatRequest,
        unsummarizedMessages,
        existingSummary,
      );

      const aiEngineUrl = this.getAiEngineStreamUrl();
      this.logger.debug(`Streaming from AI Engine at: ${aiEngineUrl}`);

      return new Observable<MessageEvent>((subscriber) => {
        this.httpService
          .post(aiEngineUrl, aiEngineRequest, { responseType: 'stream' })
          .subscribe({
            next: (response) => {
              const stream = response.data;
              let fullResult: any = null;

              let buffer = '';
              stream.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');

                // The last element is either empty (if chunk ended with \n)
                // or a partial JSON string. Buffer it for next chunk.
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (!line.trim()) continue;

                  try {
                    const json = JSON.parse(line);
                    this.logger.verbose(`Relaying AI Engine Event: ${json.type}`);

                    if (json.type === 'result') {
                      fullResult = json;
                    }

                    subscriber.next({ data: JSON.stringify(json) } as MessageEvent);
                  } catch (e) {
                    this.logger.warn(`Failed to parse AI Engine line: ${line.substring(0, 100)}...`);
                  }
                }
              });

              stream.on('end', async () => {
                if (fullResult && sessionId) {
                  // Properly parse the result content which might be an object
                  const parsedResponse = this.parseAiEngineResponse(fullResult.content);
                  const transformed = this.transformAiEngineToOpenAI(
                    parsedResponse,
                    chatRequest,
                  );

                  await this.handlePostChatActions(
                    sessionId,
                    userId,
                    aiEngineRequest.inputs.user_query,
                    transformed,
                    sessionData?.lastSummarizedMessageId ?? undefined,
                    existingSummary,
                  ).catch((err) =>
                    this.logger.error('Streaming post-chat actions failed', err),
                  );
                }
                subscriber.complete();
              });

              stream.on('error', (err) => {
                this.logger.error('AI Engine stream error', err);
                subscriber.error(err);
              });
            },
            error: (err) => {
              this.logger.error('Failed to connect to AI Engine stream', err);
              subscriber.error(err);
            },
          });
      });
    } catch (error) {
      this.logger.error('Error in chatWithAiEngineStream:', error);
      throw error;
    }
  }

  private getAiEngineStreamUrl(): string {
    const aiEngineBaseUrl = this.getAiEngineBaseUrl();
    const crew = this.getDefaultCrew();
    return `${aiEngineBaseUrl}/api/v1/workflows/${crew}/completion/stream`;
  }

  private getAiEngineCompletionUrl(): string {
    const aiEngineBaseUrl = this.getAiEngineBaseUrl();
    const crew = this.getDefaultCrew();
    return `${aiEngineBaseUrl}/api/v1/workflows/${crew}/completion`;
  }

  private prepareAiEngineRequest(
    chatRequest: ChatCompletionsRequestDto,
    unsummarizedMessages: any[],
    existingSummary: string,
  ) {
    const lastUserMessage = [...chatRequest.messages]
      .reverse()
      .find((m) => m.role === 'user');

    const historyFromDb = unsummarizedMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    return {
      inputs: {
        user_query:
          lastUserMessage?.content ||
          chatRequest.messages.slice(-1)[0]?.content ||
          '',
        chat_history: historyFromDb,
        context: [existingSummary],
      },
    };
  }

  private async handlePostChatActions(
    sessionId: string,
    userId: string,
    userQuery: string,
    transformedResponse: ChatCompletionsResponseDto,
    lastSummarizedMessageId: string | undefined,
    existingSummary: string,
  ): Promise<void> {
    this.logger.debug(`Post-chat actions for session: ${sessionId}, user: ${userId}`);

    const assistantContent = transformedResponse.choices[0].message.content || '';
    const userQueryContent = userQuery || '';

    this.logger.verbose(`User query: ${userQueryContent.substring(0, 50)}...`);
    this.logger.verbose(`Assistant content length: ${assistantContent.length}`);

    // Save messages to history
    try {
      await this.chatHistoryService.addMessage(
        sessionId,
        userId,
        'user',
        userQueryContent,
      );
      await this.chatHistoryService.addMessage(
        sessionId,
        userId,
        'assistant',
        assistantContent,
        transformedResponse.citations,
      );
    } catch (err: any) {
      this.logger.error(`Failed to add messages in handlePostChatActions: ${err.message}`, err.stack);
      throw err;
    }

    // Trigger summarization if needed
    const unsummarized = await this.chatHistoryService.getUnsummarizedMessages(
      sessionId,
      lastSummarizedMessageId,
    );

    this.logger.debug(`Unsummarized message count: ${unsummarized.length}`);

    if (unsummarized.length >= 6) {
      this.summarizeAndSaveSession(
        sessionId,
        unsummarized,
        existingSummary,
      ).catch((err: any) =>
        this.logger.error(`Summarization failed for ${sessionId}:`, err),
      );
    }
  }

  private async summarizeAndSaveSession(
    sessionId: string,
    messages: any[],
    existingSummary: string,
  ): Promise<void> {
    const newFullSummary = await this.summarizeContext(
      messages,
      existingSummary,
    );
    if (newFullSummary) {
      const lastId = messages[messages.length - 1].id;
      await this.chatHistoryService.updateSessionSummary(
        sessionId,
        newFullSummary,
        lastId,
      );
      this.logger.log(`Session ${sessionId} summarized.`);
    }
  }

  async summarizeContext(
    messages: { role: string; content: string }[],
    existingSummary: string = '',
  ): Promise<string> {
    try {
      const aiEngineBaseUrl = this.getAiEngineBaseUrl();
      const modelId =
        this.configService.get<string>('aiService.defaultModel') ||
        'gpt-4o-mini';

      const prompt = `
      Please summarize the following conversation history into a concise, single paragraph memory.

      Existing Memory:
      "${existingSummary}"

      New Messages:
      ${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}

      Instructions:
      1. Merge the "Existing Memory" and "New Messages" into a SINGLE cohesive paragraph.
      2. Focus on key decisions, user preferences, and important facts.
      3. Do not include meta-commentary (e.g., "The user said...", "In this conversation..."). Just state the facts.
      4. Keep it concise.
      5. If "Existing Memory" is empty, just summarize the "New Messages".
      `;

      const request = {
        messages: [
          {
            role: 'system',
            content: 'You are an expert summarizer for AI memory systems.',
          },
          { role: 'user', content: prompt },
        ],
        config: {
          temperature: 0.3,
        },
      };

      const url = `${aiEngineBaseUrl}/api/v1/models/${modelId}/completion`;

      const response = await this.httpService.post(url, request).toPromise();
      return response?.data?.data?.content || '';
    } catch (error) {
      this.logger.error('Error summarizing context:', error);
      return '';
    }
  }

  // Parse completion response to handle different formats
  private parseAiEngineResponse(data: any): {
    response: string;
    response_type: string;
    sources_used: any[];
    language: string;
  } {
    // Handle the new CompletionData format
    if (data) {
      const response = data.final_answer || '';
      const response_type = 'DIRECT';
      const sources_used: any[] = data.file_path || [];
      const language = 'en';

      return {
        response,
        response_type,
        sources_used,
        language,
      };
    }

    // Fallback for old formats
    if (data.response !== undefined && data.response_type !== undefined) {
      return {
        response: data.response,
        response_type: data.response_type,
        sources_used: data.sources_used || [],
        language: data.language || 'en',
      };
    }

    if (data.message && typeof data.message === 'string') {
      try {
        const responseMatch = data.message.match(
          /response=(["'])((?:(?!\1).|\\\1)*?)\1/,
        );
        const responseTypeMatch = data.message.match(
          /response_type=(["'])([^'"]*)\1/,
        );
        const sourcesMatch = data.message.match(/sources_used=\[([^\]]*)\]/);
        const languageMatch = data.message.match(/language=(["'])([^'"]*)\1/);

        const response = responseMatch
          ? responseMatch[2].replace(/\\"/g, '"').replace(/\\'/g, "'")
          : '';
        const response_type = responseTypeMatch
          ? responseTypeMatch[2]
          : 'DIRECT';
        const language = languageMatch ? languageMatch[2] : 'en';

        let sources_used: any[] = [];
        if (sourcesMatch && sourcesMatch[1]) {
          const sourcesStr = sourcesMatch[1];
          const sourceMatches = sourcesStr.match(/(['"])([^'"]*)\1/g);
          if (sourceMatches) {
            sources_used = sourceMatches.map((s) => s.slice(1, -1));
          }
        }

        return {
          response,
          response_type,
          sources_used,
          language,
        };
      } catch (error) {
        this.logger.error('Error parsing AI Engine message:', error);
        return {
          response: data.message,
          response_type: 'DIRECT',
          sources_used: [],
          language: 'en',
        };
      }
    }

    this.logger.warn('Unknown AI Engine response format, using fallback');
    return {
      response: data.message || JSON.stringify(data),
      response_type: 'DIRECT',
      sources_used: [],
      language: 'en',
    };
  }

  // Transform AI Engine response to OpenAI format
  private transformAiEngineToOpenAI(
    aiEngineResponse: {
      response: string;
      response_type: string;
      sources_used: any[];
      language: string;
    },
    originalRequest: ChatCompletionsRequestDto,
  ): ChatCompletionsResponseDto {
    const choice: ChoiceDto = {
      index: 0,
      message: {
        role: 'assistant',
        content: aiEngineResponse.response,
      },
      finish_reason: 'stop',
    };

    const usage: UsageDto = {
      prompt_tokens: 0, // AI Engine doesn't return token usage yet
      completion_tokens: 0,
      total_tokens: 0,
    };

    // Transform sources_used to citations if available
    // const citations: CitationDto[] | undefined = aiEngineResponse.sources_used && aiEngineResponse.sources_used.length > 0
    //   ? aiEngineResponse.sources_used.map((source: any, index: number) => ({
    //       id: source.id || `citation-${index}`,
    //       title: source.title || source.name || `Source ${index + 1}`,
    //       platform: source.platform || source.source || 'AI Engine',
    //       content: source.content || source.description || '',
    //     }))
    //   : undefined;

    // right now the sources_used is only a array list of source name ex. "sources_used": ["stars_001", "stars_002", "stars_003"]
    // so for the citations title we will use the source name ex. "stars_001", "stars_002", "stars_003"

    const citations: CitationDto[] | undefined =
      aiEngineResponse.sources_used && aiEngineResponse.sources_used.length > 0
        ? aiEngineResponse.sources_used.map((source: any, index: number) => {
          if (typeof source === 'string') {
            return {
              id: `citation-${index}`,
              title: source,
              platform: 'AI Engine',
              content: '',
            };
          }
          return {
            id: source.id || `citation-${index}`,
            title: source.title || source.name || `Source ${index + 1}`,
            platform: source.platform || source.source || 'AI Engine',
            content: source.content || source.description || '',
          };
        })
        : undefined;

    return {
      id: uuidv4(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: originalRequest.model || 'gpt-4o-mini',
      choices: [choice],
      usage,
      session_id: originalRequest.session_id,
      request_source: originalRequest.request_source,
      citations,
      processing_time_ms: 0,
    };
  }
}
