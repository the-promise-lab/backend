import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionReportTab } from './session-report-tab.enum';

class SessionReportSessionMetaDto {
  @ApiProperty({ example: 1, description: '게임 세션 ID' })
  id: number;

  @ApiProperty({ description: '사용자 이름(카카오 로그인명)' })
  userName: string;

  @ApiPropertyOptional({ description: '캐릭터 그룹 코드' })
  characterGroupCode?: string | null;

  @ApiPropertyOptional({ description: '캐릭터 그룹 이름' })
  characterGroupName?: string | null;

  @ApiProperty({ example: 'GAME_END', description: '세션 상태' })
  status: string;

  @ApiPropertyOptional({
    description: '종료 시각',
    type: String,
    format: 'date-time',
  })
  endedAt?: Date | null;

  @ApiProperty({ description: '생성 시각', type: String, format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({
    description: '총 플레이 시간(초)',
    example: 5400,
  })
  totalPlayTimeSeconds?: number | null;

  @ApiProperty({ example: 0, description: 'LifePoint 최종값' })
  lifePoint: number;
}

class SessionReportEndingDto {
  @ApiPropertyOptional({ description: '엔딩 ID' })
  endingId?: number | null;

  @ApiPropertyOptional({ description: '엔딩 인덱스' })
  endingIndex?: number | null;

  @ApiPropertyOptional({ description: '엔딩 제목' })
  title?: string | null;

  @ApiPropertyOptional({ description: '엔딩 등급' })
  grade?: string | null;

  @ApiPropertyOptional({ description: '엔딩 이미지' })
  image?: string | null;
}

class SessionReportCharacterDto {
  @ApiProperty({ description: '캐릭터 코드' })
  characterCode: string;

  @ApiProperty({ description: '캐릭터 이름' })
  name: string;

  @ApiProperty({ description: '최종 HP' })
  finalHp: number;

  @ApiProperty({ description: '최종 Mental' })
  finalMental: number;

  @ApiPropertyOptional({ description: '최대 HP' })
  maxHp?: number | null;

  @ApiPropertyOptional({ description: '최대 Mental' })
  maxMental?: number | null;

  @ApiProperty({ description: '생존 상태 예: ALIVE/DEAD' })
  survivalStatus: string;
}

class SessionReportHiddenStatDto {
  @ApiProperty({ description: '히든 스탯 코드' })
  statCode: string;

  @ApiProperty({ description: '히든 스탯 이름' })
  name: string;

  @ApiProperty({ description: '값' })
  value: number;

  @ApiProperty({ description: '최대값' })
  maxValue: number;

  @ApiPropertyOptional({ description: '설명' })
  description?: string | null;

  @ApiPropertyOptional({ description: '등급' })
  grade?: string | null;
}

class SessionReportBagDto {
  @ApiProperty({ description: '가방 ID' })
  bagId: number;

  @ApiProperty({ description: '가방 이름' })
  bagName: string;

  @ApiProperty({ description: '가방 용량' })
  capacity: number;

  @ApiPropertyOptional({ description: '사용 용량' })
  usedCapacity?: number | null;

  @ApiPropertyOptional({ description: '사용률(%)' })
  usageRate?: number | null;

  @ApiPropertyOptional({ description: '가방 등급' })
  grade?: string | null;

  @ApiPropertyOptional({ description: '가방 효율(%)' })
  efficiency?: number | null;

  @ApiPropertyOptional({ description: '가방 이미지 URL' })
  bagImageUrl?: string | null;

  @ApiPropertyOptional({ description: '담은 아이템 개수' })
  ownedItemCount?: number | null;

  @ApiPropertyOptional({ description: '실제 사용한 아이템 개수' })
  usedItemCount?: number | null;
}

class SessionReportInventoryItemDto {
  @ApiProperty({ description: '아이템 ID' })
  itemId: number;

  @ApiProperty({ description: '아이템 이름' })
  itemName: string;

  @ApiProperty({ description: '남은 수량' })
  quantity: number;

  @ApiPropertyOptional({ description: '아이템 이미지 URL' })
  imageUrl?: string | null;
}

class SessionReportPointDto {
  @ApiProperty({ description: 'GOOD/BAD 등 포인트 유형' })
  type: string;

  @ApiProperty({ description: '카테고리' })
  category: string;

  @ApiProperty({ description: '제목' })
  title: string;

  @ApiProperty({ description: '설명' })
  description: string;

  @ApiPropertyOptional({ description: 'Day 번호' })
  dayNumber?: number | null;

  @ApiPropertyOptional({ description: 'Act ID' })
  actId?: number | null;

  @ApiProperty({ description: '점수' })
  points: number;
}

class SessionReportExperienceBreakdownDto {
  @ApiPropertyOptional({ description: '엔딩 등 보상으로 획득한 경험치 총합' })
  total?: number | null;
}

class SessionReportFinalStatsDto {
  @ApiProperty({ description: 'LifePoint 최종값' })
  lifePoint: number;

  @ApiPropertyOptional({ description: '생존 일수' })
  survivalDays?: number | null;

  @ApiPropertyOptional({ description: '총 선택 횟수' })
  totalChoices?: number | null;

  @ApiPropertyOptional({ description: 'GOOD 선택 수' })
  goodChoices?: number | null;

  @ApiPropertyOptional({ description: 'BAD 선택 수' })
  badChoices?: number | null;

  @ApiPropertyOptional({ description: 'Neutral 선택 수' })
  neutralChoices?: number | null;
}

class SessionReportResultDto {
  @ApiProperty({ type: SessionReportEndingDto })
  ending: SessionReportEndingDto;

  @ApiProperty({ type: SessionReportFinalStatsDto })
  finalStats: SessionReportFinalStatsDto;

  @ApiProperty({ type: [SessionReportCharacterDto] })
  characters: SessionReportCharacterDto[];

  @ApiProperty({ type: [SessionReportHiddenStatDto] })
  hiddenStats: SessionReportHiddenStatDto[];

  @ApiProperty({ type: SessionReportBagDto })
  survivalBag: SessionReportBagDto;

  @ApiPropertyOptional({ type: [SessionReportInventoryItemDto] })
  inventory?: SessionReportInventoryItemDto[];

  @ApiProperty({ type: [SessionReportPointDto] })
  points: SessionReportPointDto[];

  @ApiProperty({ type: SessionReportExperienceBreakdownDto })
  experiencePoints: SessionReportExperienceBreakdownDto;
}

class SessionReportDataDto {
  @ApiProperty({ type: SessionReportSessionMetaDto })
  session: SessionReportSessionMetaDto;

  @ApiProperty({ enum: SessionReportTab })
  tab: SessionReportTab;

  @ApiProperty({ type: SessionReportResultDto })
  result: SessionReportResultDto;
}

/**
 * SessionReportResponseDto represents the result report API response.
 */
export class SessionReportResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: SessionReportDataDto })
  data: SessionReportDataDto;
}
