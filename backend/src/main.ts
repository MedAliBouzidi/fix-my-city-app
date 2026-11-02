import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security headers with cross-origin resource sharing support
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS configuration
  const corsOriginEnv =
    configService.get<string>('CORS_ORIGIN') ||
    configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOriginEnv
    ? corsOriginEnv.split(',').map((o) => o.trim())
    : '*';

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, mobile)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins === '*' ||
        (Array.isArray(allowedOrigins) && allowedOrigins.includes('*')) ||
        (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin))
      ) {
        return callback(null, true);
      }

      // Allow any localhost, loopback, or local docker container origin
      if (
        /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|fixmycity-[a-z0-9_-]+)(:\d+)?$/.test(
          origin,
        )
      ) {
        return callback(null, true);
      }

      // Permissive fallback so browser clients are never blocked
      return callback(null, true);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Range',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
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

  // Swagger documentation (disabled in production)
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FixMyCity API')
      .setDescription('Municipal incident-reporting platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger documentation available at /api/docs');
  }

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

bootstrap();
