import { ApiProperty } from '@nestjs/swagger';
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
import type { SessionChoiceDto } from './session-choice.dto';
import { SessionEventEffectDto } from './session-event-effect.dto';
import { SessionEventItemChangeDto } from './session-event-item-change.dto';
import { SessionEventSessionEffectDto } from './session-event-session-effect.dto';
import { SessionChoiceResultType } from './session-choice-result-type.enum';

export class SessionChoiceOutcomeDto {
  @ApiProperty({
    enum: SessionChoiceResultType,
    example: SessionChoiceResultType.ACT_END,
  })
  @IsEnum(SessionChoiceResultType)
  resultType: SessionChoiceResultType;

  @ApiProperty({ type: () => SessionEventDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventDto)
  events: SessionEventDto[];
}

function resolveSessionChoiceDto(): new () => SessionChoiceDto {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./session-choice.dto').SessionChoiceDto;
}

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

  @ApiProperty({ example: '헴! 일단 끝까지 좀 들어보입시다.', nullable: true })
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

  @ApiProperty({ example: null, description: '배경 이미지', nullable: true })
  @IsString()
  @IsOptional()
  bgImage: string | null;

  @ApiProperty({ example: null, description: '장면 효과', nullable: true })
  @IsString()
  @IsOptional()
  sceneEffect: string | null;

  @ApiProperty({ example: null, description: '배경음', nullable: true })
  @IsString()
  @IsOptional()
  bgm: string | null;

  @ApiProperty({ example: null, description: '배경음 볼륨', nullable: true })
  @IsInt()
  @IsOptional()
  bgmVolume: number | null;

  @ApiProperty({ example: null, description: '효과음', nullable: true })
  @IsString()
  @IsOptional()
  se: string | null;

  @ApiProperty({ example: null, description: '효과음 볼륨', nullable: true })
  @IsInt()
  @IsOptional()
  seVolume: number | null;

  @ApiProperty({
    example: false,
    description: '효과음 반복 여부',
    nullable: true,
  })
  @IsOptional()
  @IsBoolean()
  seLoop: boolean | null;

  @ApiProperty({
    type: resolveSessionChoiceDto,
    description: '선택지 정보',
    nullable: true,
  })
  @ValidateNested()
  @Type(resolveSessionChoiceDto)
  @IsOptional()
  choice: SessionChoiceDto | null;

  @ApiProperty({
    description: '선택지 결과 매핑',
    required: false,
    type: () => SessionChoiceOutcomeDto,
    isArray: false,
  })
  @IsOptional()
  choiceResults?: Record<string, SessionChoiceOutcomeDto>;

  @ApiProperty({
    type: [SessionEventEffectDto],
    description: '캐릭터 스탯 변화',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventEffectDto)
  effects: SessionEventEffectDto[] | null;

  @ApiProperty({
    type: [SessionEventItemChangeDto],
    description: '아이템 변화',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventItemChangeDto)
  itemChanges: SessionEventItemChangeDto[] | null;

  @ApiProperty({
    type: [SessionEventSessionEffectDto],
    description: '세션 스탯 변화',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventSessionEffectDto)
  sessionEffects: SessionEventSessionEffectDto[] | null;
}
