import { Injectable } from '@nestjs/common';
import { HealthCheckDto } from './common/dto/health-check.dto';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): HealthCheckDto {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
} 