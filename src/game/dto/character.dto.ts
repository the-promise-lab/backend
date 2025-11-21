import { ApiProperty } from '@nestjs/swagger';

export class CharacterDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty({ required: false, nullable: true })
  name?: string | null;

  @ApiProperty({ required: false, nullable: true })
  age?: number | null;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @ApiProperty({ required: false, nullable: true })
  selectImage?: string | null;

  @ApiProperty({ required: false, nullable: true })
  portraitImage?: string | null;

  @ApiProperty({ required: false, nullable: true })
  defaultHp?: number | null;

  @ApiProperty({ required: false, nullable: true })
  defaultMental?: number | null;

  @ApiProperty({ required: false, nullable: true })
  bgColor?: string | null;
  
  @ApiProperty({ required: false, nullable: true })
  borderColor?: string | null;
}
