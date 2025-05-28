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
import { Express } from 'express'; // Request and Response types not needed here if default export is the app instance

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
    .setDescription(`Stay in the loop ${envSuffix}`.trim())
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerDocConfig);

  const customSwaggerOptions: SwaggerCustomOptions = {
    customSiteTitle: `Cirql API Docs ${envSuffix}`.trim(),
    customfavIcon: '/favicon.ico', // Served by your ServeStaticModule from /public

    // --- Tell Swagger to load its core assets from a CDN ---
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    ],
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
    ],
    // Your inline custom CSS will be applied AFTER the CDN CSS
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
        background-color: ${envSuffix ? '#2B2B40' : '#1A1A2E'}; /* Midnight Navy for prod (#1A1A2E), slightly lighter for local (#2B2B40) */
      }
      .swagger-ui .topbar .link, /* Title link */
      .swagger-ui .topbar .download-url-wrapper .select-label { /* "Definition" label */
        color: #EAE6FF; /* Soft Lilac for text on topbar */
      }
      .swagger-ui .topbar .link:hover {
        color: #3F8CFF; /* Primary Blue on hover */
      }
      .swagger-ui .topbar .link img { /* Favicon styling in topbar */
        content: url('/favicon.ico');
        height: 30px;
        margin: 5px 10px;
      }

      /* HTTP Method Badges */
      .swagger-ui .opblock.opblock-get .opblock-summary-method,
      .swagger-ui .opblock.opblock-get .tab-header .tab-item.active {
        background: #3F8CFF; /* Primary Blue for GET */
      }
      .swagger-ui .opblock.opblock-post .opblock-summary-method,
      .swagger-ui .opblock.opblock-post .tab-header .tab-item.active {
        background: #42F2A1; /* Mint Green for POST */
      }
      .swagger-ui .opblock.opblock-put .opblock-summary-method,
      .swagger-ui .opblock.opblock-put .tab-header .tab-item.active {
        background: #EAE6FF; /* Soft Lilac for PUT */
      }
      .swagger-ui .opblock.opblock-delete .opblock-summary-method,
      .swagger-ui .opblock.opblock-delete .tab-header .tab-item.active {
        background: #A0A0B2; /* Neutral Gray for DELETE */
      }
      .swagger-ui .opblock.opblock-patch .opblock-summary-method,
      .swagger-ui .opblock.opblock-patch .tab-header .tab-item.active {
        background: #A0A0B2; /* Neutral Gray for PATCH */
        opacity: 0.9; /* Slightly differentiate from DELETE if using same color */
      }

      /* Text color for method badges for readability */
      .swagger-ui .opblock .opblock-summary-method {
        color: #FFFFFF; /* Default to white text for dark badges (GET, DELETE, PATCH) */
      }
      .swagger-ui .opblock.opblock-post .opblock-summary-method {
        color: #1A1A2E; /* Dark text (Midnight Navy) for Mint Green background */
      }
      .swagger-ui .opblock.opblock-put .opblock-summary-method {
        color: #1A1A2E; /* Dark text (Midnight Navy) for Soft Lilac background */
      }

      /* Optional: Further theming like section headers */
      /*
      .swagger-ui .opblock-tag {
        color: #3F8CFF; // Primary Blue for API group titles
      }
      */
    `,
    // -----------------------------------------------------
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
            "'unsafe-inline'", // Needed for customCss
            'https://cdnjs.cloudflare.com',
          ], // Allow CDN for Swagger CSS
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Often needed by Swagger UI itself or its presets
            'https://cdnjs.cloudflare.com',
          ], // Allow CDN for Swagger JS
          imgSrc: ["'self'", 'data:'], // Covers /favicon.ico from same origin and inline data URIs
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

// This is the handler Vercel will use: export the promise that resolves to the Express app instance
export default bootstrapServerInstance();

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
