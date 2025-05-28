// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express'; // <--- IMPORT THIS
import { join } from 'path'; // <--- IMPORT THIS

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); // <--- SPECIFY NestExpressApplication
  const configService = app.get(ConfigService);

  // Serve static assets from the 'public' folder
  app.useStaticAssets(join(__dirname, '..', 'public')); // <--- ADD THIS LINE

  // Enable CORS - Add this if your frontend is on a different port/domain
  app.enableCors({
    origin:
      configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Cirql Backend API')
    .setDescription('The Cirql API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

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
  await app.listen(port); // This line will be ignored by Vercel, as Vercel handles the listening.
  console.log(`Application is running on: http://localhost:${port}`); // For local dev
  console.log(`Swagger docs available at: http://localhost:${port}/api`); // For local dev
}

bootstrap().catch((err) => {
  console.error('Error during application bootstrap:', err);
  process.exit(1);
});
