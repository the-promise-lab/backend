import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthCheckDto } from './common/dto/health-check.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Hello World 메시지 반환',
    description: '기본 환영 메시지를 반환합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '성공적으로 메시지를 반환',
    schema: {
      type: 'string',
      example: 'Hello World!'
    }
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ 
    summary: '서버 상태 확인',
    description: '서버의 현재 상태와 타임스탬프를 반환합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '서버 상태 정보',
    type: HealthCheckDto,
  })
  getHealth(): HealthCheckDto {
    return this.appService.getHealth();
  }

  @Get('debug-sentry')
  @ApiOperation({ 
    summary: 'Sentry 테스트',
    description: 'Sentry 에러 캡처 테스트를 위한 의도적인 에러를 발생시킵니다.'
  })
  @ApiResponse({
    status: 500,
    description: '테스트용 에러',
  })
  getError() {
    throw new Error("My first Sentry error!");
  }
} 