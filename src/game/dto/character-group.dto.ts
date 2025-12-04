import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class CharacterGroupDto {
  @ApiProperty({ example: 1, description: '캐릭터 그룹 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 'duo_hem_bang', description: '캐릭터 그룹 코드' })
  @IsString()
  code: string;

  @ApiProperty({
    example: '재난 속에서 서로를 의지하며 살아남아야 하는 헬스 광인들',
    description: '캐릭터 그룹 이름',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'duo_hem_bang.png',
    description: '캐릭터 그룹 선택 이미지',
  })
  @IsString()
  groupSelectImage: string;

  @ApiProperty({
    example: 8,
    description: '서든데스 엔딩 인덱스',
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  deathEndingIndex: number | null;

  @ApiProperty({ example: 1, description: '프롤로그 ID', nullable: true })
  @IsInt()
  @IsOptional()
  prologActId: number | null;

  @ApiProperty({
    example: '평범한 가족',
    description: '캐릭터 그룹 설명',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description: string | null;
}
