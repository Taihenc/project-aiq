import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
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
import { ChatHistoryService } from './chat-history/chat-history.service';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly chatHistoryService: ChatHistoryService,
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

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
  chatWithAi(chatRequest: ChatRequestDto, userId: string): Observable<ChatResponseDto> {
    const aiServiceBaseUrl =
      this.configService.get<string>('aiService.baseUrl') ||
      'http://127.0.0.1:8000';
    const aiServiceUrl = `${aiServiceBaseUrl}/v1/chat/`;
    return this.httpService
      .post<ChatResponseDto>(aiServiceUrl, chatRequest)
      .pipe(
        map(
          (axiosResponse: AxiosResponse<ChatResponseDto>) => axiosResponse.data,
        ),
      );
  }

  // OpenAI-compatible method with adapter logic using AI Engine workflows
  chatWithAiEngine(
    chatRequest: ChatCompletionsRequestDto,
    userId: string,
  ): Observable<ChatCompletionsResponseDto> {
    try {
      const aiEngineBaseUrl = this.getAiEngineBaseUrl();
      const crew = this.getDefaultCrew();

      // Transform OpenAI format to AI Engine format (CrewRequest shape)
      const chatHistory = chatRequest.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const lastUserMessage = [...chatRequest.messages]
        .reverse()
        .find((m) => m.role === 'user');
      const sessionId = chatRequest.session_id || '';
      return from(this.chatHistoryService.getSessionSummary(sessionId)).pipe(
        switchMap((sessionData) => {
          const existingSummary = sessionData?.summary || '';

          return from(
            this.chatHistoryService.getUnsummarizedMessages(
              sessionId,
              sessionData?.lastSummarizedMessageId,
            ),
          ).pipe(
            switchMap((unsummarizedMessages) => {
              const historyFromDb = unsummarizedMessages.map((msg) => ({
                role: msg.role,
                content: msg.content,
              }));

              const aiEngineRequest = {
                inputs: {
                  user_query: lastUserMessage
                    ? lastUserMessage.content
                    : chatRequest.messages.slice(-1)[0]?.content || '',
                  chat_history: historyFromDb,
                  context: [existingSummary],
                },
              };

              const aiEngineUrl = `${aiEngineBaseUrl}/api/v1/workflows/${crew}/completion`;

              return this.httpService.post<any>(aiEngineUrl, aiEngineRequest).pipe(
                switchMap(async (axiosResponse: AxiosResponse<any>) => {
                  // The AI Engine response is nested under `data`
                  const aiEngineData = axiosResponse.data;

                  // Parse the workflow response
                  const parsedResponse = this.parseAiEngineResponse(
                    aiEngineData.data.result,
                  );

                  console.log('[BACKEND] Parsed workflow response:', parsedResponse);

                  const transformed = this.transformAiEngineToOpenAI(
                    parsedResponse,
                    chatRequest,
                  );

                  if (chatRequest.session_id) {
                    await this.chatHistoryService.addMessage(
                      chatRequest.session_id,
                      userId,
                      'user',
                      aiEngineRequest.inputs.user_query
                    );
                    await this.chatHistoryService.addMessage(
                      chatRequest.session_id,
                      userId,
                      'assistant',
                      transformed.choices[0].message.content,
                      transformed.citations
                    );

                    const unsummarized = await this.chatHistoryService.getUnsummarizedMessages(
                      chatRequest.session_id,
                      sessionData?.lastSummarizedMessageId
                    );
                    if (unsummarized.length >= 6) {
                      this.summarizeContext(unsummarized, existingSummary).then(async (newFullSummary) => {
                        if (newFullSummary) {
                          const lastId = unsummarized[unsummarized.length - 1].id;
                          await this.chatHistoryService.updateSessionSummary(
                            sessionId,
                            newFullSummary,
                            lastId
                          );
                          console.log(`[BACKEND] Session ${sessionId} summarized.`);
                        }
                      });
                    }
                  }

                  return transformed;
                }),
              );
            }),
          );
        }),
      );
    } catch (error) {
      console.error('Error in chatWithAiEngine:', error);
      throw error;
    }
  }

  async summarizeContext(
    messages: { role: string; content: string }[],
    existingSummary: string = '',
  ): Promise<string> {
    try {
      const aiEngineBaseUrl = this.getAiEngineBaseUrl();
      const modelId = this.configService.get<string>('aiService.defaultModel') || 'gpt-4o-mini';

      const prompt = `
      Please summarize the following conversation history into a concise, single paragraph memory.

      Existing Memory:
      "${existingSummary}"

      New Messages:
      ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

      Instructions:
      1. Merge the "Existing Memory" and "New Messages" into a SINGLE cohesive paragraph.
      2. Focus on key decisions, user preferences, and important facts.
      3. Do not include meta-commentary (e.g., "The user said...", "In this conversation..."). Just state the facts.
      4. Keep it concise.
      5. If "Existing Memory" is empty, just summarize the "New Messages".
      `;

      const request = {
        messages: [
          { role: 'system', content: 'You are an expert summarizer for AI memory systems.' },
          { role: 'user', content: prompt }
        ],
        config: {
          temperature: 0.3,
        }
      };

      const url = `${aiEngineBaseUrl}/api/v1/models/${modelId}/completion`;

      const response = await this.httpService.post(url, request).toPromise();
      return response?.data?.data?.content || '';
    } catch (error) {
      console.error('[BACKEND] Error summarizing context:', error);
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
      let response = data.final_answer || '';
      let response_type = 'DIRECT';
      let sources_used: any[] = data.file_path || [];
      let language = 'en';

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
        console.error('[BACKEND] Error parsing AI Engine message:', error);
        return {
          response: data.message,
          response_type: 'DIRECT',
          sources_used: [],
          language: 'en',
        };
      }
    }

    console.warn('[BACKEND] Unknown AI Engine response format, using fallback');
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

  // Transform OpenAI format to legacy format
  private transformOpenAIToLegacy(
    openAIRequest: ChatCompletionsRequestDto,
  ): ChatRequestDto {
    try {
      // Extract the last user message as the main message
      const lastUserMessage = openAIRequest.messages
        .filter((msg) => msg.role === 'user')
        .pop();

      if (!lastUserMessage) {
        throw new Error('No user message found in the request');
      }

      // Build context from conversation history
      const context: Record<string, any> = {
        conversation_history: openAIRequest.messages,
        request_source: openAIRequest.request_source || 'frontend',
      };

      return {
        chat_box: {
          message: lastUserMessage.content,
          context,
        },
        session_id: openAIRequest.session_id,
        provider: openAIRequest.provider,
        model: openAIRequest.model,
        temperature: openAIRequest.temperature,
        top_k: openAIRequest.top_k,
        top_p: openAIRequest.top_p,
        max_tokens: openAIRequest.max_tokens,
        frequency_penalty: openAIRequest.frequency_penalty,
        presence_penalty: openAIRequest.presence_penalty,
        stream: openAIRequest.stream,
        stop_sequences: openAIRequest.stop,
        seed: openAIRequest.seed,
      };
    } catch (error) {
      console.error('Error in transformOpenAIToLegacy:', error);
      throw error;
    }
  }

  // Transform legacy format to OpenAI format
  private transformLegacyToOpenAI(
    legacyResponse: ChatResponseDto,
    originalRequest: ChatCompletionsRequestDto,
  ): ChatCompletionsResponseDto {
    const choice: ChoiceDto = {
      index: 0,
      message: {
        role: 'assistant',
        content: legacyResponse.chat_box.message,
      },
      finish_reason: 'stop',
    };

    const usage: UsageDto = {
      prompt_tokens: legacyResponse.prompt_tokens,
      completion_tokens: legacyResponse.completion_tokens,
      total_tokens: legacyResponse.total_tokens,
    };

    // Extract citations from context if available
    const citationsData = legacyResponse.chat_box.context?.citations || [];

    // Transform citations to proper format
    const citations: CitationDto[] | undefined =
      citationsData.length > 0
        ? citationsData.map((citation: any, index: number) => {
          // If citation is a string, convert to object
          if (typeof citation === 'string') {
            return {
              id: `citation-${index}`,
              title: citation,
              platform: originalRequest.request_source || 'AI Service',
              content: '',
            };
          }
          // If citation is already an object, use it
          return {
            id: citation.id || `citation-${index}`,
            title: citation.title || citation.name || citation,
            platform:
              citation.platform ||
              citation.source ||
              originalRequest.request_source ||
              'AI Service',
            content: citation.content || citation.description || '',
          };
        })
        : undefined;

    return {
      id: legacyResponse.chat_id || uuidv4(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: legacyResponse.model_used,
      choices: [choice],
      usage,
      session_id: legacyResponse.session_id,
      request_source: originalRequest.request_source,
      citations,
      processing_time_ms: legacyResponse.processing_time_ms,
    };
  }
}
