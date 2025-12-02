import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { event_eventType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionEventCharacterDto } from './session-event-character.dto';
import { SessionChoiceDto } from './session-choice.dto';
import { SessionEventEffectDto } from './session-event-effect.dto';
import { SessionEventItemChangeDto } from './session-event-item-change.dto';
import { SessionEventSessionEffectDto } from './session-event-session-effect.dto';

/**
 * SessionEventDto captures a single UI event rendered on the client.
 */
export class SessionEventDto {
  @ApiProperty({ example: 10101001, description: '이벤트 ID' })
  @IsInt()
  eventId: number;

  @ApiProperty({ enum: event_eventType, example: event_eventType.Simple })
  @IsEnum(event_eventType)
  type: event_eventType;

  @ApiPropertyOptional({
    example: '헴! 일단 끝까지 좀 들어보입시다.',
    description: '대사/내레이션',
  })
  @IsString()
  @IsOptional()
  script: string | null;

  @ApiProperty({
    type: [SessionEventCharacterDto],
    description: '대사 캐릭터 목록',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventCharacterDto)
  characters: SessionEventCharacterDto[];

  @ApiPropertyOptional({ example: null, description: '배경 이미지' })
  @IsString()
  @IsOptional()
  bgImage: string | null;

  @ApiPropertyOptional({ example: null, description: '장면 효과' })
  @IsString()
  @IsOptional()
  sceneEffect: string | null;

  @ApiPropertyOptional({ example: null, description: '배경음' })
  @IsString()
  @IsOptional()
  bgm: string | null;

  @ApiPropertyOptional({ example: null, description: '배경음 볼륨' })
  @IsInt()
  @IsOptional()
  bgmVolume: number | null;

  @ApiPropertyOptional({ example: null, description: '효과음' })
  @IsString()
  @IsOptional()
  se: string | null;

  @ApiPropertyOptional({ example: null, description: '효과음 볼륨' })
  @IsInt()
  @IsOptional()
  seVolume: number | null;

  @ApiPropertyOptional({
    example: false,
    description: '효과음 반복 여부',
  })
  @IsOptional()
  @IsBoolean()
  seLoop: boolean | null;

  @ApiPropertyOptional({
    type: () => SessionChoiceDto,
    description: '선택지 정보',
  })
  @ValidateNested()
  @Type(() => SessionChoiceDto)
  @IsOptional()
  choice: SessionChoiceDto | null;

  @ApiPropertyOptional({
    type: [SessionEventEffectDto],
    description: '캐릭터 스탯 변화',
    example: [
      {
        characterCode: 'char_hem',
        effectType: 'health',
        change: 1,
        newValue: 101,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventEffectDto)
  effects: SessionEventEffectDto[] | null;

  @ApiPropertyOptional({
    type: [SessionEventItemChangeDto],
    description: '아이템 변화',
    example: [
      {
        itemId: 97,
        itemName: '생수',
        quantityChange: 1,
        newQuantity: 2,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventItemChangeDto)
  itemChanges: SessionEventItemChangeDto[] | null;

  @ApiPropertyOptional({
    type: [SessionEventSessionEffectDto],
    description: '세션 스탯 변화',
    example: [
      {
        effectType: 'LIFE_POINT',
        change: -1,
        newValue: 2,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventSessionEffectDto)
  sessionEffects: SessionEventSessionEffectDto[] | null;
}
