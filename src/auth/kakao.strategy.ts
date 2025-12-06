import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SocialProfile } from './social-profile.interface';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  private readonly logger = new Logger(KakaoStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private prisma: PrismaService, // Inject PrismaService
  ) {
    super({
      clientID: configService.get('KAKAO_CLIENT_ID'),
      clientSecret: configService.get('KAKAO_CLIENT_SECRET'),
      callbackURL: configService.get('KAKAO_CALLBACK_URL'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err?: Error, user?: any, info?: any) => void,
  ): Promise<any> {
    this.logger.debug(`[KakaoStrategy] Validate method invoked.`);

    const socialProfile: SocialProfile = {
      provider: 'kakao',
      snsId: String(profile.id),
      email: profile._json.kakao_account?.email || null,
      name: profile.displayName,
    };

    try {
      const user =
        await this.authService.findOrCreateUserFromSocialProfile(socialProfile);
      this.logger.debug(`[KakaoStrategy] User found or created: ${user.id}`);
      done(null, user);
    } catch (err) {
      this.logger.error('Error during KakaoStrategy validation:', err);
      done(err, false);
    }
  }
}
