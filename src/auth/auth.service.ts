import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialProfile } from './social-profile.interface';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly userCreationCache = new Map<
    string,
    { status: 'PROCESSING' | 'COMPLETED'; timestamp: number }
  >();
  private readonly CACHE_EXPIRATION_MS = 5 * 1000; // 5 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {}

  async findOrCreateUserFromSocialProfile(
    profile: SocialProfile,
  ): Promise<any> {
    // 1. Always check the DB first.
    let user = await this.prisma.user.findUnique({
      where: {
        snsId_provider: {
          snsId: profile.snsId,
          provider: profile.provider,
        },
      },
    });

    if (user) {
      return user;
    }

    // 2. If user doesn't exist, use cache as a lock to prevent race conditions.
    const cacheKey = `${profile.provider}-${profile.snsId}`;
    const cachedStatus = this.userCreationCache.get(cacheKey);

    if (
      cachedStatus?.status === 'PROCESSING' &&
      Date.now() - cachedStatus.timestamp < this.CACHE_EXPIRATION_MS
    ) {
      this.logger.log(`User for ${cacheKey} is currently being processed.`);
      throw new ConflictException('User creation is already in progress.');
    }

    // 3. Lock and create the user.
    this.userCreationCache.set(cacheKey, {
      status: 'PROCESSING',
      timestamp: Date.now(),
    });

    try {
      // Re-check in case another process created it between our first check and acquiring the lock.
      user = await this.prisma.user.findUnique({
        where: {
          snsId_provider: {
            snsId: profile.snsId,
            provider: profile.provider,
          },
        },
      });

      if (!user) {
        this.logger.log(`User for ${cacheKey} not found. Creating new user.`);
        user = await this.prisma.user.create({
          data: {
            snsId: profile.snsId,
            provider: profile.provider,
            email: profile.email,
            name: profile.name,
          },
        });
      }

      // Mark as completed and remove from cache after a short delay
      this.userCreationCache.set(cacheKey, {
        status: 'COMPLETED',
        timestamp: Date.now(),
      });
      setTimeout(
        () => this.userCreationCache.delete(cacheKey),
        this.CACHE_EXPIRATION_MS,
      );

      return user;
    } catch (error) {
      this.logger.error(`Error processing user for ${cacheKey}:`, error);
      // Remove from cache on error to allow retry
      this.userCreationCache.delete(cacheKey);
      throw error;
    }
  }

  login(user: any) {
    const payload = { sub: user.id.toString(), email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async getUserFromJwt(payload: any) {
    this.logger.debug(
      `[getUserFromJwt] Getting user for payload: ${JSON.stringify(payload)}`,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    // 필요한 정보만 반환 (비밀번호 등 민감 정보 제외)
    if (user) {
      const userForSerialization = {
        ...user,
        id: user.id.toString(),
      };
      this.logger.debug(
        `[getUserFromJwt] User found: ${JSON.stringify(userForSerialization)}`,
      );
      return userForSerialization;
    }
    this.logger.warn(
      `[getUserFromJwt] User not found for payload: ${JSON.stringify(payload)}`,
    );
    return null;
  }
}
