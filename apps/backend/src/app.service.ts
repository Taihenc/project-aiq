import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
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

  // OpenAI-compatible method with adapter logic
  chatWithAiOpenAI(chatRequest: ChatCompletionsRequestDto): Observable<ChatCompletionsResponseDto> {
    try {
      // Transform OpenAI format to legacy format for AI service
      const legacyRequest = this.transformOpenAIToLegacy(chatRequest);
      
      const aiServiceBaseUrl =
        this.configService.get<string>('aiService.baseUrl') || 'http://127.0.0.1:8000';
      
      // If no session_id provided, create one first
      if (!legacyRequest.session_id) {
        return this.createSessionAndChat(aiServiceBaseUrl, legacyRequest, chatRequest);
      }
      
      const aiServiceUrl = `${aiServiceBaseUrl}/v1/chat/`;
      
      return this.httpService
        .post<ChatResponseDto>(aiServiceUrl, legacyRequest)
        .pipe(
          map(
            (axiosResponse: AxiosResponse<ChatResponseDto>) => 
              this.transformLegacyToOpenAI(axiosResponse.data, chatRequest),
          ),
        );
    } catch (error) {
      console.error('Error in chatWithAiOpenAI:', error);
      throw error;
    }
  }

  // Helper method to create session and then chat
  private createSessionAndChat(
    aiServiceBaseUrl: string, 
    legacyRequest: ChatRequestDto, 
    originalRequest: ChatCompletionsRequestDto
  ): Observable<ChatCompletionsResponseDto> {
    const createSessionUrl = `${aiServiceBaseUrl}/v1/chat/create-session`;
    
    return this.httpService
      .post(createSessionUrl, {}, { responseType: 'text' })
      .pipe(
        switchMap((sessionResponse: AxiosResponse<string>) => {
          // Update the legacy request with the new session ID
          legacyRequest.session_id = sessionResponse.data.replace(/"/g, ''); // Remove quotes if present
          const aiServiceUrl = `${aiServiceBaseUrl}/v1/chat/`;
          return this.httpService.post<ChatResponseDto>(aiServiceUrl, legacyRequest);
        }),
        map((axiosResponse: AxiosResponse<ChatResponseDto>) => 
          this.transformLegacyToOpenAI(axiosResponse.data, originalRequest)
        )
      );
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
