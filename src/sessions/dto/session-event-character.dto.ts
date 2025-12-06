import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * SessionEventCharacterDto describes a character portrait shown in an event.
 */
export class SessionEventCharacterDto {
  @ApiProperty({ example: 'char_hem', description: 'Character code' })
  @IsString()
  characterCode: string;

  @ApiProperty({
    example: 'left',
    description: 'Placement on the stage',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  position: string | null;

  @ApiProperty({
    example: 'angry',
    description: 'Emotion preset',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  emotion: string | null;

  @ApiProperty({
    example:
      'https://21009ea64690489baefd3170429f0a50.kakaoiedge.com/img/character/hb/angry.png',
    description: 'Emotion image URL',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  imageUrl: string | null;

  @ApiProperty({
    example: true,
    description: 'Speaks in this line',
    nullable: true,
  })
  @IsBoolean()
  @IsOptional()
  isSpeaker: boolean | null;
}
