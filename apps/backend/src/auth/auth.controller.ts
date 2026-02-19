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
import { LoginDto, RegisterDto, RefreshDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) { }

  @Public()
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

  @Public()
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

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a refresh token.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refresh_token);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidates the user session by clearing the refresh token.',
  })
  @ApiResponse({ status: 200, description: 'Successfully logged out.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }

  // Future endpoint for Microsoft SSO
  // @Get('microsoft') ...
}
