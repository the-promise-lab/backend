import { Injectable } from '@nestjs/common';
import {
  Prisma,
  choiceOption_optionType,
  choiceOption_resultType,
  event_eventType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionEventDto } from '../dto/session-event.dto';
import { SessionEventCharacterDto } from '../dto/session-event-character.dto';
import { SessionEventEffectDto } from '../dto/session-event-effect.dto';
import { SessionEventItemChangeDto } from '../dto/session-event-item-change.dto';
import { SessionEventSessionEffectDto } from '../dto/session-event-session-effect.dto';
import { SessionChoiceDto } from '../dto/session-choice.dto';
import { SessionChoiceOptionDto } from '../dto/session-choice-option.dto';
import { SessionChoiceType } from '../dto/session-choice-type.enum';

export interface ChoiceOptionRecord {
  readonly id: number;
  readonly resultType: choiceOption_resultType;
  readonly nextEventId: number | null;
}

export interface InventoryItemSummary {
  readonly itemId: number;
  readonly quantity: number;
  readonly categoryIds: number[];
}

const EVENT_RELATIONS = {
  eventDialog: {
    include: {
      eventDialogCharacter: {
        include: {
          character: true,
        },
      },
    },
  },
  eventChoice: true,
  eventStatus: {
    include: {
      eventStatusEffect: {
        include: {
          character: true,
        },
      },
      item: true,
    },
  },
  eventSimpleText: true,
  choiceOption: {
    orderBy: { optionOrder: 'asc' },
    include: {
      itemCategory: true,
    },
  },
} as const;

export const EVENT_WITH_RELATIONS = {
  include: EVENT_RELATIONS,
} satisfies Prisma.eventDefaultArgs;

type EventWithRelations = Prisma.eventGetPayload<typeof EVENT_WITH_RELATIONS>;

type ActEventWithRelations = Prisma.actEventGetPayload<{
  include: { event: typeof EVENT_WITH_RELATIONS };
}>;

export interface BuildActEventsParams {
  readonly actEventRecords: ActEventWithRelations[];
  readonly inventoryItems: InventoryItemSummary[];
}

export interface BuildActEventsResult {
  readonly events: SessionEventDto[];
  readonly choiceOptionMap: Record<number, ChoiceOptionRecord[]>;
}

/**
 * EventAssembler converts raw DB rows into transport-friendly event DTOs.
 */
@Injectable()
export class EventAssembler {
  constructor(private readonly prisma: PrismaService) {}

  async buildActEvents(
    params: BuildActEventsParams,
  ): Promise<BuildActEventsResult> {
    const events: SessionEventDto[] = [];
    const choiceOptionMap: Record<number, ChoiceOptionRecord[]> = {};

    const sortedRecords = [...params.actEventRecords].sort(
      (a, b) => a.seqOrder - b.seqOrder,
    );

    for (const record of sortedRecords) {
      const { dto, choiceOptions } = this.mapEvent(
        record.event,
        params.inventoryItems,
      );
      events.push(dto);
      if (choiceOptions.length > 0) {
        choiceOptionMap[dto.eventId] = choiceOptions;
      }
    }

    return { events, choiceOptionMap };
  }

  mapEvent(
    event: EventWithRelations,
    inventoryItems: InventoryItemSummary[],
  ): {
    dto: SessionEventDto;
    choiceOptions: ChoiceOptionRecord[];
  } {
    const choiceExtraction = this.extractChoice(event, inventoryItems);

    const dto: SessionEventDto = {
      eventId: Number(event.id),
      type: event.eventType,
      script: this.resolveScript(event),
      characters: this.extractCharacters(event),
      bgImage: event.bgImage ?? null,
      sceneEffect: event.sceneEffect ?? null,
      bgm: event.bgm ?? null,
      bgmVolume: event.bgmVolume ?? null,
      se: event.se ?? null,
      seVolume: event.seVolume ?? null,
      seLoop: event.seLoop ?? null,
      choice: choiceExtraction.choiceDto,
      choiceResults: null,
      effects: this.extractCharacterEffects(event),
      itemChanges: this.extractItemChanges(event),
      sessionEffects: this.extractSessionEffects(event),
    };

    return { dto, choiceOptions: choiceExtraction.choiceOptions };
  }

  async buildEventChain(
    startEventId: number | bigint,
  ): Promise<SessionEventDto[]> {
    const chain: SessionEventDto[] = [];
    let cursor: bigint | null = BigInt(startEventId);
    const visited = new Set<bigint>();

    while (cursor) {
      if (visited.has(cursor)) {
        break;
      }
      visited.add(cursor);

      const event = await this.prisma.event.findUnique({
        where: { id: cursor },
        include: EVENT_WITH_RELATIONS.include,
      });

      if (!event) {
        break;
      }

      const { dto } = this.mapEvent(event, []);
      chain.push(dto);
      cursor = event.nextEventId;
    }

    return chain;
  }

