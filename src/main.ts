// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerCustomOptions,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  Express,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express'; // Import Express types

let cachedServer: Express | undefined;

// Shared function to configure common app settings
function configureCommonAppSettings(
  app: NestExpressApplication,
  configService: ConfigService,
  envSuffix: string = '', // To differentiate titles/configs if needed, e.g., '(Local)'
) {
  app.enableCors({
    origin:
      configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

  const swaggerDocConfig = new DocumentBuilder()
    .setTitle(`Cirql Backend API ${envSuffix}`.trim())
    .setDescription(`The Cirql API description ${envSuffix}`.trim())
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerDocConfig);

  const customSwaggerOptions: SwaggerCustomOptions = {
    customSiteTitle: `Cirql API Docs ${envSuffix}`.trim(),
    customfavIcon: '/favicon.ico', // Served by ServeStaticModule
    customCss: `
      .swagger-ui .topbar { background-color: ${envSuffix ? '#333' : '#222'}; } /* Slightly different for local */
      .swagger-ui .topbar .link img { content: url('/favicon.ico'); height: 30px; margin: 5px 10px; }
    `,
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  };

  SwaggerModule.setup('api', app, document, customSwaggerOptions);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
          ], // For potential CDN swagger CSS
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
          ], // For potential CDN swagger JS
          imgSrc: ["'self'", 'data:'], // Corrected: 'self' covers /favicon.ico from same origin
          // Add other sources like 'connect-src' if your API makes external calls from Swagger UI
          // e.g., connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com"],
        },
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
}

async function bootstrapServerInstance(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  configureCommonAppSettings(app, configService); // Use shared configuration function

  // For Vercel (serverless), initialize but don't listen
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  cachedServer = expressApp;
  return expressApp;
}

// This is the handler Vercel will use
export default async (req: ExpressRequest, res: ExpressResponse) => {
  const server = await bootstrapServerInstance();
  server(req, res); // Pass the request and response to the cached Express app
};

// Local development bootstrapping (only if NOT on Vercel and NOT in production for other reasons)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  async function startLocalDevelopmentServer() {
    const localApp =
      await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = localApp.get(ConfigService);

    configureCommonAppSettings(localApp, configService, '(Local)'); // Use shared configuration function with suffix

    const port = configService.get<number>('PORT') || 3001;
    await localApp.listen(port);
    console.log(
      `Application for local development is running on: http://localhost:${port}`,
    );
    console.log(
      `Swagger docs available locally at: http://localhost:${port}/api`,
    );
    console.log(
      `Favicon should be available locally at: http://localhost:${port}/favicon.ico`,
    );
  }

  startLocalDevelopmentServer().catch((err) => {
    console.error('Error during local application start:', err);
    process.exit(1);
  });
}
