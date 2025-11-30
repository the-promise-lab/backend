import { Injectable } from '@nestjs/common';
import { choiceOption_resultType } from '@prisma/client';
import { SessionChoiceResultType } from '../dto/session-choice-result-type.enum';
import { SessionEventDto } from '../dto/session-event.dto';
import {
  ChoiceOptionRecord,
  EventAssembler,
  InventoryItemSummary,
} from './event-assembler';

export interface MapChoiceResultsParams {
  readonly choiceOptions: ChoiceOptionRecord[];
  readonly inventoryItems: InventoryItemSummary[];
}

export interface ChoiceResultPayload {
  readonly resultType: SessionChoiceResultType;
  readonly events: SessionEventDto[];
}

/**
 * ChoiceResultMapper maps DB choice nodes into frontend-friendly structures.
 */
@Injectable()
export class ChoiceResultMapper {
  constructor(private readonly eventAssembler: EventAssembler) {}

  async mapChoiceResults(
    params: MapChoiceResultsParams,
  ): Promise<Record<string, ChoiceResultPayload>> {
    const optionIds = params.choiceOptions.map((option) => option.id);
    const chainMap = await this.eventAssembler.buildChoiceOptionEventChains({
      choiceOptionIds: optionIds,
      inventoryItems: params.inventoryItems,
    });

    const entries = await Promise.all(
      params.choiceOptions.map(async (option) => {
        let events =
          chainMap[option.id] ??
          (option.nextEventId
            ? await this.eventAssembler.buildEventChain(option.nextEventId)
            : []);

        return [
          option.id.toString(),
          {
            resultType: this.mapResultType(option.resultType),
            events,
          },
        ] as const;
      }),
    );

    return Object.fromEntries(entries);
  }

  private mapResultType(
    resultType: choiceOption_resultType,
  ): SessionChoiceResultType {
    switch (resultType) {
      case choiceOption_resultType.DAY_END:
        return SessionChoiceResultType.DAY_END;
      case choiceOption_resultType.GAME_END:
        return SessionChoiceResultType.GAME_END;
      case choiceOption_resultType.GAME_OVER:
        return SessionChoiceResultType.GAME_OVER;
      case choiceOption_resultType.CONTINUE:
      default:
        return SessionChoiceResultType.ACT_END;
    }
  }
}
