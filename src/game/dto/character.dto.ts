import { ApiProperty } from '@nestjs/swagger';

export class CharacterDto {
  @ApiProperty()
  id: bigint;

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
  defaultSp?: number | null;

  @ApiProperty({ required: false, nullable: true })
  characterGroupId?: bigint | null;

  @ApiProperty({ required: false, nullable: true })
  bgColor?: string | null;
  
  @ApiProperty({ required: false, nullable: true })
  borderColor?: string | null;
}
