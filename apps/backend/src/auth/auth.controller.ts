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

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req) {
    this.logger.debug(`Login endpoint hit for user: ${req.user?.email}`);
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() body: any) {
    this.logger.debug(`Register endpoint hit for email: ${body.email}`);
    return this.authService.register(
      body.email,
      body.password,
      body.displayName,
    );
  }

  // Future endpoint for Microsoft SSO
  // @Get('microsoft') ...
}
