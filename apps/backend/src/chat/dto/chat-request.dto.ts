import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// OpenAI-compatible message structure
export class MessageDto {
  @ApiProperty({
    enum: ['system', 'user', 'assistant', 'tool'],
    description: 'The role of the message author',
  })
  @IsEnum(['system', 'user', 'assistant', 'tool'])
  role!: 'system' | 'user' | 'assistant' | 'tool';

  @ApiProperty({ description: 'The content of the message' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({
    description: 'The name of the author of this message',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'The tool call ID for this message' })
  @IsOptional()
  @IsString()
  tool_call_id?: string;
}

// OpenAI-compatible chat completions request
export class ChatCompletionsRequestDto {
  @ApiProperty({
    type: [MessageDto],
    description: 'A list of messages comprising the conversation so far',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages!: MessageDto[];

  @ApiPropertyOptional({ description: 'ID of the model to use' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Sampling temperature to use' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'The top_p sampling parameter' })
  @IsOptional()
  @IsNumber()
  top_p?: number;

  @ApiPropertyOptional({
    description: 'The maximum number of tokens to generate',
  })
  @IsOptional()
  @IsNumber()
  max_tokens?: number;

  @IsOptional()
  @IsNumber()
  frequency_penalty?: number;

  @IsOptional()
  @IsNumber()
  presence_penalty?: number;

  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop?: string[];

  @IsOptional()
  @IsNumber()
  seed?: number;

  // Additional fields for our system
  @ApiPropertyOptional({ description: 'The session ID for tracking history' })
  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  request_source?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsNumber()
  top_k?: number;

  @ApiPropertyOptional({
    description: 'Citation attachments to include as context (FileRef format)',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileRefDto)
  attachments?: FileRefDto[];

  @ApiPropertyOptional({
    description: 'Search mode for the search-flow service',
    enum: ['auto', 'search', 'lookup', 'chat'],
    default: 'auto',
  })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({
    description: 'ID of the parent user message when branching (edit or regenerate). If provided the history path is resolved from this message upward.',
  })
  @IsOptional()
  @IsString()
  parent_message_id?: string;

  @ApiPropertyOptional({
    description: 'ID of an assistant message to regenerate. When set, a new sibling assistant response is created under the same parent user message.',
  })
  @IsOptional()
  @IsString()
  regenerate_from_id?: string;

  @ApiPropertyOptional({
    description: 'Search filter applied at the MCP/Qdrant layer (e.g. file-path exclusions)',
    type: () => SearchFilterDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFilterDto)
  filter?: SearchFilterDto;
}

export class SearchFilterDto {
  @ApiPropertyOptional({
    description: 'File paths to exclude from search results',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclude?: string[];
}

// Search-flow FileRef DTOs
export class ChunkMetadataDto {
  @IsNumber()
  chunk_number!: number;

  @IsNumber()
  page_number!: number;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  content?: string;
}

export class FileRefDto {
  @IsString()
  file_path!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChunkMetadataDto)
  chunks!: ChunkMetadataDto[];
}

// Legacy DTOs for backward compatibility with AI service
export class ChatBoxDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class ChatRequestDto {
  @ValidateNested()
  @Type(() => ChatBoxDto)
  chat_box!: ChatBoxDto;

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  top_k?: number;

  @IsOptional()
  @IsNumber()
  top_p?: number;

  @IsOptional()
  @IsNumber()
  max_tokens?: number;

  @IsOptional()
  @IsNumber()
  frequency_penalty?: number;

  @IsOptional()
  @IsNumber()
  presence_penalty?: number;

  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop_sequences?: string[];

  @IsOptional()
  @IsNumber()
  seed?: number;
}
