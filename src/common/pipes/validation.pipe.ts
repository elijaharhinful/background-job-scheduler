import { ValidationPipe, UnprocessableEntityException } from '@nestjs/common';

export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  exceptionFactory: (errors) => {
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    return new UnprocessableEntityException({
      message: messages.join('; '),
      error: 'Validation Error',
    });
  },
});
