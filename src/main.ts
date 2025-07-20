// src/main.ts

// --- MODIFICATION 1: Add fs import ---
import * as fs from 'fs';

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

let cachedServer: Express | undefined;

// Shared function to configure common app settings
function configureCommonAppSettings(
  app: NestExpressApplication,
  configService: ConfigService,
  envSuffix: string = '',
) {
  app.enableCors({
    origin: [
      configService.get<string>('FRONTEND_URL') || 'https://localhost:3000',
      'https://uploadthing.com', // Good practice to allow UploadThing's domain
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
      /* Cirql Brand Colors:
         Primary Blue: #3F8CFF
         Midnight Navy: #1A1A2E
         Soft Lilac: #EAE6FF
         Mint Green: #42F2A1
         Neutral Gray: #A0A0B2
      */

      /* Topbar Styling */
      .swagger-ui .topbar {
        background-color: ${envSuffix ? '#2B2B40' : '#1A1A2E'};
      }
      .swagger-ui .topbar .link,
      .swagger-ui .topbar .download-url-wrapper .select-label {
        color: #EAE6FF;
      }
      .swagger-ui .topbar .link:hover {
        color: #3F8CFF;
      }
      .swagger-ui .topbar .link img {
        content: url('/favicon.ico');
        height: 30px;
        margin: 5px 10px;
      }

      /* HTTP Method Badges */
      .swagger-ui .opblock.opblock-get .opblock-summary-method,
      .swagger-ui .opblock.opblock-get .tab-header .tab-item.active {
        background: #3F8CFF;
      }
      .swagger-ui .opblock.opblock-post .opblock-summary-method,
      .swagger-ui .opblock.opblock-post .tab-header .tab-item.active {
        background: #42F2A1;
      }
      .swagger-ui .opblock.opblock-put .opblock-summary-method,
      .swagger-ui .opblock.opblock-put .tab-header .tab-item.active {
        background: #EAE6FF;
      }
      .swagger-ui .opblock.opblock-delete .opblock-summary-method,
      .swagger-ui .opblock.opblock-delete .tab-header .tab-item.active {
        background: #A0A0B2;
      }
      .swagger-ui .opblock.opblock-patch .opblock-summary-method,
      .swagger-ui .opblock.opblock-patch .tab-header .tab-item.active {
        background: #A0A0B2;
        opacity: 0.9;
      }

      /* Text color for method badges for readability */
      .swagger-ui .opblock .opblock-summary-method {
        color: #FFFFFF;
      }
      .swagger-ui .opblock.opblock-post .opblock-summary-method {
        color: #1A1A2E;
      }
      .swagger-ui .opblock.opblock-put .opblock-summary-method {
        color: #1A1A2E;
      }
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

// Local development bootstrapping (only if NOT on Vercel and NOT in production for other reasons)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  // --- START OF FIX: Add this line to allow localhost-to-localhost SSL communication ---
  // This should ONLY be active for local development.
  if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  // --- END OF FIX ---

  async function startLocalDevelopmentServer() {
    // --- MODIFICATION 2: Define HTTPS options using the generated certs ---
    const httpsOptions = {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    };

    // --- MODIFICATION 3: Pass httpsOptions to the factory ---
    const localApp = await NestFactory.create<NestExpressApplication>(
      AppModule,
      { httpsOptions },
    ); // Pass options here

    const configService = localApp.get(ConfigService);

    configureCommonAppSettings(localApp, configService, '(Local)');

    const port = configService.get<number>('PORT') || 3001;
    await localApp.listen(port);

    // --- MODIFICATION 4: Update logs to use https ---
    console.log(
      `Application for local development is running on: https://localhost:${port}`,
    );
    console.log(
      `Swagger docs available locally at: https://localhost:${port}/api`,
    );
    console.log(
      `Favicon should be available locally at: https://localhost:${port}/favicon.ico`,
    );
  }

  startLocalDevelopmentServer().catch((err) => {
    console.error('Error during local application start:', err);
    process.exit(1);
  });
}
