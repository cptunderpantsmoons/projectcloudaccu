import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.enableShutdownHooks();
  app.useLogger(logger);

  const jwtSecret = configService.get<string>('jwt.secret');
  if (!jwtSecret) {
    logger.error('JWT_SECRET is not set. Refusing to start without a signing key.');
    process.exit(1);
  }

  // Security middleware
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS configuration
  const corsOrigin = configService.get('cors.origin');
  const corsOrigins = Array.isArray(corsOrigin)
    ? corsOrigin
    : (corsOrigin as string | undefined)?.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (configService.get('environment') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ACCU Platform API')
      .setDescription('Australian Carbon Credit Units Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('projects', 'Project management endpoints')
      .addTag('documents', 'Document management endpoints')
      .addTag('calendar', 'Calendar and events endpoints')
      .addTag('accu', 'ACCU application and inventory endpoints')
      .addTag('audits', 'Audit management endpoints')
      .addTag('communications', 'Communication management endpoints')
      .addTag('notifications', 'Notification system endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get<number>('port', 4000) || configService.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 ACCU Platform API is running on: http://0.0.0.0:${port}`);
  if (configService.get('environment') !== 'production') {
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`❌ Error starting server: ${error.message}`, error.stack);
  process.exit(1);
});
