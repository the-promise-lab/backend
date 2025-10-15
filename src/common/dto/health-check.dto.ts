import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckDto {
  @ApiProperty({
    description: '서버 상태',
    example: 'OK',
    enum: ['OK', 'ERROR'],
  })
  status: string;

  @ApiProperty({
    description: '현재 시간 (ISO 8601 형식)',
    example: '2025-07-22T12:32:05.019Z',
    format: 'date-time',
  })
  timestamp: string;
}
