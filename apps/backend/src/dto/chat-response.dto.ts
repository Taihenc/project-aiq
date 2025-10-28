import {
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateNested,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageDto } from './chat-request.dto';

// Citation structure
export class CitationDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  platform!: string;

  @IsOptional()
  @IsString()
  content?: string;
}

// OpenAI-compatible choice structure
export class ChoiceDto {
  @IsNumber()
  index!: number;

  @ValidateNested()
  @Type(() => MessageDto)
  message!: MessageDto;

  @IsOptional()
  @IsString()
  finish_reason?: string;
}

// OpenAI-compatible usage structure
export class UsageDto {
  @IsNumber()
  prompt_tokens!: number;

  @IsNumber()
  completion_tokens!: number;

  @IsNumber()
  total_tokens!: number;
}

// OpenAI-compatible chat completions response
export class ChatCompletionsResponseDto {
  @IsString()
  id!: string;

  @IsString()
  object!: string;

  @IsNumber()
  created!: number;

  @IsString()
  model!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices!: ChoiceDto[];

  @ValidateNested()
  @Type(() => UsageDto)
  usage!: UsageDto;

  // Additional fields for our system
  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  request_source?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CitationDto)
  citations?: CitationDto[];

  @IsOptional()
  @IsNumber()
  processing_time_ms?: number;
}

// Legacy DTOs for backward compatibility with AI service
export class ChatBoxResponseDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class ChatResponseDto {
  @ValidateNested()
  @Type(() => ChatBoxResponseDto)
  chat_box!: ChatBoxResponseDto;

  @IsString()
  model_used!: string;

  @IsString()
  timestamp!: string;

  @IsNumber()
  processing_time_ms!: number;

  @IsNumber()
  prompt_tokens!: number;

  @IsNumber()
  completion_tokens!: number;

  @IsNumber()
  total_tokens!: number;

  @IsString()
  session_id!: string;

  @IsString()
  chat_id!: string;
}
