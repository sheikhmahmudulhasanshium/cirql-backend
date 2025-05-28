import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
// import { join } from 'path'; // Removed as 'join' is not used while useStaticAssets is commented out

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Temporarily commented out to diagnose Swagger UI asset loading on Vercel
  // If Swagger UI works without this, then there was an interaction.
  // If Swagger UI still fails, this line was not the primary cause for that issue.
  // app.useStaticAssets(join(__dirname, '..', 'public'));

  app.enableCors({
    origin:
      configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Cirql Backend API')
    .setDescription('The Cirql API description')
    .setVersion('1.0')
    .addBearerAuth() // If you use Bearer token auth for your APIs
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // It's generally good practice to ensure Swagger UI setup is robust.
  // Default options for swagger-ui-express usually work, but for serverless,
  // sometimes explicit options are needed if problems persist.
  // For now, we'll stick to the basic setup.
  SwaggerModule.setup('api', app, document, {
    // explorer: true, // Optional: enables a search bar in Swagger UI
    // customSiteTitle: 'Cirql API Docs', // Optional: custom title
    // swaggerOptions: { // Optional: pass further swagger-ui options
    //   docExpansion: 'none', // 'list' (default), 'full', 'none'
    //   filter: true,
    //   showRequestDuration: true,
    // },
  });

  app.use(helmet());
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
  // For Vercel, app.listen() is effectively ignored as Vercel manages the server lifecycle.
  // This is mainly for local development.
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    // Only listen locally
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger docs available at: http://localhost:${port}/api`);
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
