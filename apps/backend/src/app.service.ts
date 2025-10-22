import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { ChatRequestDto, ChatCompletionsRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto, ChatCompletionsResponseDto, ChoiceDto, UsageDto, CitationDto } from './dto/chat-response.dto';
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
    return this.configService.get<string>('aiService.baseUrl') || 'http://127.0.0.1:8000';
  }

  getAiEngineBaseUrl(): string {
    return this.configService.get<string>('aiService.aiEngineBaseUrl') || 'http://127.0.0.1:8001';
  }

  getDefaultCrew(): string {
    return this.configService.get<string>('aiService.defaultCrew') || 'document_search_crew';
  }

  // Legacy method for backward compatibility
  chatWithAi(chatRequest: ChatRequestDto): Observable<ChatResponseDto> {
    const aiServiceBaseUrl =
      this.configService.get<string>('aiService.baseUrl') || 'http://127.0.0.1:8000';
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
  chatWithAiEngine(chatRequest: ChatCompletionsRequestDto): Observable<ChatCompletionsResponseDto> {
    try {
      const aiEngineBaseUrl = this.getAiEngineBaseUrl();
      const crew = this.getDefaultCrew();

      // Transform OpenAI format to AI Engine format
      const aiEngineRequest = {
        messages: chatRequest.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      const aiEngineUrl = `${aiEngineBaseUrl}/v1/completions/crew/${crew}`;

      return this.httpService
        .post<{ message: string }>(aiEngineUrl, aiEngineRequest)
        .pipe(
          map((axiosResponse: AxiosResponse<{ message: string }>) =>
            this.transformAiEngineToOpenAI(axiosResponse.data, chatRequest),
          ),
        );
    } catch (error) {
      console.error('Error in chatWithAiOpenAI:', error);
      throw error;
    }
  }

  // Transform AI Engine response to OpenAI format
  private transformAiEngineToOpenAI(
    aiEngineResponse: { message: string },
    originalRequest: ChatCompletionsRequestDto
  ): ChatCompletionsResponseDto {
    const choice: ChoiceDto = {
      index: 0,
      message: {
        role: 'assistant',
        content: aiEngineResponse.message,
      },
      finish_reason: 'stop',
    };

    const usage: UsageDto = {
      prompt_tokens: 0, // AI Engine doesn't return token usage yet
      completion_tokens: 0,
      total_tokens: 0,
    };

    return {
      id: uuidv4(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: originalRequest.model || 'gemini-2.0-flash',
      choices: [choice],
      usage,
      session_id: originalRequest.session_id,
      request_source: originalRequest.request_source,
      citations: undefined,
      processing_time_ms: 0,
    };
  }

  // Transform OpenAI format to legacy format
  private transformOpenAIToLegacy(openAIRequest: ChatCompletionsRequestDto): ChatRequestDto {
    try {
      // Extract the last user message as the main message
      const lastUserMessage = openAIRequest.messages
        .filter(msg => msg.role === 'user')
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
  private transformLegacyToOpenAI(legacyResponse: ChatResponseDto, originalRequest: ChatCompletionsRequestDto): ChatCompletionsResponseDto {
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
    const citations: CitationDto[] | undefined = citationsData.length > 0
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
            platform: citation.platform || citation.source || originalRequest.request_source || 'AI Service',
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
