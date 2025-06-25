// src/common/pipes/parse-object-id.pipe.ts

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
// Import isValidObjectId and Types from mongoose
import { isValidObjectId, Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe
  implements PipeTransform<string, Types.ObjectId>
{
  transform(value: string, metadata: ArgumentMetadata): Types.ObjectId {
    // Use the standalone isValidObjectId function for validation
    if (!isValidObjectId(value)) {
      throw new BadRequestException(
        `Invalid MongoDB ObjectId: "${value}" for parameter "${metadata.data}"`,
      );
    }
    // This will now work correctly
    return new Types.ObjectId(value);
  }
}
