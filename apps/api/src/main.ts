/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { EnvironmentVariables } from './config/env.validation';
import { writeFileSync } from 'fs';
import { join } from 'path';

const isProd = process.env.NODE_ENV === 'production';

const origins = isProd ? true : 'http://localhost:3000';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug'],
  });

  app.use(helmet());
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('v1', { exclude: ['/'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableShutdownHooks();

  const config = app.get(ConfigService<EnvironmentVariables, true>);
  const nodeEnv = config.get('NODE_ENV', { infer: true });

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Payments API')
      .setDescription('REST API for payment processor')
      .setVersion('0.1.0')
      .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' }, 'api-key')
      .addApiKey(
        { type: 'apiKey', name: 'X-Admin-Api-Key', in: 'header' },
        'admin-key',
      )
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    writeFileSync(
      join(process.cwd(), 'docs', 'swagger.json'),
      JSON.stringify(document, null, 2),
    );
  }

  const uri = config.get('MONERO_DAEMON_URI');
  console.log(uri);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  console.log(`Listening on port: ${port}`, 'Bootstrap');
  if (nodeEnv !== 'production') {
    console.log(`Swagger UI: http://localhost:${port}/docs`, 'Bootstrap');
  }
}

void bootstrap();