  private resolveScript(event: EventWithRelations): string | null {
    if (event.eventDialog?.script) {
      return event.eventDialog.script;
    }
    if (event.eventSimpleText?.script) {
      return event.eventSimpleText.script;
    }
    if (event.eventChoice?.choiceScript) {
      return event.eventChoice.choiceScript;
    }
    return null;
  }

  private extractCharacters(
    event: EventWithRelations,
  ): SessionEventCharacterDto[] {
    if (!event.eventDialog?.eventDialogCharacter) {
      return [];
    }

    return event.eventDialog.eventDialogCharacter.map((dialogCharacter) => ({
      characterCode: dialogCharacter.character?.code ?? '',
      position: dialogCharacter.position ?? null,
      emotion: dialogCharacter.emotion ?? null,
      isSpeaker: dialogCharacter.isSpeaker ?? null,
    }));
  }

  private extractCharacterEffects(
    event: EventWithRelations,
  ): SessionEventEffectDto[] | null {
    const allEffects =
      event.eventStatus?.eventStatusEffect?.filter(
        (effect) => effect.characterId !== null,
      ) ?? [];

    if (allEffects.length === 0) {
      return null;
    }

    return allEffects.map((effect) => ({
      characterCode: effect.character?.code ?? null,
      effectType: effect.effectType ?? '',
      change: effect.effectValue ? Number(effect.effectValue) : null,
      newValue: null,
    }));
  }

  private extractItemChanges(
    event: EventWithRelations,
  ): SessionEventItemChangeDto[] | null {
    if (!event.eventStatus?.item) {
      return null;
    }

    return [
      {
        itemId: Number(event.eventStatus.item.id),
        itemName: event.eventStatus.item.name,
        quantityChange: 1,
        newQuantity: null,
      },
    ];
  }

  private extractSessionEffects(
    event: EventWithRelations,
  ): SessionEventSessionEffectDto[] | null {
    const sessionEffects =
      event.eventStatus?.eventStatusEffect?.filter(
        (effect) => effect.characterId === null,
      ) ?? [];

    if (sessionEffects.length === 0) {
      return null;
    }

    return sessionEffects.map((effect) => ({
      effectType: effect.effectType ?? 'UNKNOWN',
      change: effect.effectValue ? Number(effect.effectValue) : 0,
      newValue: null,
    }));
  }

  private extractChoice(
    event: EventWithRelations,
    inventoryItems: InventoryItemSummary[],
  ): {
    choiceDto: SessionChoiceDto | null;
    choiceOptions: ChoiceOptionRecord[];
  } {
    if (
      event.eventType !== event_eventType.StoryChoice &&
      event.eventType !== event_eventType.ItemChoice
    ) {
      return { choiceDto: null, choiceOptions: [] };
    }

    const options: SessionChoiceOptionDto[] =
      event.choiceOption?.map((option) => {
        const { dto } = this.mapChoiceOption(option, inventoryItems, event);
        return dto;
      }) ?? [];

    const choiceDto: SessionChoiceDto = {
      title: event.eventChoice?.choiceTitle ?? '',
      description: event.eventChoice?.choiceScript ?? null,
      thumbnail: event.eventChoice?.thumbnail ?? null,
      type:
        event.eventType === event_eventType.StoryChoice
          ? SessionChoiceType.STORY
          : SessionChoiceType.ITEM,
      options,
      fallback: null,
    };

    const rawOptions: ChoiceOptionRecord[] =
      event.choiceOption?.map((option) => ({
        id: Number(option.id),
        resultType: option.resultType,
        nextEventId: option.nextEventId ? Number(option.nextEventId) : null,
      })) ?? [];

    return { choiceDto, choiceOptions: rawOptions };
  }

  private mapChoiceOption(
    option: EventWithRelations['choiceOption'][number],
    inventoryItems: InventoryItemSummary[],
    event: EventWithRelations,
  ): { dto: SessionChoiceOptionDto; matchedItem: InventoryItemSummary | null } {
    const isStoryChoice = event.eventType === event_eventType.StoryChoice;
    let matchedItem: InventoryItemSummary | null = null;

    if (!isStoryChoice && option.itemCategoryId) {
      matchedItem = this.findInventoryMatch(
        Number(option.itemCategoryId),
        inventoryItems,
      );
    }

    const dto: SessionChoiceOptionDto = {
      choiceOptionId: Number(option.id),
      text: option.title ?? '',
      itemCategoryId: option.itemCategoryId
        ? Number(option.itemCategoryId)
        : null,
      itemId: matchedItem ? matchedItem.itemId : null,
      quantity: matchedItem ? matchedItem.quantity : null,
      isSelectable:
        isStoryChoice || option.optionType === choiceOption_optionType.SKIP
          ? true
          : matchedItem !== null,
    };

    return { dto, matchedItem };
  }

  private findInventoryMatch(
    categoryId: number,
    inventoryItems: InventoryItemSummary[],
  ): InventoryItemSummary | null {
    return (
      inventoryItems.find(
        (item) =>
          item.quantity > 0 && item.categoryIds.some((id) => id === categoryId),
      ) ?? null
    );
  }
}
