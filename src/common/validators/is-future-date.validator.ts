import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: Date) {
    if (!propertyValue) return true; // Let @IsOptional or @IsNotEmpty handle this
    // allow a 60 second buffer for network latency/clock drift
    return propertyValue.getTime() >= Date.now() - 60000;
  }

  defaultMessage() {
    return 'scheduled_at must be a future date';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}
