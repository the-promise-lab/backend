import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { BagDto } from './bag.dto';
import { StoreSectionDto } from './store-section.dto';

export class SetupInfoDto {
  @ApiProperty({ type: [BagDto], description: '가방 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BagDto)
  bags: BagDto[];

  @ApiProperty({ type: [StoreSectionDto], description: '상점 섹션 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreSectionDto)
  storeSections: StoreSectionDto[];
}
