import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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
    // req.user는 JwtStrategy의 validate 함수에서 반환된 값입니다.
    return req.user;
  }

  @Get('kakao')
  async kakaoLogin(@Req() req: Request, @Res() res: Response) {
    this.logger.debug(`[kakaoLogin] Method invoked. Current Session ID: ${req.session.id}`);
    const state = crypto.randomBytes(16).toString('hex');
    (req.session as any).oauthState = state; // Store state in session
    this.logger.debug(`[kakaoLogin] Generated state: ${state}`);

    req.session.save((err) => {
      if (err) {
        this.logger.error('[kakaoLogin] Error saving session:', err);
        return res.status(500).send('Error saving session');
      }
      this.logger.debug(`[kakaoLogin] Session saved. Session ID after save: ${req.session.id}`);

      const kakaoClientId = this.configService.get('KAKAO_CLIENT_ID');
      const kakaoCallbackUrl = this.configService.get('KAKAO_CALLBACK_URL');

      this.logger.debug(`[kakaoLogin] KAKAO_CLIENT_ID: ${kakaoClientId}`);
      this.logger.debug(`[kakaoLogin] KAKAO_CALLBACK_URL: ${kakaoCallbackUrl}`);

      const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${kakaoClientId}&redirect_uri=${kakaoCallbackUrl}&state=${state}`;
      res.redirect(kakaoAuthUrl);
    });
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoLoginCallback(@Req() req: Request, @Res() res: Response) {
    this.logger.debug(`[kakaoLoginCallback] Method invoked. Current Session ID: ${req.session.id}`);
    this.logger.debug(`[kakaoLoginCallback] Incoming Query: ${JSON.stringify(req.query)}`);

    const userProfile = (req as any).user; // req.user is set by Passport

    try {
      const user =
        await this.authService.findOrCreateUserFromSocialProfile(userProfile);
      const { accessToken } = this.authService.login(user);

      res.cookie('accessToken', accessToken, { httpOnly: true });

      // TODO: 프론트엔드 로그인 성공 페이지로 리디렉션
      res.redirect(this.configService.get('FRONTEND_URL')); // 예시 URL
    } catch (e) {
      this.logger.error('Error during user processing or token generation:', e);
      res.redirect(
        `${this.configService.get('FRONTEND_URL')}/error?message=Login failed`,
      );
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    return { message: 'Successfully logged out' };
  }
}
