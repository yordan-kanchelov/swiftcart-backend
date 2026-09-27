import {
  CorrelationIdMiddleware,
  RequestLoggingMiddleware,
  envValidationSchema,
} from '@app/common';
import { HttpModule } from 'nestjs-axios-undici';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth/auth.controller';
import { AuthProxyService } from './auth/auth-proxy.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryProxyService } from './inventory/inventory-proxy.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersProxyService } from './orders/orders-proxy.service';
import { ProductsController } from './products/products.controller';
import { ProductsProxyService } from './products/products-proxy.service';
import { HealthModule } from './health/health.module';

// Root module for the API Gateway.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    HttpModule,
    PassportModule,
    HealthModule,
  ],
  controllers: [
    AuthController,
    ProductsController,
    OrdersController,
    InventoryController,
  ],
  providers: [
    AuthProxyService,
    ProductsProxyService,
    OrdersProxyService,
    InventoryProxyService,
    JwtStrategy,
  ],
})
export class AppModule implements NestModule {
  // Middleware runs before controllers.
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, RequestLoggingMiddleware)
      .forRoutes('*');
  }
}
