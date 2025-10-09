import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

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
