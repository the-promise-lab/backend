import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class CharacterDto {
  @ApiProperty({ example: 1, description: '캐릭터 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 'char_hem', description: '캐릭터 코드' })
  @IsString()
  code: string;

  @ApiProperty({
    example: '헴',
    description: '캐릭터 이름',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  name?: string | null;

  @ApiProperty({
    example: 32,
    description: '캐릭터 나이',
    required: false,
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  age?: number | null;

  @ApiProperty({
    example: '득근에 살고 근손실에 죽는 헬스 미친자.',
    description: '캐릭터 설명',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiProperty({
    example: 'char_hem_select.png',
    description: '캐릭터 선택 이미지',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  selectImage?: string | null;

  @ApiProperty({
    example: 'char_hem_portrait.png',
    description: '캐릭터 포트레잇 이미지',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  portraitImage?: string | null;

  @ApiProperty({
    example: 10,
    description: '기본 체력',
    required: false,
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  defaultHp?: number | null;

  @ApiProperty({
    example: 10,
    description: '기본 정신력',
    required: false,
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  defaultMental?: number | null;

  @ApiProperty({
    example: '#593B8F',
    description: '배경 색상',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  bgColor?: string | null;

  @ApiProperty({
    example: '#CC92FB',
    description: '테두리 색상',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  borderColor?: string | null;
}
