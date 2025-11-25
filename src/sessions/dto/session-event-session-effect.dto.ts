import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, ValidateIf } from 'class-validator';

/**
 * SessionEventSessionEffectDto contains session-wide stat adjustments.
 */
export class SessionEventSessionEffectDto {
  @ApiProperty({ example: 'LifePoint', description: '세션 통계 종류' })
  @IsString()
  effectType: string;

  @ApiProperty({ example: 1, description: '변동 값' })
  @IsInt()
  change: number;

  @ApiProperty({ example: 5, description: '변경 후 값', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  newValue: number | null;
}
