import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { SocialProfile } from './social-profile.interface';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor() {
    super({
      clientID: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET, // 카카오 개발자 센터에서 발급받은 Client Secret
      callbackURL: process.env.KAKAO_CALLBACK_URL,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const userProfile: SocialProfile = {
      snsId: String(profile.id),
      provider: 'kakao',
      email: profile._json.kakao_account?.email || null,
      name: profile.displayName,
    };
    done(null, userProfile);
  }
}
