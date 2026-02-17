import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  Get,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticates a user and returns a JWT token.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Request() req, @Body() loginDto: LoginDto) {
    this.logger.debug(`Login endpoint hit for user: ${loginDto.email}`);
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register user',
    description: 'Creates a new user account.',
  })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async register(@Body() registerDto: RegisterDto) {
    this.logger.debug(`Register endpoint hit for email: ${registerDto.email}`);
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.displayName,
    );
  }

  // Future endpoint for Microsoft SSO
  // @Get('microsoft') ...
}
