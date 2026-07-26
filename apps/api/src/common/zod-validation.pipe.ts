import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  public constructor(
    private readonly schema: ZodSchema<T>,
    private readonly errorCode = 'INVALID_ROUTE_REQUEST',
  ) {}

  public transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: this.errorCode,
        message: 'Validation failed',
        fields: getInvalidFields(result.error.issues),
      });
    }

    return result.data;
  }
}

function getInvalidFields(
  issues: readonly { path: readonly PropertyKey[] }[],
): string[] {
  const fields = issues.map((issue) =>
    issue.path.length > 0 ? issue.path.map(String).join('.') : 'body',
  );

  return [...new Set(fields)];
}
