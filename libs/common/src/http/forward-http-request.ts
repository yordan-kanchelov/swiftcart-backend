import { HttpService } from 'nestjs-axios-undici';
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CORRELATION_ID_HEADER } from './correlation-id.middleware';

type ForwardHttpRequestOptions = {
  httpService: HttpService;
  configService: ConfigService;
  serviceUrlConfigKey: string;
  unavailableMessage: string;
  method: Method;
  path: string;
  correlationId: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function forwardHttpRequest(options: ForwardHttpRequestOptions) {
  const serviceUrl = options.configService.get<string>(
    options.serviceUrlConfigKey,
  );

  try {
    const response = await firstValueFrom(
      options.httpService.request({
        method: options.method,
        url: `${serviceUrl}${options.path}`,
        data: options.body,
        headers: {
          [CORRELATION_ID_HEADER]: options.correlationId,
          ...options.headers,
        },
      }),
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<any>;

    if (axiosError.response) {
      throw new HttpException(
        axiosError.response.data,
        axiosError.response.status,
      );
    }

    throw new HttpException(options.unavailableMessage, 503);
  }
}
