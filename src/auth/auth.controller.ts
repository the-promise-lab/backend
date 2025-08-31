import { Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: Request) {
    // req.user는 JwtStrategy의 validate 함수에서 반환된 값입니다.
    return req.user;
  }

  @Get(':provider')
  @UseGuards(AuthGuard('kakao')) // 우선 'kakao'만 명시
  async socialLogin(@Param('provider') provider: string) {
    provider = provider.toLowerCase();
    if (provider !== 'kakao') {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  @Get(':provider/callback')
  @UseGuards(AuthGuard('kakao'))
  async socialLoginCallback(@Req() req, @Res() res: Response) {
    const userProfile = req.user as any;

    const user = await this.authService.findOrCreateUser(userProfile);

    const { accessToken } = this.authService.login(user);

    res.cookie('accessToken', accessToken, { httpOnly: true });

    // TODO: 프론트엔드 로그인 성공 페이지로 리디렉션
    res.redirect('http://localhost:3001'); // 예시 URL
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    return { message: 'Successfully logged out' };
  }
}
