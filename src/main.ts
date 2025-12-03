// IMPORTANT: Make sure to import `instrument.ts` at the top of your file.
// If you're using CommonJS (CJS) syntax, use `require("./instrument.ts");`
import './instrument';

// All other imports below
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session'; // Import express-session
import * as MySQLStore from 'express-mysql-session';
import { URL } from 'url';

// BigInt serialization fix
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger('Bootstrap'); // Create a logger instance

  logger.log(`[Env Check] DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/\/\/.*:.*@/, '//****:****@') : 'Undefined'}`);

  const app = await NestFactory.create(AppModule);

  // Correctly set 'trust proxy' by getting the underlying Express adapter instance
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  app.use(cookieParser());

  // Ensure DATABASE_URL is defined
  if (!process.env.DATABASE_URL) {
    logger.error('DATABASE_URL environment variable is not defined.');
    throw new Error('DATABASE_URL is required for database connection.');
  }

  // Parse DATABASE_URL
  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbOptions = {
    host: dbUrl.hostname,
    port: Number(dbUrl.port),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1), // Remove leading '/'
    createDatabaseTable: true, // 세션 테이블 자동 생성
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data'
      }
    }
  };

  // Log the DB options (excluding password for security)
  const dbOptionsForLogging = { ...dbOptions };
  delete (dbOptionsForLogging as any).password;
  logger.log(
    `Initializing MySQL session store with options: ${JSON.stringify(
      dbOptionsForLogging,
    )}`,
  );

  const sessionStore = new (MySQLStore(session as any))(dbOptions);

  // Configure express-session
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'your-secret-key', // Use a strong secret from environment variables
      resave: false,
      saveUninitialized: false,
      cookie: {
        domain: '43.200.235.94.nip.io',
        maxAge: 3600000, // 1 hour
        httpOnly: true,
        secure: true, // Must be true if SameSite=None
        sameSite: 'none',
      },
    }),
  );

  logger.log('Session middleware initialized.');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = (
      process.env.FRONTEND_URLS || ''
    ).split(',');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
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

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger API docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();

