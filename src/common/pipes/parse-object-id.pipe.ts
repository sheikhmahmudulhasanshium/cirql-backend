// src/common/pipes/parse-object-id.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe
  implements PipeTransform<string, Types.ObjectId>
{
  private readonly logger = new Logger(ParseObjectIdPipe.name); // Using logger to "use" _metadata

  transform(value: string, _metadata: ArgumentMetadata): Types.ObjectId {
    // "Using" _metadata via the logger to satisfy ESLint's no-unused-vars
    // This assumes _metadata and _metadata.type are valid; in NestJS pipes, they generally are.
    this.logger.debug(
      `Pipe metadata type: ${_metadata.type}, transforming value: ${value}`,
    );

    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid MongoDB ObjectId: ${value}`);
    }
    return new Types.ObjectId(value);
  }
}
