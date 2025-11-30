import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionChoiceOptionDto } from './session-choice-option.dto';
import { SessionChoiceFallbackDto } from './session-choice-fallback.dto';
import { SessionChoiceType } from './session-choice-type.enum';
import { SessionChoiceOutcomeDto } from './session-event.dto';

/**
 * SessionChoiceDto bundles metadata and selectable options for the frontend.
 */
export class SessionChoiceDto {
  @ApiProperty({ example: '공동 관리라고?', description: '선택지 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: '대피소에서 물자를 공동 관리할지 결정한다.',
    description: '설명',
  })
  @IsString()
  @IsOptional()
  description: string | null;

  @ApiPropertyOptional({
    example: 'thumbnail.png',
    description: '선택지 썸네일',
  })
  @IsString()
  @IsOptional()
  thumbnail: string | null;

  @ApiProperty({ enum: SessionChoiceType, example: SessionChoiceType.STORY })
  @IsEnum(SessionChoiceType)
  type: SessionChoiceType;

  @ApiProperty({ type: [SessionChoiceOptionDto], description: '선택지 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionChoiceOptionDto)
  options: SessionChoiceOptionDto[];

  @ApiPropertyOptional({
    type: SessionChoiceFallbackDto,
    description: '아이템 미보유 시 기본 선택',
  })
  @ValidateNested()
  @Type(() => SessionChoiceFallbackDto)
  @IsOptional()
  fallback: SessionChoiceFallbackDto | null;

  @ApiPropertyOptional({
    description: '선택지별 결과 이벤트',
    example: {
      '25': {
        resultType: 'ACT_END',
        events: [
          {
            eventId: 10201008,
            type: 'Simple',
            script: '헴! 여기 있심더!',
            characters: [],
            bgImage: null,
            sceneEffect: null,
            bgm: null,
            bgmVolume: null,
            se: null,
            seVolume: null,
            seLoop: null,
            choice: null,
            effects: null,
            itemChanges: null,
            sessionEffects: null,
          },
        ],
      },
    },
    additionalProperties: {
      $ref: getSchemaPath(SessionChoiceOutcomeDto),
    },
  })
  @IsOptional()
  outcomes?: Record<string, SessionChoiceOutcomeDto>;
}
