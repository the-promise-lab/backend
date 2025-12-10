import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EndingCollectionItemDto {
  @ApiProperty({ description: '엔딩 ID', example: 1 })
  endingId: number;

  @ApiProperty({ description: '엔딩 제목', example: 'Happy: 사랑과 득근' })
  title: string;

  @ApiPropertyOptional({
    description: '엔딩 이미지 URL (수집되지 않은 경우 null)',
    example: 'https://example.com/image.png',
  })
  imageUrl?: string | null;

  @ApiProperty({ description: '수집 여부', example: true })
  isCollected: boolean;
}

export class EndingCollectionGroupDto {
  @ApiProperty({ description: '캐릭터 그룹 코드', example: 'group_survivors' })
  characterGroupCode: string;

  @ApiProperty({ type: [EndingCollectionItemDto] })
  items: EndingCollectionItemDto[];
}

export class EndingCollectionResponseDto {
  @ApiProperty({ description: '성공 여부', example: true })
  success: boolean;

  @ApiProperty({ type: [EndingCollectionGroupDto] })
  data: EndingCollectionGroupDto[];
}
