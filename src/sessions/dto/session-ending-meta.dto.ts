import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

/**
 * SessionEndingMetaDto provides high-level ending information.
 */
export class SessionEndingMetaDto {
  @ApiProperty({ example: 1, description: '엔딩 ID' })
  @IsInt()
  endingId: number;

  @ApiProperty({ example: 1, description: '엔딩 인덱스' })
  @IsInt()
  endingIndex: number;

  @ApiProperty({ example: '해피엔딩a', description: '엔딩 제목' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'ending_1.PNG',
    description: '엔딩 이미지',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  endingImage: string | null;
}
