// src/common/pipes/parse-object-id.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose'; // <-- THE CORRECT FIX: Import from Mongoose

@Injectable()
export class ParseObjectIdPipe
  implements PipeTransform<string, Types.ObjectId>
{
  transform(value: string, metadata: ArgumentMetadata): Types.ObjectId {
    // Use the static method from Mongoose's ObjectId
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        `Invalid MongoDB ObjectId: "${value}" for parameter "${metadata.data}"`,
      );
    }
    // Return a new instance of Mongoose's ObjectId
    return new Types.ObjectId(value);
  }
}
