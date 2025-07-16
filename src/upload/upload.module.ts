import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttachmentService } from './attachment.service';
import { Media, MediaSchema } from './schemas/media.schema';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { UploadController } from './upload.controller'; // --- ADD THIS ---

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
  ],
  // --- ADD UploadController HERE ---
  controllers: [MediaController, UploadController],
  providers: [AttachmentService, MediaService],
  exports: [AttachmentService, MediaService],
})
export class UploadModule {}
