// cirql-backend/src/main.ts (Final HTTP Version for Local Development)

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
import { Express } from 'express';

// cachedServer is for Vercel (serverless) deployment and is correct.
let cachedServer: Express | undefined;

// This shared function is correct, but we'll adjust the fallback origin to http for consistency.
function configureCommonAppSettings(
  app: NestExpressApplication,
  configService: ConfigService,
  envSuffix: string = '',
) {
  app.enableCors({
    origin: [
      // Use HTTP for the local frontend URL to match your final setup.
      configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
      'https://uploadthing.com',
    ],
    credentials: true,
  });

  const swaggerDocConfig = new DocumentBuilder()
    .setTitle(`Cirql Backend API ${envSuffix}`.trim())
    .setDescription(`Stay in the loop ${envSuffix}`.trim())
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerDocConfig);

  const customSwaggerOptions: SwaggerCustomOptions = {
    customSiteTitle: `Cirql API Docs ${envSuffix}`.trim(),
    customfavIcon: '/favicon.ico',
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    ],
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
    ],
    customCss: `
      .swagger-ui .topbar { background-color: ${envSuffix ? '#2B2B40' : '#1A1A2E'}; }
      .swagger-ui .topbar .link, .swagger-ui .topbar .download-url-wrapper .select-label { color: #EAE6FF; }
      .swagger-ui .topbar .link:hover { color: #3F8CFF; }
      .swagger-ui .topbar .link img { content: url('/favicon.ico'); height: 30px; margin: 5px 10px; }
      .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #3F8CFF; }
      .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #42F2A1; color: #1A1A2E; }
      .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #EAE6FF; color: #1A1A2E; }
      .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #A0A0B2; }
      .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #A0A0B2; opacity: 0.9; }
      .swagger-ui .opblock .opblock-summary-method { color: #FFFFFF; }
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
          ],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
          ],
          imgSrc: ["'self'", 'data:'],
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

// This function for Vercel deployment is correct and needs no changes.
async function bootstrapServerInstance(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  configureCommonAppSettings(app, configService);
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  cachedServer = expressApp;
  return expressApp;
}

export default bootstrapServerInstance();

// This is the section for local development.
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  async function startLocalDevelopmentServer() {
    // --- START OF THE DEFINITIVE FIX ---
    // The 'fs' import and 'httpsOptions' object have been removed.
    // We now create a standard HTTP server by not passing any extra options.
    const localApp =
      await NestFactory.create<NestExpressApplication>(AppModule);
    // --- END OF THE DEFINITIVE FIX ---

    const configService = localApp.get(ConfigService);
    configureCommonAppSettings(localApp, configService, '(Local)');
    const port = configService.get<number>('PORT') || 3001;
    await localApp.listen(port);

    // --- START OF THE DEFINITIVE FIX ---
    // The console logs are updated to use http, matching the server configuration.
    console.log(
      `NestJS backend for local development is running on: http://localhost:${port}`,
    );
    console.log(
      `Swagger docs available locally at: http://localhost:${port}/api`,
    );
    // --- END OF THE DEFINITIVE FIX ---
  }

  startLocalDevelopmentServer().catch((err) => {
    console.error('Error during local backend start:', err);
    process.exit(1);
  });
}
