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
      'http://127.0.0.1:8000'
    );
  }

  getEmbeddingServiceUrl(): string {
    return (
      this.configService.get<string>('aiService.embeddingServiceUrl') ||
      'http://127.0.0.1:8003'
    );
  }

  async enrichResultWithCitations(resultEvent: any): Promise<any> {
    if (resultEvent.type !== 'result' || !resultEvent.content) {
      return resultEvent;
    }

    const content = resultEvent.content;
    const citations = content.citations || content.sources_used;

    if (!citations || !Array.isArray(citations) || citations.length === 0) {
      return resultEvent;
    }

    this.logger.debug(
      `Enriching ${citations.length} citations from embedding service...`,
    );

    const embeddingUrl = this.getEmbeddingServiceUrl();
    const enrichedCitations: any[] = [];

    for (let i = 0; i < citations.length; i++) {
      const citation = citations[i];

      // Handle FileRef structure with chunks → flatten to per-chunk citations
      if (
        citation.file_path &&
        citation.chunks &&
        Array.isArray(citation.chunks)
      ) {
        for (let ci = 0; ci < citation.chunks.length; ci++) {
          const chunk = citation.chunks[ci];
          let chunkContent = '';

          try {
            const response = await firstValueFrom(
              this.httpService.get(`${embeddingUrl}/v1/get/${chunk.chunk_id}`, {
                validateStatus: () => true,
              }),
            );

            if (response.status === 200 && response.data) {
              chunkContent = response.data.text || '';
            } else {
              this.logger.warn(
                `Chunk not found: ${chunk.chunk_id}, status: ${response.status}`,
              );
            }
          } catch (e: any) {
            this.logger.warn(
              `Failed to fetch chunk ${chunk.chunk_id}: ${e.message}`,
            );
          }

          enrichedCitations.push({
            id: chunk.chunk_id || `citation-${i}-${ci}`,
            title: `${citation.file_path} (Page ${chunk.page_number || '?'})`,
            platform: 'AI Engine',
            content: chunkContent,
          });
        }
        continue;
      }

      // Handle simple string (legacy)
      if (typeof citation === 'string') {
        enrichedCitations.push({
          id: `citation-${i}`,
          title: citation,
          platform: 'AI Engine',
          content: '',
        });
        continue;
      }

      // Handle generic object
      enrichedCitations.push({
        id: citation.id || `citation-${i}`,
        title:
          citation.title ||
          citation.name ||
          citation.file_path ||
          `Source ${i + 1}`,
        platform: citation.platform || 'AI Engine',
        content: citation.content || '',
      });
    }

    // Deduplicate citations by ID to prevent frontend key errors
    const uniqueCitations: any[] = [];
    const seenIds = new Set<string>();
    for (const citation of enrichedCitations) {
      if (!seenIds.has(citation.id)) {
        seenIds.add(citation.id);
        uniqueCitations.push(citation);
      }
    }

    if (content.citations) content.citations = uniqueCitations;
    if (content.sources_used) content.sources_used = uniqueCitations;

    this.logger.debug('Citations enriched successfully');
    return { ...resultEvent, content };
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

      // 3. Parse and Enrich Response
      const parsed = this.parseAiEngineResponse(axiosResponse.data.data);

      // Enrich citations with content from embedding service
      if (parsed.sources_used && parsed.sources_used.length > 0) {
        try {
          const enrichedResult = await this.enrichResultWithCitations({
            type: 'result',
            content: { citations: parsed.sources_used },
          });
          parsed.sources_used =
            enrichedResult.content.citations || parsed.sources_used;
        } catch (err: any) {
          this.logger.warn(
            `Failed to enrich citations (non-stream): ${err.message}`,
          );
        }
      }

      const transformed = this.transformAiEngineToOpenAI(parsed, chatRequest);

      // 4. Post-Chat Actions
      if (sessionId) {
        await this.handlePostChatActions(
          sessionId,
          userId,
          aiEngineRequest.query,
          transformed,
          sessionData?.lastSummarizedMessageId ?? undefined,
          existingSummary,
        );
      }

      return transformed;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message;
      this.logger.error(`Error in chatWithAiEngine: ${errorMsg}`);
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
              let processingPromise: Promise<void> = Promise.resolve();

              stream.on('data', (chunk: Buffer) => {
                const processChunk = async () => {
                  buffer += chunk.toString();
                  const lines = buffer.split('\n');

                  // The last element is either empty (if chunk ended with \n)
                  // or a partial JSON string. Buffer it for next chunk.
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                      let json = JSON.parse(line);
                      this.logger.verbose(
                        `Relaying AI Engine Event: ${json.type}`,
                      );

                      if (json.type === 'error') {
                        this.logger.error(
                          `AI Engine returned error: ${json.content}`,
                        );
                      }

                      if (json.type === 'result') {
                        // Enrich result with citation content before sending to frontend
                        try {
                          json = await this.enrichResultWithCitations(json);
                          this.logger.debug(
                            `Enriched result with citations: ${JSON.stringify(json)}`,
                          );
                        } catch (err: any) {
                          this.logger.warn(
                            `Failed to enrich citations: ${err.message}`,
                          );
                        }
                        fullResult = json;
                      }

                      subscriber.next({
                        data: JSON.stringify(json),
                      } as MessageEvent);
                    } catch (e: any) {
                      this.logger.warn(
                        `Failed to parse/process AI Engine line: ${line.substring(
                          0,
                          100,
                        )}... Error: ${e.message}`,
                      );
                    }
                  }
                };
                // Chain promises so end handler can await all processing
                processingPromise = processingPromise.then(processChunk);
              });

              stream.on('end', async () => {
                // Wait for any in-flight data processing (enrichment) to finish
                await processingPromise;

                if (fullResult && sessionId) {
                  // Properly parse the result content which might be an object
                  const parsedResponse = this.parseAiEngineResponse(
                    fullResult.content,
                  );
                  const transformed = this.transformAiEngineToOpenAI(
                    parsedResponse,
                    chatRequest,
                  );

                  this.logger.verbose(
                    `Raw AI Engine Response: ${JSON.stringify(fullResult)}`,
                  );

                  await this.handlePostChatActions(
                    sessionId,
                    userId,
                    aiEngineRequest.query,
                    transformed,
                    sessionData?.lastSummarizedMessageId ?? undefined,
                    existingSummary,
                  ).catch((err) =>
                    this.logger.error(
                      'Streaming post-chat actions failed',
                      err,
                    ),
                  );
                }
                subscriber.complete();
              });

              stream.on('error', (err: any) => {
                const errorMsg =
                  err.response?.data?.detail ||
                  err.response?.data?.message ||
                  err.message;
                this.logger.error(`AI Engine stream error: ${errorMsg}`);
                subscriber.error(err);
              });
            },
            error: (err: any) => {
              const errorMsg =
                err.response?.data?.detail ||
                err.response?.data?.message ||
                err.message;
              this.logger.error(
                `Failed to connect to AI Engine stream: ${errorMsg}`,
              );
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
    return `${aiEngineBaseUrl}/api/v1/completions/stream`;
  }

  private getAiEngineCompletionUrl(): string {
    const aiEngineBaseUrl = this.getAiEngineBaseUrl();
    return `${aiEngineBaseUrl}/api/v1/completions`;
  }

  private prepareAiEngineRequest(
    chatRequest: ChatCompletionsRequestDto,
    unsummarizedMessages: any[],
    existingSummary: string,
  ) {
    const lastUserMessage = [...chatRequest.messages]
      .reverse()
      .find((m) => m.role === 'user');

    const historyStrings = unsummarizedMessages.map(
      (msg) => `${msg.role === 'user' ? 'User' : 'Agent'}: ${msg.content}`,
    );

    return {
      query:
        lastUserMessage?.content ||
        chatRequest.messages.slice(-1)[0]?.content ||
        '',
      history: historyStrings,
      attachments: (chatRequest.attachments || []).map((att) => ({
        file_path: att.file_path,
        chunks: (att.chunks || []).map((chunk) => {
          // Explicitly construct ChunkMetadata to drop extra fields
          // AI Engine Pydantic models are strict (extra='forbid')
          const cleanChunk: any = {
            chunk_id: chunk.chunk_id,
            page_number: chunk.page_number,
          };
          if (chunk.score !== undefined) cleanChunk.score = chunk.score;
          return cleanChunk;
        }),
      })),
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
    this.logger.debug(
      `Post-chat actions for session: ${sessionId}, user: ${userId}`,
    );

    const assistantContent =
      transformedResponse.choices[0].message.content || '';
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
      this.logger.error(
        `Failed to add messages in handlePostChatActions: ${err.message}`,
        err.stack,
      );
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
    // Handle the new FlowResponse format from AIQ-164
    if (data && (data.response !== undefined || data.action !== undefined)) {
      const response = data.response || data.final_answer || '';
      const response_type = data.action || 'DIRECT';
      const sources_used: any[] = data.citations || data.file_path || [];
      const language = data.language || 'en';

      return {
        response,
        response_type: response_type.toUpperCase(),
        sources_used,
        language,
      };
    }

    // Handle the CompletionData format (legacy/intermediate)
    if (
      data &&
      (data.final_answer !== undefined || data.file_path !== undefined)
    ) {
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

    const citations: CitationDto[] = [];
    if (
      aiEngineResponse.sources_used &&
      aiEngineResponse.sources_used.length > 0
    ) {
      aiEngineResponse.sources_used.forEach((source: any, index: number) => {
        // Handle simple string (legacy)
        if (typeof source === 'string') {
          citations.push({
            id: `citation-${index}`,
            title: source,
            platform: 'AI Engine',
            content: '',
          });
          return;
        }

        // Handle FileRef structure from AIQ-164: { file_path: string, chunks: { chunk_id: string, ... }[] }
        if (source && source.file_path && Array.isArray(source.chunks)) {
          source.chunks.forEach((chunk: any, chunkIndex: number) => {
            citations.push({
              id: chunk.chunk_id || `citation-${index}-${chunkIndex}`,
              title: `${source.file_path} (Page ${chunk.page_number || '?'})`,
              platform: 'AI Engine',
              content: chunk.content || chunk.text || '',
            });
          });
          return;
        }

        // Handle generic object
        citations.push({
          id: source.id || `citation-${index}`,
          title:
            source.title ||
            source.name ||
            source.file_path ||
            `Source ${index + 1}`,
          platform: source.platform || source.source || 'AI Engine',
          content: source.content || source.description || '',
        });
      });
    }

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
