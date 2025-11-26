import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionFlowStatus } from './session-flow-status.enum';
import { SessionDayMetaDto } from './session-day-meta.dto';
import { SessionActMetaDto } from './session-act-meta.dto';
import { SessionEventDto } from './session-event.dto';
import { SessionEndingMetaDto } from './session-ending-meta.dto';

/**
 * NextActResponseDto is returned whenever the client requests the next Act bundle.
 */
export class NextActResponseDto {
  @ApiProperty({ example: 'session-abc-123', description: '세션 ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({
    enum: SessionFlowStatus,
    example: SessionFlowStatus.IN_PROGRESS,
  })
  @IsEnum(SessionFlowStatus)
  status: SessionFlowStatus;

  @ApiProperty({
    type: SessionDayMetaDto,
    description: '현재 Day 정보',
    nullable: true,
  })
  @ValidateNested()
  @Type(() => SessionDayMetaDto)
  @IsOptional()
  day: SessionDayMetaDto | null;

  @ApiProperty({
    type: SessionActMetaDto,
    description: '현재 Act 정보',
    nullable: true,
  })
  @ValidateNested()
  @Type(() => SessionActMetaDto)
  @IsOptional()
  act: SessionActMetaDto | null;

  @ApiProperty({ type: [SessionEventDto], description: 'Act 이벤트 리스트' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventDto)
  events: SessionEventDto[];

  @ApiProperty({
    type: SessionEndingMetaDto,
    description: '엔딩 정보',
    nullable: true,
  })
  @ValidateNested()
  @Type(() => SessionEndingMetaDto)
  @IsOptional()
  ending: SessionEndingMetaDto | null;
}
