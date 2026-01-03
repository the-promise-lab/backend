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
import { Request, Response, NextFunction } from 'express';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { LocalSshTunnel } from './common/utils/local-ssh-tunnel';
import { rewriteDatabaseUrlForLocalTunnel } from './common/utils/local-database-url';
import { InfisicalEnvLoader } from './common/config/infisical/infisical-env-loader';

function loadEnvFiles(): void {
  const envPath: string = '.env';
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath });
  }
}

loadEnvFiles();

function createSwaggerBasicAuthMiddleware(
  id: string,
  password: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawAuthHeader = req.headers.authorization;
    const authHeader = Array.isArray(rawAuthHeader)
      ? rawAuthHeader[0]
      : rawAuthHeader;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
      res.status(401).send('Authentication required');
      return;
    }
    const [, base64Credentials] = authHeader.split(' ');

    if (!base64Credentials) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
      res.status(401).send('Authentication required');
      return;
    }

    let credentials: string;
    try {
      credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    } catch {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
      res.status(401).send('Invalid credentials');
      return;
    }

    const [requestId, requestPassword] = credentials.split(':');

    if (!requestId || !requestPassword) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
      res.status(401).send('Invalid credentials');
      return;
    }

    if (requestId !== id || requestPassword !== password) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
      res.status(401).send('Invalid credentials');
      return;
    }
    next();
  };
}

// BigInt serialization fix
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function ensureLocalSshTunnelAndRewriteDatabaseUrl(params: {
  readonly logger: Logger;
  readonly tunnel: LocalSshTunnel;
}): Promise<void> {
  const isLocal: boolean = process.env.IS_LOCAL === 'true';
  if (!isLocal) {
    return;
  }
  const originalDatabaseUrl: string | undefined = process.env.DATABASE_URL;
  if (!originalDatabaseUrl) {
    throw new Error('IS_LOCAL=true requires DATABASE_URL to be defined.');
  }
  const bastionHost: string = process.env.SSH_BASTION_HOST || '210.109.54.7';
  const bastionPort: number = process.env.SSH_BASTION_PORT
    ? Number(process.env.SSH_BASTION_PORT)
    : 22;
  const bastionUsername: string = process.env.SSH_BASTION_USERNAME || 'ubuntu';
  const privateKeyPath: string | undefined = process.env.SSH_PRIVATE_KEY_PATH;
  if (!privateKeyPath) {
    throw new Error(
      'IS_LOCAL=true requires SSH_PRIVATE_KEY_PATH to be defined (absolute path recommended).',
    );
  }
  const localPort: number = process.env.SSH_LOCAL_PORT
    ? Number(process.env.SSH_LOCAL_PORT)
    : 13306;
  const { rewrittenDatabaseUrl, remoteHost, remotePort } =
    rewriteDatabaseUrlForLocalTunnel({
      originalDatabaseUrl,
      localHost: '127.0.0.1',
      localPort,
    });
  params.logger.log(
    `[Local SSH Tunnel] Starting tunnel via ${bastionUsername}@${bastionHost}:${bastionPort} to ${remoteHost}:${remotePort} (local: 127.0.0.1:${localPort})`,
  );
  await params.tunnel.startTunnel({
    bastionHost,
    bastionPort,
    bastionUsername,
    privateKeyPath,
    localPort,
    remoteHost,
    remotePort,
    connectTimeoutMs: 15_000,
    readyTimeoutMs: 15_000,
  });
  process.env.DATABASE_URL = rewrittenDatabaseUrl;
  params.logger.log(
    '[Local SSH Tunnel] DATABASE_URL rewritten for local tunnel.',
  );
}

