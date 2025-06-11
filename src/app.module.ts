import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import * as NestServeStatic from '@nestjs/serve-static'; // Using alias
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { SocialModule } from './social/social.module';

// Define the structure of your expected environment variables
interface EnvironmentVariables {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRATION_TIME: string;

  // URLs
  FRONTEND_URL: string; // Fallback/default frontend URL
  BACKEND_URL: string; // This backend's own URL

  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_TO_BACKEND_URL: string; // The URL Google redirects to THIS backend

  // Security/CORS related
  ALLOWED_FRONTEND_ORIGINS: string; // Comma-separated list of trusted frontend origins
}

// Define the Joi validation schema for the environment variables
const envValidationSchema = Joi.object<EnvironmentVariables, true>({
  PORT: Joi.number().default(3001),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION_TIME: Joi.string().default('3600s'),

  // URLs
  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  BACKEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_TO_BACKEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),

  // Security/CORS related
  ALLOWED_FRONTEND_ORIGINS: Joi.string().required(), // You could add custom validation for comma-separated URIs if needed
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Ensure this file exists at the root of your backend project
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true, // Allows .env to have more variables than defined in schema
        abortEarly: false, // Reports all validation errors at once
      },
    }),
    NestServeStatic.ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'), // For serving static files like favicon.ico
      serveRoot: '/', // Serve from the root (e.g., /favicon.ico)
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      // Explicitly type ConfigService here for better type safety if desired
      useFactory: (configService: ConfigService<EnvironmentVariables>) => {
        const uri = configService.get<string>('MONGODB_URI'); // Joi ensures MONGODB_URI is string
        if (!uri) {
          // This check is somewhat redundant due to Joi validation but good for defense
          throw new Error('MONGODB_URI is not defined or empty!');
        }
        return {
          uri: uri,
          // Add other Mongoose connection options if needed
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    SettingsModule,
    SocialModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
