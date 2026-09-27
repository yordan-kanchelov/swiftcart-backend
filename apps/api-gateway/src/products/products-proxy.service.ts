import {
  forwardHttpRequest,
  CreateProductDto,
  UpdateProductDto,
} from '@app/common';
import { HttpService } from 'nestjs-axios-undici';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// This service forwards product requests from the API Gateway to Product Service.
@Injectable()
export class ProductsProxyService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // Forward product creation.
  create(createProductDto: CreateProductDto, correlationId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'PRODUCT_SERVICE_URL',
      unavailableMessage: 'Product Service is unavailable',
      method: 'post',
      path: '/products',
      correlationId,
      body: createProductDto,
    });
  }

  // Forward product list request.
  findAll(correlationId: string) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'PRODUCT_SERVICE_URL',
      unavailableMessage: 'Product Service is unavailable',
      method: 'get',
      path: '/products',
      correlationId,
    });
  }

  // Forward product detail request.
  findOne(id: string, correlationId: string) {
    // return this.forwardRequest('get', `/products/${id}`, correlationId);

    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'PRODUCT_SERVICE_URL',
      unavailableMessage: 'Product Service is unavailable',
      method: 'get',
      path: `/products/${id}`,
      correlationId,
    });
  }

  // Forward product update request.
  update(
    id: string,
    updateProductDto: UpdateProductDto,
    correlationId: string,
  ) {
    return forwardHttpRequest({
      httpService: this.httpService,
      configService: this.configService,
      serviceUrlConfigKey: 'PRODUCT_SERVICE_URL',
      unavailableMessage: 'Product Service is unavailable',
      method: 'patch',
      path: `/products/${id}`,
      correlationId,
      body: updateProductDto,
    });
  }
}
