import { Controller, Get, Post, Req, Res, UseGuards, UnauthorizedException, Logger } from '@nestjs/common';
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
  @UseGuards(AuthGuard('kakao'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async kakaoLogin() {}

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoLoginCallback(@Req() req: Request, @Res() res: Response) {
    // Passport's AuthGuard already validated the state and attached the user profile.
    const userProfile = (req as any).user;

    try {
      const user = await this.authService.findOrCreateUserFromSocialProfile(userProfile);
      const { accessToken } = this.authService.login(user);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        path: '/',
        secure: true, // HTTPS is required for cross-site cookies
        sameSite: 'none', // Allow cookie to be set on cross-site requests
      });

      // TODO: 프론트엔드 로그인 성공 페이지로 리디렉션
      res.redirect(this.configService.get('FRONTEND_URL')); // 예시 URL
    } catch (e) {
      this.logger.error('Error during user processing or token generation:', e);
      res.redirect(`${this.configService.get('FRONTEND_URL')}/error?message=Login failed`);
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    return { message: 'Successfully logged out' };
  }
}
