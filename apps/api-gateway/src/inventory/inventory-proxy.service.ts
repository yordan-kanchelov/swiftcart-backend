import {
  forwardHttpRequest,
  AddStockDto,
  CreateInventoryItemDto,
} from '@app/common';
import { HttpService } from 'nestjs-axios-undici';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// This service forwards inventory requests from API Gateway to Inventory Service.
@Injectable()
export class InventoryProxyService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  create(createDto: CreateInventoryItemDto, correlationId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'INVENTORY_SERVICE_URL',
      unavailableMessage: 'Inventory Service is unavailable',
      method: 'post',
      path: '/inventory/items',
      correlationId,
      body: createDto,
    });
  }

  findAll(correlationId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'INVENTORY_SERVICE_URL',
      unavailableMessage: 'Inventory Service is unavailable',
      method: 'get',
      path: '/inventory/items',
      correlationId,
    });
  }

  findByProductId(productId: string, correlationId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'INVENTORY_SERVICE_URL',
      unavailableMessage: 'Inventory Service is unavailable',
      method: 'get',
      path: `/inventory/items/${productId}`,
      correlationId,
    });
  }

  addStock(productId: string, addStockDto: AddStockDto, correlationId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'INVENTORY_SERVICE_URL',
      unavailableMessage: 'Inventory Service is unavailable',
      method: 'patch',
      path: `/inventory/items/${productId}/add-stock`,
      correlationId,
      body: addStockDto,
    });
  }
}
