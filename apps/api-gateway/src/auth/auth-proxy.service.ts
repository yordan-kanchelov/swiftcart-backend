import { forwardHttpRequest, LoginDto, RegisterDto } from '@app/common';
import { HttpService } from 'nestjs-axios-undici';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// This service forwards auth-related requests from the API Gateway to the Auth Service.
@Injectable()
export class AuthProxyService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // Forward registration to the Auth Service.
  async register(registerDto: RegisterDto, correlationId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'AUTH_SERVICE_URL',
      unavailableMessage: 'Auth Service is unavailable',
      method: 'post',
      path: '/auth/register',
      correlationId,
      body: registerDto,
    });
  }

  // Forward login to the Auth Service.
  async login(loginDto: LoginDto, correlationId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'AUTH_SERVICE_URL',
      unavailableMessage: 'Auth Service is unavailable',
      method: 'post',
      path: '/auth/login',
      correlationId,
      body: loginDto,
    });
  }
}
