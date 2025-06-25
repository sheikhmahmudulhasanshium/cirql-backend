// src/common/pipes/parse-object-id.pipe.ts

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
// Import the entire mongoose library as a namespace to ensure robust type resolution.
import * as mongoose from 'mongoose';

@Injectable()
export class ParseObjectIdPipe
  implements PipeTransform<string, mongoose.Types.ObjectId>
{
  transform(
    value: string,
    metadata: ArgumentMetadata,
  ): mongoose.Types.ObjectId {
    // Use the mongoose.isValidObjectId function for validation.
    if (!mongoose.isValidObjectId(value)) {
      throw new BadRequestException(
        `Invalid MongoDB ObjectId: "${value}" for parameter "${metadata.data}"`,
      );
    }
    // Now, explicitly call the constructor through the mongoose namespace.
    // This will resolve the TS2554 error in strict build environments.
    return new mongoose.Types.ObjectId(value);
  }
}
