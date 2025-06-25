// src/email/email.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface ContactFormData {
  name: string;
  fromEmail: string;
  message: string;
}
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

  public getAdminEmail(): string {
    return this.configService.get<string>('GMAIL_USER')!;
  }

  private getEmailSignature(): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    return `
      <p style="margin-top: 25px; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 14px; color: #222222; font-weight: bold;">
        The CiRQL Team 👥
      </p>
      <p style="margin-top: 0; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 13px; color: #555555;">
        🔄 Stay in the loop
      </p>
      <p style="margin-top: 0; margin-bottom: 15px; font-family: Arial, sans-serif; font-size: 13px; color: #555555;">
        🌐 <a href="${frontendUrl}" style="color: #3F8CFF; text-decoration: none;">${frontendUrl}</a>
      </p>
      <p style="font-size: 11px; color: #999999; margin-top: 20px;">
        This is an automated message. For support, please use the contact form on our website.
      </p>
    `;
  }

  async sendTwoFactorLoginCodeEmail(
    email: string,
    code: string,
  ): Promise<void> {
    const mailOptions = {
      from: `"Cirql" <${this.getAdminEmail()}>`,
      to: email,
      subject: 'Your Cirql Login Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1A1A2E;">Your Two-Factor Login Code</h2>
          <p>Please use the following code to complete your login. This code is valid for 10 minutes.</p>
          <p style="font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
            ${code}
          </p>
          <p>If you did not request this code, you can safely ignore this email.</p>
          <br>
          <hr style="border: none; border-top: 1px solid #eeeeee;">
          ${this.getEmailSignature()}
        </div>
      `,
    };
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`2FA login code email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send 2FA login code to ${email}`, error);
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const mailOptions = {
      from: `"Cirql" <${this.getAdminEmail()}>`,
      to: email,
      subject: 'Welcome to Cirql! 🎉',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1A1A2E;">Welcome, ${name}!</h2>
          <p>We're thrilled to have you join the Cirql community. We are a platform designed to help you stay in the loop with the people and topics that matter most to you.</p>
          <p>You can start by exploring your profile, connecting with friends, or checking out the latest announcements.</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${frontendUrl}" style="background-color: #3F8CFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Your Dashboard</a>
          </p>
          <br>
          <hr style="border: none; border-top: 1px solid #eeeeee;">
          ${this.getEmailSignature()}
        </div>
      `,
    };
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;
    const mailOptions = {
      from: `"Cirql" <${this.getAdminEmail()}>`,
      to: email,
      subject: 'Reset Your Cirql Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <p>Please click the following link to reset your password:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <br>
          <hr style="border: none; border-top: 1px solid #eeeeee;">
          ${this.getEmailSignature()}
        </div>
      `,
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

  async sendContactFormEmail(formData: ContactFormData): Promise<void> {
    const mailOptions = {
      from: `"Cirql Support" <${this.getAdminEmail()}>`,
      to: this.getAdminEmail(),
      replyTo: formData.fromEmail,
      subject: `New Ticket from ${formData.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h3>New Support Ticket Created</h3>
          <p><b>From:</b> ${formData.name}</p>
          <p><b>Email:</b> ${formData.fromEmail}</p>
          <hr>
          <p><b>Message:</b></p>
          <p>${formData.message.replace(/\n/g, '<br>')}</p>
          <br>
          <hr style="border: none; border-top: 1px solid #eeeeee;">
          ${this.getEmailSignature()}
        </div>
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

  async sendTicketReplyEmail(data: TicketReplyData): Promise<void> {
    const ticketUrl = `${this.configService.get<string>('FRONTEND_URL')}/contacts/${data.ticketId}`;
    const mailOptions = {
      from: `"Cirql Support" <${this.getAdminEmail()}>`,
      to: data.to,
      subject: data.ticketSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <p>A new reply has been added to your support ticket by <strong>${data.replierName}</strong>.</p>
          <hr>
          <p><strong>Reply:</strong></p>
          <blockquote>${data.replyContent.replace(/\n/g, '<br>')}</blockquote>
          <hr>
          <p>You can view the full conversation and reply by clicking the button below:</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${ticketUrl}" style="background-color: #3F8CFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a>
          </p>
          <br>
          <hr style="border: none; border-top: 1px solid #eeeeee;">
          ${this.getEmailSignature()}
        </div>
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
    }
  }

  async sendAccountStatusEmail(
    email: string,
    subject: string,
    headline: string,
    details: string,
  ): Promise<void> {
    const mailOptions = {
      from: `"Cirql Support" <${this.getAdminEmail()}>`,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1A1A2E;">${headline}</h2>
          <p>This is a notification regarding the status of your Cirql account.</p>
          <hr style="border: none; border-top: 1px solid #eee;">
          <p><strong>Details:</strong></p>
          <blockquote style="border-left: 4px solid #ccc; padding-left: 15px; margin: 0; font-style: italic;">
            ${details.replace(/\n/g, '<br>')}
          </blockquote>
          <br>
          <hr style="border: none; border-top: 1px solid #eeeeee;">
          ${this.getEmailSignature()}
        </div>
      `,
    };
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Account status email sent to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send account status email to ${email}`,
        error,
      );
    }
  }
}
