import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionFlowStatus } from './session-flow-status.enum';
import { SessionEndingMetaDto } from './session-ending-meta.dto';
import { SessionChoiceResultType } from './session-choice-result-type.enum';

class SessionReportCharacterStatDto {
  @ApiProperty({ example: 'char_hem', description: '캐릭터 코드' })
  @IsString()
  characterCode: string;

  @ApiProperty({ example: 100, description: '최종 HP' })
  @IsInt()
  finalHp: number;

  @ApiProperty({ example: 101, description: '최종 Mental' })
  @IsInt()
  finalMental: number;
}

class SessionReportBagUsageDto {
  @ApiProperty({ example: 1, description: '가방 ID' })
  @IsInt()
  bagId: number;

  @ApiProperty({ example: '기본 가방', description: '가방 이름' })
  @IsString()
  bagName: string;

  @ApiProperty({ example: 25, description: '사용량' })
  @IsInt()
  usedCapacity: number;

  @ApiProperty({ example: 30, description: '총 용량' })
  @IsInt()
  totalCapacity: number;
}

class SessionReportItemDto {
  @ApiProperty({ example: 97, description: '아이템 ID' })
  @IsInt()
  itemId: number;

  @ApiProperty({ example: '[형빈의 리더십]', description: '아이템 이름' })
  @IsString()
  itemName: string;

  @ApiProperty({ example: 1, description: '최종 보유 수량' })
  @IsInt()
  quantity: number;
}

class SessionReportHistoryEntryDto {
  @ApiProperty({ example: 10101, description: 'Act ID' })
  @IsInt()
  actId: number;

  @ApiProperty({ example: 1, description: '선택지 ID', nullable: true })
  @IsOptional()
  @IsInt()
  choiceOptionId: number | null;

  @ApiProperty({
    enum: SessionChoiceResultType,
    example: SessionChoiceResultType.ACT_END,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(SessionChoiceResultType)
  resultType: SessionChoiceResultType | null;
}

/**
 * SessionReportDto summarizes the entire run for post-game review.
 */
export class SessionReportDto {
  @ApiProperty({ example: 'session-abc-123', description: '세션 ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ enum: SessionFlowStatus, example: SessionFlowStatus.GAME_END })
  @IsEnum(SessionFlowStatus)
  status: SessionFlowStatus;

  @ApiProperty({ example: 3, description: '최종 Life Point' })
  @IsInt()
  lifePoint: number;

  @ApiProperty({
    type: SessionReportBagUsageDto,
    description: '가방 사용 정보',
    nullable: true,
  })
  @ValidateNested()
  @Type(() => SessionReportBagUsageDto)
  @IsOptional()
  bagUsage: SessionReportBagUsageDto | null;

  @ApiProperty({
    type: [SessionReportCharacterStatDto],
    description: '캐릭터 최종 스탯',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionReportCharacterStatDto)
  characterStats: SessionReportCharacterStatDto[];

  @ApiProperty({ type: [SessionReportItemDto], description: '최종 인벤토리' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionReportItemDto)
  finalItems: SessionReportItemDto[];

  @ApiProperty({
    type: [SessionReportHistoryEntryDto],
    description: '선택 히스토리',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionReportHistoryEntryDto)
  history: SessionReportHistoryEntryDto[];

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
