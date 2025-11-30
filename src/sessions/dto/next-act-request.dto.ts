import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SessionStatType {
  LIFE_POINT = 'LifePoint',
}

export class NextActChoicePayloadDto {
  @ApiProperty({
    example: 1,
    description: '선택한 옵션 ID',
  })
  @IsInt()
  choiceOptionId: number;

  @ApiPropertyOptional({
    example: 10,
    description: '아이템 선택지에서 소비한 아이템 ID',
  })
  @IsOptional()
  @IsInt()
  chosenItemId?: number | null;
}

export class NextActItemChangeDto {
  @ApiProperty({ example: 1, description: '아이템 ID' })
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
  @ApiProperty({
    enum: SessionStatType,
    example: SessionStatType.LIFE_POINT,
    description: '세션 스탯 타입',
  })
  @IsEnum(SessionStatType)
  statType: SessionStatType;

  @ApiProperty({ example: 1, description: '변화량' })
  @IsInt()
  change: number;
}

export class NextActUpdatesDto {
  @ApiPropertyOptional({
    type: [NextActItemChangeDto],
    description: '아이템 변화',
    example: [
      {
        itemId: 1,
        quantityChange: 1,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NextActItemChangeDto)
  itemChanges?: NextActItemChangeDto[];

  @ApiPropertyOptional({
    type: [NextActCharacterStatusChangeDto],
    description: '캐릭터 상태 변화',
    example: [
      {
        characterCode: 'char_hem',
        hpChange: 0,
        mentalChange: 1,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NextActCharacterStatusChangeDto)
  characterStatusChanges?: NextActCharacterStatusChangeDto[];

  @ApiPropertyOptional({
    type: [NextActSessionStatChangeDto],
    description: '세션 통계 변화',
    example: [
      {
        statType: SessionStatType.LIFE_POINT,
        change: -1,
      },
    ],
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
  @ApiPropertyOptional({ example: 10101, description: '직전 Act ID' })
  @IsInt()
  @IsOptional()
  lastActId?: number;

  @ApiPropertyOptional({
    type: NextActChoicePayloadDto,
    description: '선택지 보고 (선택지를 보여준 경우에만 전송)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NextActChoicePayloadDto)
  choice?: NextActChoicePayloadDto;

  @ApiPropertyOptional({
    type: NextActUpdatesDto,
    description: '프론트 처리 업데이트(인벤토리/스탯 변화 보고)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NextActUpdatesDto)
  updates?: NextActUpdatesDto;
}
