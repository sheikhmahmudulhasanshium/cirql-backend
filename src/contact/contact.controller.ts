// src/contact/contact.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { CreateContactDto } from './contact.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit the public contact form' })
  @ApiResponse({
    status: 200,
    description: 'Message has been successfully received.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validation failed.',
  })
  async submitContactForm(
    @Body(new ValidationPipe()) createContactDto: CreateContactDto,
  ): Promise<{ message: string }> {
    await this.emailService.sendContactFormEmail({
      name: createContactDto.name,
      fromEmail: createContactDto.email,
      message: createContactDto.message,
    });
    return { message: 'Your message has been sent successfully!' };
  }
}
