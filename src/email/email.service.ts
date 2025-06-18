// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // In a real application, you would use the frontend's URL from configService.
    // For now, localhost is fine for development.
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    // This mock service logs the email to the console, simulating a real email provider.
    this.logger.log('--- MOCK EMAIL SENDER ---');
    this.logger.log(`To: ${email}`);
    this.logger.log('Subject: Reset Your Cirql Password');
    this.logger.log(
      `Body: Click this link to reset your password: ${resetLink}`,
    );
    this.logger.log('--- END MOCK EMAIL SENDER ---');

    return Promise.resolve();
  }
}
