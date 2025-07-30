// src/upload/media.service.ts

import {
  Injectable,
  OnModuleInit,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

interface GoogleCredentials {
  client_email: string;
  private_key: string;
}

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private drive: drive_v3.Drive;
  private folderId: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeGoogleDrive();
    const folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');
    if (!folderId) {
      throw new InternalServerErrorException(
        'GOOGLE_DRIVE_FOLDER_ID is not set.',
      );
    }
    this.folderId = folderId;
  }

  private initializeGoogleDrive() {
    const credentialsString = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS',
    );
    if (!credentialsString) {
      throw new InternalServerErrorException(
        'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS is not set.',
      );
    }
    const credentials = JSON.parse(credentialsString) as GoogleCredentials;
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    this.drive = google.drive({ version: 'v3', auth });
    this.logger.log('Google Drive Service Initialized Successfully');
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{ googleFileId: string; thumbnailLink: string }> {
    try {
      const createFileResponse = await this.drive.files.create({
        requestBody: { name: originalName, parents: [this.folderId] },
        media: { mimeType: mimeType, body: Readable.from(fileBuffer) },
        fields: 'id',
      });
      const googleFileId = createFileResponse.data.id;
      if (typeof googleFileId !== 'string') {
        throw new Error('File upload failed, no ID returned from Google.');
      }
      this.logger.log(`File uploaded to Drive with ID: ${googleFileId}`);
      const getFileResponse = await this.drive.files.get({
        fileId: googleFileId,
        fields: 'thumbnailLink',
      });
      const thumbnailLink = getFileResponse.data.thumbnailLink;
      if (typeof thumbnailLink !== 'string') {
        this.logger.warn(
          `No thumbnailLink generated for file ID: ${googleFileId}`,
        );
        return { googleFileId, thumbnailLink: '' };
      }
      this.logger.log(`Retrieved thumbnail link for ${googleFileId}`);
      return { googleFileId, thumbnailLink };
    } catch (error) {
      this.logger.error('Error during Google Drive upload process', error);
      throw error;
    }
  }

  async getDownloadStream(googleFileId: string): Promise<Readable> {
    try {
      this.logger.log(
        `Requesting download stream for file ID: ${googleFileId}`,
      );
      const response = await this.drive.files.get(
        { fileId: googleFileId, alt: 'media' },
        { responseType: 'stream' },
      );
      // FIX: This runtime check proves to the linter that the data is a stream.
      // This is the definitive fix for the unsafe assignment error in the controller.
      if (response.data instanceof Readable) {
        return response.data;
      }
      throw new InternalServerErrorException(
        'Google Drive did not return a readable stream.',
      );
    } catch (error) {
      this.logger.error(
        `Failed to get download stream for file ID: ${googleFileId}`,
        error,
      );
      throw error;
    }
  }
}
