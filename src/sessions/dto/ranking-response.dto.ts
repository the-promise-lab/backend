import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RankingMyScoreDto {
  @ApiProperty({ description: '내 순위', example: 5 })
  rank: number;

  @ApiProperty({ description: '전체 사용자(세션) 수', example: 100 })
  totalUsers: number;

  @ApiProperty({ description: '획득 XP (HP + SP + LifePoint)', example: 350 })
  xp: number;
}

export class RankingCharacterResultDto {
  @ApiPropertyOptional({ description: '캐릭터 그룹 이름', example: '생존자들' })
  characterGroupName?: string;

  @ApiProperty({ description: '캐릭터 이름(들)', example: '철수, 영희' })
  characterNames: string;

  @ApiProperty({ description: '결과 텍스트 (엔딩 제목 등)', example: '생존' })
  result: string;

  @ApiPropertyOptional({ description: '엔딩 등급', example: 'Good' })
  grade?: string;

  @ApiPropertyOptional({
    description: '결과 이미지 URL',
    example: 'https://example.com/image.png',
  })
  imageUrl?: string;
}

export class RankingUserDto {
  @ApiProperty({ description: '순위', example: 1 })
  rank: number;

  @ApiProperty({ description: '닉네임', example: 'User123' })
  nickname: string;

  @ApiProperty({ description: 'XP', example: 500 })
  xp: number;

  @ApiPropertyOptional({
    description: '현재 조회중인 세션(나)인지 여부',
    example: true,
  })
  isCurrentUser?: boolean;
}

export class RankingDataDto {
  @ApiProperty({ type: RankingMyScoreDto })
  myScore: RankingMyScoreDto;

  @ApiProperty({ type: [RankingCharacterResultDto] })
  characters: RankingCharacterResultDto[];

  @ApiProperty({ type: [RankingUserDto] })
  rankings: RankingUserDto[];
}

export class RankingResponseDto {
  @ApiProperty({ description: '성공 여부', example: true })
  success: boolean;

  @ApiProperty({ type: RankingDataDto })
  data: RankingDataDto;
}
