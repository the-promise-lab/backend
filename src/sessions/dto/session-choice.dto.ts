import { ApiProperty } from '@nestjs/swagger';
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

/**
 * SessionChoiceDto bundles metadata and selectable options for the frontend.
 */
export class SessionChoiceDto {
  @ApiProperty({ example: '공동 관리라고?', description: '선택지 제목' })
  @IsString()
  title: string;

  @ApiProperty({
    example: '대피소에서 물자를 공동 관리할지 결정한다.',
    description: '설명',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description: string | null;

  @ApiProperty({
    example: 'thumbnail.png',
    description: '선택지 썸네일',
    nullable: true,
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

  @ApiProperty({
    type: SessionChoiceFallbackDto,
    description: '아이템 미보유 시 기본 선택',
    nullable: true,
  })
  @ValidateNested()
  @Type(() => SessionChoiceFallbackDto)
  @IsOptional()
  fallback: SessionChoiceFallbackDto | null;
}
