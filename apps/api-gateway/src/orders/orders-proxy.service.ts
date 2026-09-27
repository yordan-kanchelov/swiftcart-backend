import { forwardHttpRequest, CreateOrderDto } from '@app/common';
import { HttpService } from 'nestjs-axios-undici';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// This service forwards order requests from API Gateway to Order Service.
@Injectable()
export class OrdersProxyService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // Forward order creation and include the authenticated user ID as an internal header.
  create(
    userId: string,
    correlationId: string,
    createOrderDto: CreateOrderDto,
  ) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'ORDER_SERVICE_URL',
      unavailableMessage: 'Order Service is unavailable',
      method: 'post',
      path: '/orders',
      correlationId,
      body: createOrderDto,
      headers: {
        'x-user-id': userId,
      },
    });
  }

  // Forward list orders request.
  findAll(userId: string, correlationId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'ORDER_SERVICE_URL',
      unavailableMessage: 'Order Service is unavailable',
      method: 'get',
      path: '/orders',
      correlationId,
      headers: {
        'x-user-id': userId,
      },
    });
  }

  // Forward get one order request.
  findOne(userId: string, correlationId: string, orderId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'ORDER_SERVICE_URL',
      unavailableMessage: 'Order Service is unavailable',
      method: 'get',
      path: `/orders/${orderId}`,
      correlationId,
      headers: {
        'x-user-id': userId,
      },
    });
  }
}
