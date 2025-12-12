import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionReportResponseDto } from './session-report-response.dto';

export class HistoryItemDto {
  @ApiProperty({ description: '세션 ID', example: '1' })
  id: string;

  @ApiProperty({ description: '캐릭터 이름(들)', example: '미리&류부장' })
  characterName: string;

  @ApiProperty({ description: '최종 결과 (등급)', example: 'Good' })
  resultType: string;

  @ApiProperty({ description: 'XP 총합', example: 120 })
  xp: number;

  @ApiProperty({ description: '종료 날짜', example: '25.01.21' })
  date: string;

  @ApiProperty({ description: '종료 시간', example: '14:30' })
  time: string;

  @ApiPropertyOptional({
    description: '캐릭터 구성 이미지 (또는 엔딩 이미지)',
    example: 'https://example.com/image.png',
  })
  characterImageUrl?: string;

  @ApiPropertyOptional({
    description:
      '히스토리 상세 (리포트 데이터). 목록 조회 시에는 제외될 수 있음.',
    type: SessionReportResponseDto,
  })
  playReport?: SessionReportResponseDto;
}

export class HistoryResponseDto {
  @ApiProperty({ description: '성공 여부', example: true })
  success: boolean;

  @ApiProperty({ description: '히스토리 목록', type: [HistoryItemDto] })
  data: HistoryItemDto[];

  @ApiProperty({ description: '총 데이터 수', example: 10 })
  total: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지 당 개수', example: 10 })
  limit: number;
}
