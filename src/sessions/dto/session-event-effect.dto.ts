import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, ValidateIf } from 'class-validator';

/**
 * SessionEventEffectDto captures per-character stat changes.
 */
export class SessionEventEffectDto {
  @ApiProperty({
    example: 'char_hem',
    description: 'Target character code',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  characterCode: string | null;

  @ApiProperty({ example: 'health', description: 'Affected stat type' })
  @IsString()
  effectType: string;

  @ApiProperty({
    example: 1,
    description: 'Delta applied to the stat',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  change: number | null;

  @ApiProperty({
    example: 101,
    description: 'Post-change value',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  newValue: number | null;
}
