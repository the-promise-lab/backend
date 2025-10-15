import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SocialProfile } from './social-profile.interface';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get('KAKAO_CLIENT_ID'),
      clientSecret: configService.get('KAKAO_CLIENT_SECRET'),
      callbackURL: configService.get('KAKAO_CALLBACK_URL'),
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err?: Error, user?: any, info?: any) => void,
  ): Promise<any> {
    const socialProfile: SocialProfile = {
      provider: 'kakao',
      snsId: String(profile.id),
      email: profile._json.kakao_account?.email || null,
      name: profile.displayName,
    };

    try {
      const user =
        await this.authService.findOrCreateUserFromSocialProfile(socialProfile);
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}
