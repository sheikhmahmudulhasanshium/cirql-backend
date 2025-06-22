// src/email/email.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface ContactFormData {
  name: string;
  fromEmail: string;
  message: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // --- NEW: Initialize the transporter with your credentials ---
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Cirql" <${this.configService.get<string>('GMAIL_USER')}>`,
      to: email,
      subject: 'Reset Your Cirql Password',
      html: `<p>Please click the following link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
    }
  }

  // --- UPDATED: This now sends a REAL email ---
  async sendContactFormEmail(formData: ContactFormData): Promise<void> {
    const receivingEmail = this.configService.get<string>('GMAIL_USER');

    const mailOptions = {
      from: `"Cirql Contact Form" <${receivingEmail}>`, // Send from your own address
      to: receivingEmail, // Send to your own address
      replyTo: formData.fromEmail, // So when you click "Reply", it goes to the user
      subject: `New Contact Form Submission from ${formData.name}`,
      html: `
        <h3>New Message from Cirql Contact Form</h3>
        <p><b>From:</b> ${formData.name}</p>
        <p><b>Email:</b> ${formData.fromEmail}</p>
        <hr>
        <p><b>Message:</b></p>
        <p>${formData.message.replace(/\n/g, '<br>')}</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Contact form submission from ${formData.fromEmail} sent successfully.`,
      );
    } catch (error) {
      this.logger.error('Failed to send contact form email', error);
      // Re-throw the error so the controller can handle it if needed
      throw error;
    }
  }
}
