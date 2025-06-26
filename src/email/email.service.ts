import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Address } from 'nodemailer/lib/mailer';

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
  private readonly adminEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailAppPassword =
      this.configService.get<string>('GMAIL_APP_PASSWORD');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';

    if (!gmailUser || !gmailAppPassword) {
      this.logger.error(
        'Gmail credentials are not configured in environment variables.',
      );
      throw new InternalServerErrorException(
        'Email service is not configured.',
      );
    }
    if (!this.frontendUrl) {
      this.logger.error('FRONTEND_URL is not configured.');
    }

    this.adminEmail = gmailUser;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
  }

  public getAdminEmail(): string {
    return this.adminEmail;
  }

  public getFrontendUrl(): string {
    return this.frontendUrl;
  }

  private getEmailSignature(): string {
    return `
      <p style="margin-top: 25px; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 14px; color: #222222; font-weight: bold;">
        The CiRQL Team 👥
      </p>
      <p style="margin-top: 0; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 13px; color: #555555;">
        🔄 Stay in the loop
      </p>
      <p style="margin-top: 0; margin-bottom: 15px; font-family: Arial, sans-serif; font-size: 13px; color: #555555;">
        🌐 <a href="${this.frontendUrl}" style="color: #3F8CFF; text-decoration: none;">${this.frontendUrl}</a>
      </p>
      <p style="font-size: 11px; color: #999999; margin-top: 20px;">
        To manage your email preferences, please visit your <a href="${this.frontendUrl}/profile/settings" style="color: #3F8CFF;">notification settings</a>. For support, please use the contact form on our website.
      </p>
    `;
  }

  private safeAddressToString(
    address: string | Address | (string | Address)[] | undefined,
  ): string {
    if (!address) {
      return 'undefined';
    }
    if (typeof address === 'string') {
      return address;
    }
    if (Array.isArray(address)) {
      return address.map((a) => this.safeAddressToString(a)).join(', ');
    }
    return address.address;
  }

  private async sendMail(
    mailOptions: nodemailer.SendMailOptions,
  ): Promise<void> {
    const toAddress = this.safeAddressToString(mailOptions.to);
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to: ${toAddress}`);
    } catch (error) {
      const stack =
        error instanceof Error ? error.stack : 'No stack trace available';
      this.logger.error(`Failed to send email to ${toAddress}`, stack);
    }
  }

  async sendTwoFactorLoginCodeEmail(
    email: string,
    code: string,
  ): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Cirql Security" <${this.adminEmail}>`,
      to: email,
      subject: 'Your Cirql Login Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1A1A2E;">Your Two-Factor Login Code</h2>
          <p>Please use the following code to complete your login. This code is valid for 2 minutes.</p>
          <p style="font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
            ${code}
          </p>
          <p>If you did not request this code, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin-top: 20px;">
          <p style="font-size: 11px; color: #999999; margin-top: 20px;">
            This is a critical security email and cannot be unsubscribed from.
          </p>
        </div>
      `,
    };
    await this.sendMail(mailOptions);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"The CiRQL Team" <${this.adminEmail}>`,
      to: email,
      subject: 'Welcome to CiRQL! 🎉',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <p align="center" style="text-align: center;">
            <a href="https://cirql.vercel.app/" target="_blank">
              <img src="https://raw.githubusercontent.com/sheikhmahmudulhasanshium/cirql-backend/main/public/logo-full.svg" width="200" alt="Cirql Logo" />
            </a>
          </p>
          <h2 style="color: #1A1A2E; text-align: center;">Welcome, ${name}!</h2>
          <p>We're thrilled to have you join the Cirql community. We are a platform designed to help you stay in the loop with the people and topics that matter most to you.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}" style="background-color: #3F8CFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Your Dashboard</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin-top: 20px;">
          ${this.getEmailSignature()}
        </div>
      `,
    };
    await this.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${token}`;
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Cirql Security" <${this.adminEmail}>`,
      to: email,
      subject: 'Reset Your Cirql Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1A1A2E;">Password Reset Request</h2>
          <p>We received a request to reset your password. If this was you, please use the button below to set a new password. This link is valid for one hour.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #3F8CFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </p>
          <p>If you did not request a password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin-top: 20px;">
           <p style="font-size: 11px; color: #999999; margin-top: 20px;">
            This is a critical security email and cannot be unsubscribed from.
          </p>
        </div>
      `,
    };
    await this.sendMail(mailOptions);
  }

  async sendContactFormEmail(formData: ContactFormData): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Cirql Support" <${this.adminEmail}>`,
      to: this.adminEmail,
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
        </div>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async sendTicketReplyEmail(data: TicketReplyData): Promise<void> {
    const ticketUrl = `${this.frontendUrl}/contacts/${data.ticketId}`;
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Cirql Support" <${this.adminEmail}>`,
      to: data.to,
      subject: data.ticketSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1A1A2E;">Reply to your support ticket</h2>
          <p>A new reply has been added to your support ticket by <strong>${data.replierName}</strong>.</p>
          <hr style="border:none; border-top:1px solid #eee">
          <p><strong>Reply:</strong></p>
          <blockquote style="border-left: 4px solid #ccc; padding-left: 15px; margin: 0; font-style: italic;">
            ${data.replyContent.replace(/\n/g, '<br>')}
          </blockquote>
          <hr style="border:none; border-top:1px solid #eee">
          <p>You can view the full conversation and reply by clicking the button below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${ticketUrl}" style="background-color: #3F8CFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a>
          </p>
          ${this.getEmailSignature()}
        </div>
      `,
    };
    await this.sendMail(mailOptions);
  }

  async sendAccountStatusEmail(
    email: string,
    subject: string,
    headline: string,
    details: string,
  ): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Cirql Account Services" <${this.adminEmail}>`,
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
          <p style="margin-top:20px;">If you believe this is a mistake, please contact our support team.</p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin-top: 20px;">
          <p style="font-size: 11px; color: #999999; margin-top: 20px;">
            This is a critical account email and cannot be unsubscribed from.
          </p>
        </div>
      `,
    };
    await this.sendMail(mailOptions);
  }
}