async function bootstrap() {
  const logger = new Logger('Bootstrap'); // Create a logger instance
  await loadSecretsFromInfisicalIfConfigured({ logger });
  const localSshTunnel = new LocalSshTunnel();
  const stopLocalTunnel = (): void => {
    void localSshTunnel.stopTunnel();
  };
  process.once('SIGINT', stopLocalTunnel);
  process.once('SIGTERM', stopLocalTunnel);
  await ensureLocalSshTunnelAndRewriteDatabaseUrl({
    logger,
    tunnel: localSshTunnel,
  });
  const isLocal: boolean = process.env.IS_LOCAL === 'true';

  logger.log(
    `[Env Check] DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/\/\/.*:.*@/, '//****:****@') : 'Undefined'}`,
  );

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const swaggerId: string | undefined = process.env.SWAGGER_ID;
  const swaggerPassword: string | undefined = process.env.SWAGGER_PW;

  if (!isLocal && (!swaggerId || !swaggerPassword)) {
    logger.error(
      'SWAGGER_ID and SWAGGER_PW environment variables are not defined.',
    );
    throw new Error(
      'SWAGGER_ID and SWAGGER_PW are required to protect Swagger docs.',
    );
  }

  const swaggerBasicAuthMiddleware =
    isLocal || !swaggerId || !swaggerPassword
      ? null
      : createSwaggerBasicAuthMiddleware(swaggerId, swaggerPassword);

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
        data: 'data',
      },
    },
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

  const isProduction = process.env.NODE_ENV === 'production';
  // Configure express-session
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'your-secret-key', // Use a strong secret from environment variables
      resave: false,
      saveUninitialized: false,
      cookie: {
        domain: isProduction ? '43.200.235.94.nip.io' : undefined,
        maxAge: 3600000, // 1 hour
        httpOnly: true,
        secure: isProduction, // Only secure in production
        sameSite: isProduction ? 'none' : 'lax', // Lax in dev, none in production
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

  // Enable CORS
  const allowedOrigins = (process.env.FRONTEND_URLS || '').split(',');
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

  if (swaggerBasicAuthMiddleware) {
    app.use(['/api/docs', '/api/docs-json'], swaggerBasicAuthMiddleware);
  }
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(
    `📚 Swagger API docs available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();

async function loadSecretsFromInfisicalIfConfigured(params: {
  readonly logger: Logger;
}): Promise<void> {
  const projectIdFromEnv: string | undefined = process.env.INFISICAL_PROJECT_ID;
  const siteUrl: string | undefined = process.env.INFISICAL_SITE_URL;
  const explicitEnv: string | undefined = process.env.INFISICAL_ENV;
  const isProduction: boolean = process.env.NODE_ENV === 'production';
  const environment =
    explicitEnv === 'prod' || explicitEnv === 'dev'
      ? explicitEnv
      : isProduction
        ? 'prod'
        : 'dev';
  const loader = new InfisicalEnvLoader();
  const serviceToken: string | undefined = process.env.INFISICAL_SERVICE_TOKEN;
  const projectId: string | null =
    projectIdFromEnv ?? getInfisicalProjectIdFromConfigFile();
  if (serviceToken && projectId) {
    const result = await loader.loadAndInjectWithServiceToken({
      serviceToken,
      projectId,
      environment,
      siteUrl,
    });
    params.logger.log(
      `[Infisical] Loaded ${result.loadedKeys.length} secrets for env="${environment}" (skipped: ${result.skippedKeys.length}).`,
    );
    return;
  }
  const clientId: string | undefined = process.env.INFISICAL_CLIENT_ID;
  const clientSecret: string | undefined = process.env.INFISICAL_CLIENT_SECRET;
  if (!clientId || !clientSecret || !projectId) {
    return;
  }
  const result = await loader.loadAndInject({
    clientId,
    clientSecret,
    projectId,
    environment,
    siteUrl,
  });
  params.logger.log(
    `[Infisical] Loaded ${result.loadedKeys.length} secrets for env="${environment}" (skipped: ${result.skippedKeys.length}).`,
  );
}

function getInfisicalProjectIdFromConfigFile(): string | null {
  const configPath = '.infisical.json';
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const raw: string = readFileSync(configPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'workspaceId' in parsed &&
      typeof (parsed as { readonly workspaceId?: unknown }).workspaceId ===
        'string'
    ) {
      return (parsed as { readonly workspaceId: string }).workspaceId;
    }
    return null;
  } catch {
    return null;
  }
}
