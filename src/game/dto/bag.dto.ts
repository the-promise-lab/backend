import { ApiProperty } from '@nestjs/swagger';

export class BagDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  image: string;
  @ApiProperty()
  capacity: number;
  @ApiProperty()
  description: string;
}
