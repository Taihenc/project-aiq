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
