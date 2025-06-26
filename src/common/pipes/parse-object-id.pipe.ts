import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  /**
   * Validates that a string is a valid MongoDB ObjectId.
   * If valid, it returns the original string.
   * If invalid, it throws a BadRequestException.
   */
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException(
        `Invalid ID format: "${value}" for parameter "${metadata.data}" is not a valid MongoDB ObjectId.`,
      );
    }
    // Return the original, validated string. Mongoose will handle the conversion.
    return value;
  }
}
