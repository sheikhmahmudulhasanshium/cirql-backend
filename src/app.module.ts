// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { SupportModule } from './support/support.module';
import { NotificationsModule } from './notifications/notifications.module'; // Import NotificationsModule
import { ActivityModule } from './activity/activity.module';
import { UploadModule } from './upload/upload.module';

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
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    // Core Modules
    EmailModule,
    AuditModule,
    // Feature Modules
    UsersModule,
    AuthModule,
    SettingsModule,
    SocialModule,
    AnnouncementsModule,
    SupportModule,
    NotificationsModule,
    ActivityModule,
    UploadModule, // --- ADD THIS LINE ---
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
