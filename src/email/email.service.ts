// src/email/email.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Interface for initial contact form submission
interface ContactFormData {
  name: string;
  fromEmail: string;
  message: string;
}

// --- NEW --- Interface for ticket replies
interface TicketReplyData {
  to: string;
  ticketId: string;
  ticketSubject: string;
  replyContent: string;
  replierName: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
  }

  // --- NEW --- Helper method to get the admin email address
  public getAdminEmail(): string {
    return this.configService.get<string>('GMAIL_USER')!;
  }

  // This method for password resets remains unchanged.
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;
    const mailOptions = {
      from: `"Cirql" <${this.getAdminEmail()}>`,
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

  // This method for the initial contact form remains unchanged.
  async sendContactFormEmail(formData: ContactFormData): Promise<void> {
    const mailOptions = {
      from: `"Cirql Support" <${this.getAdminEmail()}>`,
      to: this.getAdminEmail(),
      replyTo: formData.fromEmail,
      subject: `New Ticket from ${formData.name}`,
      html: `
        <h3>New Support Ticket Created</h3>
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
        `Contact form submission email sent successfully for ${formData.fromEmail}.`,
      );
    } catch (error) {
      this.logger.error('Failed to send contact form email.', error);
      throw error;
    }
  }

  // --- NEW METHOD --- For sending notifications about replies to existing tickets.
  async sendTicketReplyEmail(data: TicketReplyData): Promise<void> {
    const ticketUrl = `${this.configService.get<string>('FRONTEND_URL')}/contacts/${data.ticketId}`;

    const mailOptions = {
      from: `"Cirql Support" <${this.getAdminEmail()}>`,
      to: data.to,
      subject: data.ticketSubject,
      html: `
        <p>A new reply has been added to your support ticket by <strong>${data.replierName}</strong>.</p>
        <hr>
        <p><strong>Reply:</strong></p>
        <blockquote>${data.replyContent.replace(/\n/g, '<br>')}</blockquote>
        <hr>
        <p>You can view the full conversation and reply by clicking the button below:</p>
        <a href="${ticketUrl}" style="background-color: #3F8CFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a>
      `,
    };
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Ticket reply email sent successfully to ${data.to}.`);
    } catch (error) {
      this.logger.error(
        `Failed to send ticket reply email to ${data.to}.`,
        error,
      );
      // We don't re-throw here so a failed notification doesn't break the app flow.
    }
  }
}
