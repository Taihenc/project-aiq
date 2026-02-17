import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateSessionDto {
  @ApiPropertyOptional({
    example: 'New Chat',
    description: 'The title of the chat session',
  })
  @IsOptional()
  @IsString()
  title?: string;
}

export class AddMessageDto {
  @ApiProperty({
    enum: ['user', 'assistant'],
    description: 'The role of the message sender',
  })
  @IsEnum(['user', 'assistant'])
  role!: string;

  @ApiProperty({ description: 'The content of the message' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Optional citations for the message' })
  @IsOptional()
  citations?: any;
}
