import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, ValidateNested } from 'class-validator';
import type { SessionEventDto } from './session-event.dto';
import { SessionChoiceResultType } from './session-choice-result-type.enum';

function resolveSessionEventDto(): new () => SessionEventDto {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./session-event.dto').SessionEventDto;
}

/**
 * SessionChoiceOutcomeDto describes the result of a specific choice option.
 */
export class SessionChoiceOutcomeDto {
  @ApiProperty({
    enum: SessionChoiceResultType,
    example: SessionChoiceResultType.ACT_END,
  })
  @IsEnum(SessionChoiceResultType)
  resultType: SessionChoiceResultType;

  @ApiProperty({
    description: '후속 이벤트 목록',
    type: 'array',
    items: {
      $ref: '#/components/schemas/SessionEventDto',
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(resolveSessionEventDto)
  events: SessionEventDto[];
}
