import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NextActChoicePayloadDto {
  @ApiProperty({ example: 1, description: '선택한 옵션 ID' })
  @IsInt()
  choiceOptionId: number;

  @ApiProperty({ example: 10, description: '사용한 아이템 ID', nullable: true })
  @IsInt()
  @IsOptional()
  chosenItemId: number | null;
}

export class NextActItemChangeDto {
  @ApiProperty({ example: 97, description: '아이템 ID' })
  @IsInt()
  itemId: number;

  @ApiProperty({ example: 1, description: '변화량' })
  @IsInt()
  quantityChange: number;
}

export class NextActCharacterStatusChangeDto {
  @ApiProperty({ example: 'char_hem', description: '캐릭터 코드' })
  @IsString()
  characterCode: string;

  @ApiProperty({ example: 0, description: 'HP 변화량' })
  @IsInt()
  hpChange: number;

  @ApiProperty({ example: 1, description: 'Mental 변화량' })
  @IsInt()
  mentalChange: number;
}

export class NextActSessionStatChangeDto {
  @ApiProperty({ example: 'LifePoint', description: '세션 스탯 타입' })
  @IsString()
  statType: string;

  @ApiProperty({ example: 1, description: '변화량' })
  @IsInt()
  change: number;
}

export class NextActUpdatesDto {
  @ApiProperty({
    type: [NextActItemChangeDto],
    description: '아이템 변화',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NextActItemChangeDto)
  itemChanges?: NextActItemChangeDto[];

  @ApiProperty({
    type: [NextActCharacterStatusChangeDto],
    description: '캐릭터 상태 변화',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NextActCharacterStatusChangeDto)
  characterStatusChanges?: NextActCharacterStatusChangeDto[];

  @ApiProperty({
    type: [NextActSessionStatChangeDto],
    description: '세션 통계 변화',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NextActSessionStatChangeDto)
  sessionStatChanges?: NextActSessionStatChangeDto[];
}

/**
 * NextActRequestDto represents the payload sent by the frontend when progressing the story.
 */
export class NextActRequestDto {
  @ApiProperty({ example: 10101, description: '직전 Act ID', nullable: true })
  @IsOptional()
  @IsInt()
  lastActId?: number;

  @ApiProperty({
    type: NextActChoicePayloadDto,
    description: '선택지 보고',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NextActChoicePayloadDto)
  choice?: NextActChoicePayloadDto;

  @ApiProperty({
    type: NextActUpdatesDto,
    description: '프론트 처리 업데이트',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NextActUpdatesDto)
  updates?: NextActUpdatesDto;
}
