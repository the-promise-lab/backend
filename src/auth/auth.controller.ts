import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Logger,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

declare module 'express' {
  interface Request {
    headers: {
      origin?: string;
      [key: string]: string | string[] | undefined;
    };
  }
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: Request) {
    this.logger.debug(`[getProfile] User from request: ${JSON.stringify(req.user)}`);
    // req.user는 JwtStrategy의 validate 함수에서 반환된 값입니다.
    return req.user;
  }

  @Get('kakao')
  async kakaoLogin(
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
      } catch (error) {
        this.logger.warn(
          `[kakaoLogin] Invalid redirect_uri "${redirectUri}". Using default "${finalRedirectUri}".`,
        );
      }
    }
    finalRedirectUri = redirectUri;
    const state = Buffer.from(finalRedirectUri).toString('base64');
    const kakaoClientId = this.configService.get('KAKAO_CLIENT_ID');
    const kakaoCallbackUrl = this.configService.get('KAKAO_CALLBACK_URL');

    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${kakaoClientId}&redirect_uri=${kakaoCallbackUrl}&state=${state}`;
    this.logger.debug(`[kakaoLogin] Redirect URL: ${kakaoAuthUrl}`);
    res.redirect(kakaoAuthUrl);
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoLoginCallback(@Req() req: Request, @Res() res: Response) {
    this.logger.debug(`[kakaoLoginCallback] Method invoked.`);

    const state = (req.query.state as string) || '';
    let redirectUrl = '';
    try {
      redirectUrl = Buffer.from(state, 'base64').toString('utf-8');
      // Basic validation to ensure the URL is not malformed
      new URL(redirectUrl);
      this.logger.debug(`[kakaoLoginCallback] Valid redirect URL: ${redirectUrl}`);
    } catch (error) {
      this.logger.error(
        `[kakaoLoginCallback] Invalid or missing state. Using default redirect.`,
      );
      const allowedOrigins = (
        this.configService.get('FRONTEND_URLS') || ''
      ).split(',');
      redirectUrl = allowedOrigins.length > 0 ? allowedOrigins[0] : '/';
    }

    const userProfile = (req as any).user; // req.user is set by Passport

    try {
      const user =
        await this.authService.findOrCreateUserFromSocialProfile(userProfile);
      const { accessToken } = this.authService.login(user);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });

      res.redirect(redirectUrl);
    } catch (e) {
      this.logger.error('Error during user processing or token generation:', e);
      res.redirect(`${redirectUrl}/error?message=Login failed`);
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    return { message: 'Successfully logged out' };
  }
}
