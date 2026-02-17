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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageDto } from './chat-request.dto';

// Citation structure
export class CitationDto {
  @ApiProperty({ description: 'Unique identifier for the citation' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Title of the cited source' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'The platform where the content was found' })
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
  @ApiProperty({ description: 'Unique identifier for the chat completion' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'chat.completion', description: 'The object type' })
  @IsString()
  object!: string;

  @ApiProperty({ description: 'The creation timestamp' })
  @IsNumber()
  created!: number;

  @ApiProperty({ description: 'The model used for the completion' })
  @IsString()
  model!: string;

  @ApiProperty({
    type: [ChoiceDto],
    description: 'A list of chat completion choices',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices!: ChoiceDto[];

  @ValidateNested()
  @Type(() => UsageDto)
  usage!: UsageDto;

  // Additional fields for our system
  @ApiPropertyOptional({
    description: 'The session ID associated with this completion',
  })
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
