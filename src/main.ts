import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { globalValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { Reflector } from '@nestjs/core';
import { StructuredLoggerService } from './logging/structured-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(StructuredLoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const corsOrigins = configService.get<string[]>('app.corsOrigins', [
    'http://localhost:5173',
  ]);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global prefixes, pipes, filters, interceptors
  app.setGlobalPrefix('api');
  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new TransformResponseInterceptor<unknown>(app.get(Reflector)),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Background Job Scheduler API')
    .setDescription('The Background Job Scheduler API documentation')
    .setVersion('1.0')
    .addTag('Jobs')
    .addTag('Dead Letter Queue')
    .addTag('Workers')
    .addTag('Metrics')
    .addTag('Benchmark')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port, '0.0.0.0');
  logger.log(`Application listening on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}
void bootstrap();
