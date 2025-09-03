import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialProfile } from './social-profile.interface';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly userCreationCache = new Map<string, { status: 'PROCESSING' | 'COMPLETED', timestamp: number }>();
  private readonly CACHE_EXPIRATION_MS = 5 * 1000; // 5 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {}

  async findOrCreateUserFromSocialProfile(profile: SocialProfile): Promise<any> {
    const cacheKey = `${profile.provider}-${profile.snsId}`;
    const cachedStatus = this.userCreationCache.get(cacheKey);

    if (cachedStatus) {
      if (cachedStatus.status === 'COMPLETED') {
        this.logger.log(`User for ${cacheKey} already processed successfully.`);
        // Retrieve user from DB if needed, or assume it's already in DB
        return this.prisma.user.findUnique({
          where: {
            snsId_provider: {
              snsId: profile.snsId,
              provider: profile.provider,
            },
          },
        });
      }
      if (cachedStatus.status === 'PROCESSING' && (Date.now() - cachedStatus.timestamp < this.CACHE_EXPIRATION_MS)) {
        this.logger.log(`User for ${cacheKey} is currently being processed.`);
        throw new ConflictException('User creation/lookup already in progress.');
      }
    }

    // Mark as processing
    this.userCreationCache.set(cacheKey, { status: 'PROCESSING', timestamp: Date.now() });

    try {
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

      // Mark as completed
      this.userCreationCache.set(cacheKey, { status: 'COMPLETED', timestamp: Date.now() });
      return user;
    } catch (error) {
      this.logger.error(`Error processing user for ${cacheKey}:`, error);
      // Remove from cache on error to allow retry
      this.userCreationCache.delete(cacheKey);
      throw error;
    }
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
