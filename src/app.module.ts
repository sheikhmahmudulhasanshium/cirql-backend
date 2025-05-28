// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

interface EnvironmentVariables {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRATION_TIME: string;
  FRONTEND_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
}

// Disable problematic rules for the Joi schema definition block
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
const envValidationSchema: Joi.ObjectSchema<EnvironmentVariables> =
  Joi.object<EnvironmentVariables>({
    PORT: Joi.number().default(3001),
    MONGODB_URI: Joi.string().required(),
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRATION_TIME: Joi.string().default('3600s'),
    FRONTEND_URL: Joi.string().uri().required(),
    GOOGLE_CLIENT_ID: Joi.string().required(),
    GOOGLE_CLIENT_SECRET: Joi.string().required(),
    GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
  });
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

@Module({
  imports: [
    // Use a block comment to disable ONLY @typescript-eslint/no-unsafe-assignment
    // for the ConfigModule.forRoot() call and its argument, as this is the only
    // rule firing for the validationOptions property.
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    // In app.module.ts
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        console.log('Attempting to connect with MONGODB_URI:', uri); // <-- ADD THIS LINE
        if (!uri) {
          // This case should be caught by Joi, but good to double-check
          throw new Error('MONGODB_URI is not defined or empty!');
        }
        return {
          uri: uri,
          // You might want to add these common options, though not strictly related to this error:
          // useNewUrlParser: true,
          // useUnifiedTopology: true,
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
