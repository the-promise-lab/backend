import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Logger,
  Query,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import * as crypto from 'crypto';
import 'express-session';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SocialProfile } from './social-profile.interface';
import { KakaoTokenDto } from './dto/kakao-token.dto';
import { AuthTokenDto } from './dto/auth-token.dto';
import { ApiResponse } from '@nestjs/swagger';

declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    oauthRedirectUri?: string;
  }
}

declare module 'express' {
  interface Request {
    headers: {
      origin?: string;
      [key: string]: string | string[] | undefined;
    };
    kakaoRetryRedirectUrl?: string;
  }
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  @Post('kakao/token')
  @ApiResponse({ type: AuthTokenDto })
  async exchangeCodeForToken(
    @Body() kakaoTokenDto: KakaoTokenDto,
  ): Promise<AuthTokenDto> {
    this.logger.debug(
      `[exchangeCodeForToken] Method invoked. code: ${kakaoTokenDto.code}, redirectUri: ${kakaoTokenDto.redirectUri}`,
    );

    const clientId = this.configService.get('KAKAO_CLIENT_ID');
    const clientSecret = this.configService.get('KAKAO_CLIENT_SECRET');

    const tokenUrl = 'https://kauth.kakao.com/oauth/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', kakaoTokenDto.redirectUri);
    params.append('code', kakaoTokenDto.code);

    try {
      // 1. Exchange code for Kakao token
      const tokenResponse = await firstValueFrom(
        this.httpService.post(tokenUrl, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const kakaoAccessToken = tokenResponse.data.access_token;
      this.logger.debug(
        '[exchangeCodeForToken] Successfully received Kakao token.',
      );

      // 2. Get user profile from Kakao
      const profileUrl = 'https://kapi.kakao.com/v2/user/me';
      const profileResponse = await firstValueFrom(
        this.httpService.get(profileUrl, {
          headers: { Authorization: `Bearer ${kakaoAccessToken}` },
        }),
      );

      const profile = profileResponse.data;
      const socialProfile: SocialProfile = {
        provider: 'kakao',
        snsId: String(profile.id),
        email: profile.kakao_account?.email || null,
        name: profile.properties?.nickname || null,
      };
      this.logger.debug(
        `[exchangeCodeForToken] Received social profile: ${JSON.stringify(
          socialProfile,
        )}`,
      );

      // 3. Find or create user
      const user =
        await this.authService.findOrCreateUserFromSocialProfile(socialProfile);

      // 4. Generate and return app's JWT
      const { accessToken } = this.authService.login(user);
      return { accessToken };
    } catch (error) {
      this.logger.error(
        `[exchangeCodeForToken] Failed to exchange code for token: ${
          error.response?.data
            ? JSON.stringify(error.response.data)
            : error.message
        }`,
      );
      throw new UnauthorizedException('Failed to login with Kakao.');
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: Request) {
    this.logger.debug(
      `[getProfile] User from request: ${JSON.stringify(req.user)}`,
    );
    // req.user는 JwtStrategy의 validate 함수에서 반환된 값입니다.
    return req.user;
  }

  @Get('kakao')
  async kakaoLogin(
    @Req() req: Request,
    @Res() res: Response,
    @Query('redirect_uri') redirectUri?: string,
  ) {
    this.logger.debug(
      `[kakaoLogin] Method invoked. redirectUri: ${redirectUri}`,
    );

    const allowedOrigins = (
      this.configService.get('FRONTEND_URLS') || ''
    ).split(',');
    let finalRedirectUri = allowedOrigins.length > 0 ? allowedOrigins[0] : '/';

    if (redirectUri) {
      try {
        const providedOrigin = new URL(redirectUri).origin;
        if (allowedOrigins.includes(providedOrigin)) {
          finalRedirectUri = redirectUri;
        } else {
          this.logger.warn(
            `[kakaoLogin] Provided redirect_uri origin "${providedOrigin}" is not in the whitelist. Using default "${finalRedirectUri}".`,
          );
        }
      } catch {
        this.logger.warn(
          `[kakaoLogin] Invalid redirect_uri "${redirectUri}". Using default "${finalRedirectUri}".`,
        );
      }
    }

    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    req.session.oauthRedirectUri = finalRedirectUri;

    const kakaoClientId = this.configService.get('KAKAO_CLIENT_ID');
    const kakaoCallbackUrl = this.configService.get('KAKAO_CALLBACK_URL');

    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${kakaoClientId}&redirect_uri=${kakaoCallbackUrl}&state=${state}`;
    this.logger.debug(`[kakaoLogin] Redirect URL: ${kakaoAuthUrl}`);
    res.redirect(kakaoAuthUrl);
  }

  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  async kakaoLoginCallback(@Req() req: Request, @Res() res: Response) {
    this.logger.debug(`[kakaoLoginCallback] Method invoked.`);

    const state = (req.query.state as string) || '';
    const sessionState = req.session.oauthState;
    const redirectUrl =
      req.session.oauthRedirectUri ||
      (this.configService.get('FRONTEND_URLS') || '').split(',')[0] ||
      '/';

    // Clear session data immediately after use
    req.session.oauthState = undefined;
    req.session.oauthRedirectUri = undefined;

    if (!state || state !== sessionState) {
      this.logger.error(
        `[kakaoLoginCallback] Invalid state. session='${sessionState}', query='${state}'`,
      );
      throw new UnauthorizedException('Invalid state parameter');
    }

    if (req.kakaoRetryRedirectUrl) {
      this.logger.warn(
        `[kakaoLoginCallback] Retry triggered. Redirecting to ${req.kakaoRetryRedirectUrl}`,
      );
      return res.redirect(req.kakaoRetryRedirectUrl);
    }

    const userProfile = (req as any).user; // req.user is set by Passport

    try {
      const user =
        await this.authService.findOrCreateUserFromSocialProfile(userProfile);
      const { accessToken } = this.authService.login(user);

      const url = new URL(redirectUrl);
      url.searchParams.set('accessToken', accessToken);
      res.redirect(url.toString());
    } catch (e) {
      this.logger.error('Error during user processing or token generation:', e);
      res.redirect(`${redirectUrl}/error?message=Login failed`);
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout() {
    return { message: 'Successfully logged out' };
  }
}
