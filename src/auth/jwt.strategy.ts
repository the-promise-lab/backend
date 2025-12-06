import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from './auth.service'; // Import AuthService

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name); // Add logger

  constructor(private authService: AuthService) {
    // Inject AuthService
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    this.logger.debug(
      `[validate] Payload received: ${JSON.stringify(payload)}`,
    );
    // payload: { sub: user.id, email: user.email }
    const user = await this.authService.getUserFromJwt(payload);
    if (!user) {
      this.logger.warn(
        `[validate] User not found for payload: ${JSON.stringify(payload)}`,
      );
      throw new UnauthorizedException();
    }
    this.logger.debug(`[validate] User found: ${JSON.stringify(user)}`);
    return user; // Return the full user object
  }
}
