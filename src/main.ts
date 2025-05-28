// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerCustomOptions, // <--- IMPORT THIS
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
// Keep 'join' if you uncomment app.useStaticAssets later, otherwise it's not needed here
// For ServeStaticModule, 'join' is used in app.module.ts

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Note: ServeStaticModule in AppModule now handles serving from 'public'
  // The app.useStaticAssets line below is an alternative way.
  // If ServeStaticModule is configured, you likely don't need app.useStaticAssets for the 'public' folder.
  // If you had other static asset needs outside of what ServeStaticModule does, you might use it.
  // For now, with ServeStaticModule for '/public', this is likely redundant for favicon:
  // app.useStaticAssets(join(__dirname, '..', 'public')); // This would serve from /public relative to dist

  app.enableCors({
    origin:
      configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

  const swaggerDocConfig = new DocumentBuilder() // Renamed to avoid conflict with customOptions.config
    .setTitle('Cirql Backend API')
    .setDescription('The Cirql API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerDocConfig);

  // --- Define Custom Swagger UI Options ---
  const customOptions: SwaggerCustomOptions = {
    customSiteTitle: 'Cirql API Docs',
    customfavIcon: '/favicon.ico', // This will be served by ServeStaticModule

    // Example: Basic custom CSS
    customCss: `
      .swagger-ui .topbar { background-color: #222; }
      .swagger-ui .topbar .link img { content: url('/favicon.ico'); height: 30px; margin: 5px 10px; }
    `,
    // You can add more custom CSS or CDN links like in the example project if desired
    // customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    // customJs: [
    //   'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
    //   'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
    // ],
    swaggerOptions: {
      docExpansion: 'list', // 'list', 'full', 'none'
      filter: true,
      showRequestDuration: true,
      // tryItOutEnabled: true, // Default is true
    },
  };
  // -------------------------------------

  SwaggerModule.setup('api', app, document, customOptions); // <--- USE customOptions

  app.use(
    helmet({
      contentSecurityPolicy: {
        // Adjust CSP if using external Swagger UI assets from CDN
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
          ], // Allow inline styles and cdnjs for CSS
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
          ], // Allow inline scripts and cdnjs for JS
          imgSrc: ["'self'", 'data:', '/favicon.ico'], // Allow self, data URLs, and your favicon
          // Add other sources if needed
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

  const port = configService.get<number>('PORT') || 3001;
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger docs available at: http://localhost:${port}/api`);
    console.log(`Favicon should be at: http://localhost:${port}/favicon.ico`);
  } else {
    console.log(
      'Application configured for serverless deployment (Vercel). Not calling app.listen().',
    );
  }
}

bootstrap().catch((err) => {
  console.error('Error during application bootstrap:', err);
  process.exit(1);
});
