import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../constants/auth.constants';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email of the user',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password of the user',
  })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;
}

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email of the user',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password of the user',
  })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'The display name of the user',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class RefreshDto {
  @ApiProperty({
    example: 'refresh_token_here',
    description: 'The refresh token',
  })
  @IsString()
  refresh_token!: string;
}
