import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

/**
 * SessionEventEffectDto captures per-character stat changes.
 */
export class SessionEventEffectDto {
  @ApiProperty({
    example: 'char_hem',
    description: 'Target character code',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  characterCode: string | null;

  @ApiProperty({ example: 'health', description: 'Affected stat type' })
  @IsString()
  effectType: string;

  @ApiProperty({
    example: 1,
    description: 'Delta applied to the stat',
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  change: number | null;

  @ApiProperty({
    example: 101,
    description: 'Post-change value',
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  newValue: number | null;
}
