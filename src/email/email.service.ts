// src/email/email.service.ts

import { Injectable, Logger } from '@nestjs/common';

interface ContactFormData {
  name: string;
  fromEmail: string;
  message: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    this.logger.log('--- MOCK EMAIL SENDER ---');
    this.logger.log(`To: ${email}`);
    this.logger.log('Subject: Reset Your Cirql Password');
    this.logger.log(
      `Body: Click this link to reset your password: ${resetLink}`,
    );
    this.logger.log('--- END MOCK EMAIL SENDER ---');
    return Promise.resolve();
  }

  async sendContactFormEmail(formData: ContactFormData): Promise<void> {
    const receivingEmail = 'contact.cirql@gmail.com'; // Your receiving address

    this.logger.log('--- MOCK CONTACT FORM EMAIL SENDER ---');
    this.logger.log(`To: ${receivingEmail}`);
    this.logger.log(`From: "${formData.name}" <${formData.fromEmail}>`);
    this.logger.log(
      `Subject: New Contact Form Submission from ${formData.name}`,
    );
    this.logger.log('Body:');
    this.logger.log(formData.message);
    this.logger.log('--- END MOCK CONTACT FORM EMAIL SENDER ---');

    return Promise.resolve();
  }
}
