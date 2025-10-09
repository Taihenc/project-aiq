import {
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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
