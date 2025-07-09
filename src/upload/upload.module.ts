// src/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadController } from './upload.controller';
import { AttachmentService } from './attachment.service';
import { Media, MediaSchema } from './schemas/media.schema';
import { MediaController } from './media.controller'; // <-- Import the new controller
import { MediaService } from './media.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
  ],
  // Add MediaController to the controllers array
  controllers: [UploadController, MediaController],
  providers: [AttachmentService, MediaService],
  exports: [AttachmentService, MediaService],
})
export class UploadModule {}
