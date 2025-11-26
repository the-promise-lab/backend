import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

type KakaoRequest = Request & {
  kakaoRetryRedirectUrl?: string;
};

@Injectable()
export class KakaoAuthGuard extends AuthGuard('kakao') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (this.tryHandleInvalidGrant(err, context)) {
      // Return null so the controller can short-circuit and redirect.
      return null;
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }

  private tryHandleInvalidGrant(err: any, context: ExecutionContext) {
    if (!err || err?.code !== 'invalid_grant') {
      return false;
    }

    const request = context.switchToHttp().getRequest<KakaoRequest>();
    const state = (request.query?.state as string) || '';
    const retry = Number((request.query?.retry as string) || '0');
    const redirectTarget = this.decodeState(state) ?? this.getDefaultRedirect();

    if (retry < 1) {
      const loginUrl = new URL(`${this.getBaseUrl(request)}/api/auth/kakao`);
      loginUrl.searchParams.set('redirect_uri', redirectTarget);
      loginUrl.searchParams.set('retry', String(retry + 1));
      request.kakaoRetryRedirectUrl = loginUrl.toString();
    } else {
      request.kakaoRetryRedirectUrl = `${redirectTarget.replace(
        /\/$/,
        '',
      )}/error?message=Login%20failed`;
    }

    return true;
  }

  private decodeState(state: string): string | null {
    if (!state) {
      return null;
    }
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf-8');
      new URL(decoded);
      return decoded;
    } catch {
      return null;
    }
  }

  private getDefaultRedirect(): string {
    const allowedOrigins = (
      this.configService.get<string>('FRONTEND_URLS') || ''
    ).split(',');
    return allowedOrigins.length > 0 && allowedOrigins[0]
      ? allowedOrigins[0]
      : '/';
  }

  private getBaseUrl(request: Request) {
    const protocolHeader = request.headers['x-forwarded-proto'];
    const protocol = Array.isArray(protocolHeader)
      ? protocolHeader[0]
      : protocolHeader || request.protocol;
    const host = request.get('host');
    return `${protocol}://${host}`;
  }
}
