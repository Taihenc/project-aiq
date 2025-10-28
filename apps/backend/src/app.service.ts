import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
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

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

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
      'document_search_crew'
    );
  }

  // Legacy method for backward compatibility
  chatWithAi(chatRequest: ChatRequestDto): Observable<ChatResponseDto> {
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

  // OpenAI-compatible method with adapter logic using AI Engine
  chatWithAiEngine(
    chatRequest: ChatCompletionsRequestDto,
  ): Observable<ChatCompletionsResponseDto> {
    try {
      const aiEngineBaseUrl = this.getAiEngineBaseUrl();
      const crew = this.getDefaultCrew();

      // Transform OpenAI format to AI Engine format
      const aiEngineRequest = {
        messages: chatRequest.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      const aiEngineUrl = `${aiEngineBaseUrl}/v1/completions/crews/${crew}`;

      return this.httpService.post<any>(aiEngineUrl, aiEngineRequest).pipe(
        map((axiosResponse: AxiosResponse<any>) => {
          // Parse the AI Engine response to handle different formats
          const parsedResponse = this.parseAiEngineResponse(axiosResponse.data);

          const transformed = this.transformAiEngineToOpenAI(
            parsedResponse,
            chatRequest,
          );
          return transformed;
        }),
      );
    } catch (error) {
      console.error('Error in chatWithAiOpenAI:', error);
      throw error;
    }
  }

  // Parse AI Engine response to handle different formats
  private parseAiEngineResponse(data: any): {
    response: string;
    response_type: string;
    sources_used: any[];
    language: string;
  } {
    // If the response already has the expected format, return it
    if (data.response !== undefined && data.response_type !== undefined) {
      return {
        response: data.response,
        response_type: data.response_type,
        sources_used: data.sources_used || [],
        language: data.language || 'en',
      };
    }

    // If the response has a 'message' field with a stringified Pydantic model
    // Format: response="..." or response='...' with response_type, sources_used, language
    if (data.message && typeof data.message === 'string') {
      try {
        // Extract fields using regex - handle both single and double quotes
        // For response field: match either "..." or '...'
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

        // Parse sources_used array
        let sources_used: any[] = [];
        if (sourcesMatch && sourcesMatch[1]) {
          const sourcesStr = sourcesMatch[1];
          // Extract quoted strings from the array (handle both quote types)
          const sourceMatches = sourcesStr.match(/(['"])([^'"]*)\1/g);
          if (sourceMatches) {
            sources_used = sourceMatches.map((s) => s.slice(1, -1)); // Remove quotes
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
        // Fallback: use the entire message as response
        return {
          response: data.message,
          response_type: 'DIRECT',
          sources_used: [],
          language: 'en',
        };
      }
    }

    // Fallback: return a default structure
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
            // If source is a string (source name), create a simple citation object
            if (typeof source === 'string') {
              return {
                id: `citation-${index}`,
                title: source,
                platform: 'AI Engine',
                content: '',
              };
            }
            // If source is an object, use its properties
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
