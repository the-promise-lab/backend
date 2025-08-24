// IMPORTANT: Make sure to import `instrument.ts` at the top of your file.
// If you're using CommonJS (CJS) syntax, use `require("./instrument.ts");`
import "./instrument";

// All other imports below
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:3001', // 프론트엔드 서버의 출처
    credentials: true, // 쿠키를 포함한 요청을 허용
  });
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Backend API')
    .setDescription('NestJS 기반 백엔드 API 문서')
    .setVersion('1.0')
    .addTag('app', '기본 애플리케이션 엔드포인트')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT 토큰을 입력하세요',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger API docs available at: http://localhost:${port}/api/docs`);
}
bootstrap(); 