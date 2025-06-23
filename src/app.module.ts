// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// --- FIX: Import the ThrottlerModule and its Guard ---
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { SocialModule } from './social/social.module';
import { AnnouncementsModule } from './announcement/announcement.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { PasswordResetTokenSchema } from './auth/schemas/password-reset-token.schema';
import { SupportModule } from './support/support.module';

// Your Joi schema is correct and does not need changes.
interface EnvironmentVariables {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRATION_TIME: string;
  ADMIN_LIST: string;
  FRONTEND_URL: string;
  BACKEND_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_TO_BACKEND_URL: string;
  ALLOWED_FRONTEND_ORIGINS: string;
}

const envValidationSchema = Joi.object<EnvironmentVariables, true>({
  PORT: Joi.number().default(3001),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION_TIME: Joi.string().default('3600s'),
  ADMIN_LIST: Joi.string().required(),
  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  BACKEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_TO_BACKEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  ALLOWED_FRONTEND_ORIGINS: Joi.string().required(),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => {
        const uri = configService.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error('MONGODB_URI is not defined or empty!');
        }
        return {
          uri: uri,
        };
      },
      inject: [ConfigService],
    }),
    // --- FIX: Configure rate limiting globally ---
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time-to-live in milliseconds (60 seconds)
        limit: 20, // Max 20 requests from the same IP per minute
      },
    ]),
    MongooseModule.forFeature([
      { name: 'PasswordResetToken', schema: PasswordResetTokenSchema },
    ]),
    UsersModule,
    AuthModule,
    SettingsModule,
    SocialModule,
    AnnouncementsModule,
    AuditModule,
    EmailModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // --- FIX: Apply the ThrottlerGuard to all routes globally ---
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
