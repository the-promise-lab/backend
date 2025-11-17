import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { BagDto } from './bag.dto';
import { StoreSectionDto } from './store-section.dto';

export class SetupInfoDto {
  @ApiProperty({ type: [BagDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BagDto)
  bags: BagDto[];

  @ApiProperty({ type: [StoreSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreSectionDto)
  storeSections: StoreSectionDto[];
}
