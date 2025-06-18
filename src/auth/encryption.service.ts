// src/auth/encryption.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>(
      'TWO_FACTOR_ENCRYPTION_KEY',
    );
    if (!secretKey || secretKey.length !== 32) {
      throw new InternalServerErrorException(
        'TWO_FACTOR_ENCRYPTION_KEY must be a 32-character string in the .env file.',
      );
    }
    this.key = Buffer.from(secretKey, 'utf-8');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(hash: string): string {
    try {
      const [ivHex, authTagHex, encryptedHex] = hash.split(':');
      if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted data format.');
      }
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch {
      // FIX: Removed the unused 'error' variable from the catch block.
      throw new InternalServerErrorException(
        'Failed to decrypt 2FA secret. It may have been tampered with or the key may have changed.',
      );
    }
  }
}
