import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialProfile } from './social-profile.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async findOrCreateUser(profile: SocialProfile): Promise<any> {
    let user = await this.prisma.user.findUnique({
      where: {
        snsId_provider: {
          snsId: profile.snsId,
          provider: profile.provider,
        },
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          snsId: profile.snsId,
          provider: profile.provider,
          email: profile.email,
          name: profile.name,
        },
      });
    }
    return user;
  }

  login(user: any) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async getUserFromJwt(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    // 필요한 정보만 반환 (비밀번호 등 민감 정보 제외)
    if (user) {
      const { ...result } = user;
      return result;
    }
    return null;
  }
}
