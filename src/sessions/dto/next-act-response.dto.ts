import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionFlowStatus } from './session-flow-status.enum';
import { SessionDayMetaDto } from './session-day-meta.dto';
import { SessionActMetaDto } from './session-act-meta.dto';
import { SessionEventDto } from './session-event.dto';
import { SessionEndingMetaDto } from './session-ending-meta.dto';

/**
 * NextActResponseDto is returned whenever the client requests the next Act bundle.
 */
export class NextActResponseDto {
  @ApiProperty({ example: 'session-abc-123', description: '세션 ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({
    enum: SessionFlowStatus,
    example: SessionFlowStatus.IN_PROGRESS,
  })
  @IsEnum(SessionFlowStatus)
  status: SessionFlowStatus;

  @ApiProperty({
    type: SessionDayMetaDto,
    description: '현재 Day 정보',
    nullable: true,
  })
  @ValidateNested()
  @Type(() => SessionDayMetaDto)
  @IsOptional()
  day: SessionDayMetaDto | null;

  @ApiProperty({
    type: SessionActMetaDto,
    description: '현재 Act 정보',
    nullable: true,
  })
  @ValidateNested()
  @Type(() => SessionActMetaDto)
  @IsOptional()
  act: SessionActMetaDto | null;

  @ApiProperty({
    type: [SessionEventDto],
    description: 'Act 이벤트 리스트',
    example: [
      {
        eventId: 10201007,
        type: 'ItemChoice',
        script: '무엇을 마실까?',
        characters: [],
        bgImage: null,
        sceneEffect: null,
        bgm: null,
        bgmVolume: null,
        se: null,
        seVolume: null,
        seLoop: null,
        choice: {
          title: '목이 마르다',
          description: '무엇을 마실까?',
          thumbnail: '썸네일.png',
          type: 'ItemChoice',
          options: [
            {
              choiceOptionId: 25,
              text: '25',
              itemCategoryId: null,
              itemId: null,
              itemName: null,
              itemImage: null,
              quantity: null,
              isSelectable: false,
            },
            {
              choiceOptionId: 28,
              text: '마실 게 없어서 그냥 참는다',
              itemCategoryId: null,
              itemId: null,
              itemName: null,
              itemImage: null,
              quantity: null,
              isSelectable: true,
            },
          ],
          fallback: null,
          outcomes: {
            '25': {
              resultType: 'ACT_END',
              events: [
                {
                  eventId: 10201008,
                  type: 'Simple',
                  script: '헴! 여기 있심더!',
                  characters: [],
                  bgImage: null,
                  sceneEffect: null,
                  bgm: null,
                  bgmVolume: null,
                  se: null,
                  seVolume: null,
                  seLoop: null,
                  choice: null,
                  effects: null,
                  itemChanges: null,
                  sessionEffects: null,
                },
              ],
            },
          },
        },
        effects: null,
        itemChanges: null,
        sessionEffects: null,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionEventDto)
  events: SessionEventDto[];

  @ApiProperty({
    type: SessionEndingMetaDto,
    description: '엔딩 정보',
    nullable: true,
    example: null,
  })
  @ValidateNested()
  @Type(() => SessionEndingMetaDto)
  @IsOptional()
  ending: SessionEndingMetaDto | null;
}
