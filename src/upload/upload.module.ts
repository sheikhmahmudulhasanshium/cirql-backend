// src/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// import { UploadController } from './upload.controller'; // --- REMOVED THIS LINE ---
import { AttachmentService } from './attachment.service';
import { Media, MediaSchema } from './schemas/media.schema';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
  ],
  // --- FIX: Remove UploadController from the controllers array ---
  controllers: [MediaController],
  providers: [AttachmentService, MediaService],
  exports: [AttachmentService, MediaService],
})
export class UploadModule {}
