import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  choiceOption,
  choiceOption_resultType,
  gameSession_status,
  sessionStatHistory_statType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChoiceOptionRecord,
  EVENT_WITH_RELATIONS,
  EventAssembler,
} from './utils/event-assembler';
import { ChoiceResultMapper } from './utils/choice-result-mapper';
import { SessionStateMachine } from './utils/session-state-machine';
import { NextActRequestDto } from './dto/next-act-request.dto';
import { NextActResponseDto } from './dto/next-act-response.dto';
import { GameSessionLifecycleService } from '../game/services/game-session-lifecycle.service';
import { SubmitGameSessionInventoryDto } from '../game/dto/submit-game-session-inventory.dto';
import { SessionFlowStatus } from './dto/session-flow-status.enum';
import { SessionDayMetaDto } from './dto/session-day-meta.dto';
import { SessionActMetaDto } from './dto/session-act-meta.dto';
import { SessionEndingMetaDto } from './dto/session-ending-meta.dto';
import { SessionChoiceResultType } from './dto/session-choice-result-type.enum';
import { SessionEventDto } from './dto/session-event.dto';
import {
  NextActUpdatesDto,
  NextActCharacterStatusChangeDto,
  NextActSessionStatChangeDto,
  NextActItemChangeDto,
} from './dto/next-act-request.dto';
import { InventoryItemSummary } from './utils/event-assembler';
import { IntroRequestDto } from './dto/intro-request.dto';
import { IntroResponseDto } from './dto/intro-response.dto';

export interface ExecuteNextActParams {
  readonly userId: number;
  readonly payload: NextActRequestDto;
}

export interface PlayIntroParams {
  readonly userId: number;
  readonly payload: IntroRequestDto;
}

const SESSION_STATE_INCLUDE = {
  playingCharacterSet: {
    include: {
      playingCharacter: {
        include: {
          character: true,
        },
      },
    },
  },
  currentDay: true,
  currentAct: true,
  gameSessionInventory: {
    include: {
      item: {
        include: {
          itemToCategory: true,
        },
      },
    },
  },
  characterGroup: true,
} satisfies Prisma.gameSessionDefaultArgs['include'];

type SessionWithState = Prisma.gameSessionGetPayload<{
  include: typeof SESSION_STATE_INCLUDE;
}>;

const ACT_WITH_EVENTS = {
  include: {
    day: true,
    actEvent: {
      orderBy: { seqOrder: 'asc' },
      include: {
        event: EVENT_WITH_RELATIONS,
      },
    },
  },
} satisfies Prisma.actDefaultArgs;

type ActWithEvents = Prisma.actGetPayload<typeof ACT_WITH_EVENTS>;

type ActWithDay = Prisma.actGetPayload<{
  include: { day: true };
}>;

const INTRO_SEQUENCE_WITH_EVENTS = {
  include: {
    introSequenceEvent: {
      orderBy: { seqOrder: 'asc' },
      include: {
        event: EVENT_WITH_RELATIONS,
      },
    },
  },
} satisfies Prisma.introSequenceDefaultArgs;

// type IntroSequenceWithEvents = Prisma.introSequenceGetPayload<
//   typeof INTRO_SEQUENCE_WITH_EVENTS
// >;

type SessionInventoryRecord = Prisma.gameSessionInventoryGetPayload<{
  include: {
    item: {
      include: {
        itemToCategory: true;
      };
    };
  };
}>;

/**
 * SessionsService orchestrates long-running story progression flows.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameSessionLifecycleService: GameSessionLifecycleService,
    private readonly eventAssembler: EventAssembler,
    private readonly choiceResultMapper: ChoiceResultMapper,
    private readonly sessionStateMachine: SessionStateMachine,
  ) {}

  async playIntro(params: PlayIntroParams): Promise<IntroResponseDto> {
    const session = await this.prisma.gameSession.findFirst({
      where: { userId: params.userId },
      include: SESSION_STATE_INCLUDE,
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '게임 세션을 찾을 수 없습니다.',
      });
    }

    if (!session.characterGroupId) {
      throw this.createBadRequest(
        'CHARACTER_GROUP_MISSING',
        '세션에 캐릭터 그룹 정보가 없습니다.',
      );
    }

    const introSequence = await this.prisma.introSequence.findFirst({
      where: {
        characterGroupId: session.characterGroupId,
        introMode: params.payload.introMode,
      },
      include: INTRO_SEQUENCE_WITH_EVENTS.include,
    });

    if (!introSequence || introSequence.introSequenceEvent.length === 0) {
      throw new NotFoundException({
        code: 'INTRO_SEQUENCE_NOT_FOUND',
        message: '해당 Intro 시퀀스를 찾을 수 없습니다.',
      });
    }

    const events = await this.eventAssembler.buildIntroEvents({
      events: introSequence.introSequenceEvent.map((entry) => entry.event),
    });

    return {
      sessionId: session.id.toString(),
      introMode: params.payload.introMode,
      events,
    };
  }
  async executeNextAct(
    params: ExecuteNextActParams,
  ): Promise<NextActResponseDto> {
    const session = await this.prisma.gameSession.findFirst({
      where: { userId: params.userId },
      include: SESSION_STATE_INCLUDE,
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '게임 세션을 찾을 수 없습니다.',
      });
    }

    this.ensureSessionReady(session);

    if (!params.payload.lastActId) {
      const actContext = await this.ensureCurrentAct(session);
      return this.buildActResponse(session, actContext);
    }

    return this.handleActCompletion(session, params.payload);
  }

  async createOrResetSessionForUser(userId: number): Promise<void> {
    await this.gameSessionLifecycleService.createOrResetSession(userId);
  }

  async confirmInventoryForUser(
    userId: number,
    dto: SubmitGameSessionInventoryDto,
  ): Promise<void> {
    await this.gameSessionLifecycleService.confirmInventory(userId, dto);
  }

  private ensureSessionReady(session: SessionWithState): void {
    if (!session.playingCharacterSet) {
      throw this.createBadRequest(
        'CHARACTER_SET_REQUIRED',
        '캐릭터 셋을 먼저 선택해야 합니다.',
      );
    }

    if (!session.bagConfirmedAt) {
      throw this.createBadRequest(
        'BAG_NOT_CONFIRMED',
        '가방을 확정한 이후에 진행할 수 있습니다.',
      );
    }

    if (!session.characterGroupId) {
      throw this.createBadRequest(
        'CHARACTER_GROUP_MISSING',
        '세션에 캐릭터 그룹 정보가 없습니다.',
      );
    }
  }

  private async ensureCurrentAct(
    session: SessionWithState,
  ): Promise<ActWithEvents> {
    if (!session.currentActId) {
      const firstAct = await this.findFirstActForSession(session);
      await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          currentActId: firstAct.id,
          currentDayId: firstAct.dayId,
          status: gameSession_status.IN_PROGRESS,
        },
      });
      return this.loadActWithEvents(Number(firstAct.id));
    }

    return this.loadActWithEvents(Number(session.currentActId));
  }

  private async findFirstActForSession(session: SessionWithState): Promise<{
    id: bigint;
    dayId: bigint;
  }> {
    const firstDay = await this.prisma.day.findFirst({
      where: { characterGroupId: session.characterGroupId },
      orderBy: { dayNumber: 'asc' },
      include: {
        act: {
          orderBy: { sequenceNumber: 'asc' },
          take: 1,
        },
      },
    });

    if (!firstDay || firstDay.act.length === 0) {
      throw new NotFoundException(
        '해당 캐릭터 그룹에 사용할 수 있는 Act가 없습니다.',
      );
    }

    return {
      id: firstDay.act[0].id,
      dayId: firstDay.id,
    };
  }

  private async loadActWithEvents(actId: number): Promise<ActWithEvents> {
    const act = await this.prisma.act.findUnique({
      where: { id: BigInt(actId) },
      include: ACT_WITH_EVENTS.include,
    });

    if (!act) {
      throw new NotFoundException('Act 정보를 찾을 수 없습니다.');
    }

    return act;
  }

  private async buildActResponse(
    session: SessionWithState,
    act: ActWithEvents,
  ): Promise<NextActResponseDto> {
    const { events, choiceOptionMap } =
      await this.eventAssembler.buildActEvents({
        actEventRecords: act.actEvent,
        inventoryItems: this.mapInventorySummaries(
          session.gameSessionInventory ?? [],
        ),
      });
    await this.populateChoiceResults(events, choiceOptionMap);

    return {
      sessionId: session.id.toString(),
      status: SessionFlowStatus.IN_PROGRESS,
      day: this.toDayMeta(act.day),
      act: this.toActMeta(act),
      events,
      ending: null,
    };
  }

  private toDayMeta(day: ActWithEvents['day']): SessionDayMetaDto {
    return {
      id: Number(day.id),
      number: day.dayNumber,
    };
  }

  private toActMeta(act: ActWithEvents): SessionActMetaDto {
    return {
      id: Number(act.id),
      sequenceNumber: act.sequenceNumber,
      title: act.title ?? null,
    };
  }

  private async populateChoiceResults(
    events: SessionEventDto[],
    choiceOptionMap: Record<number, ChoiceOptionRecord[]>,
  ): Promise<void> {
    await Promise.all(
      events.map(async (event) => {
        const choiceOptions = choiceOptionMap[event.eventId];
        if (!choiceOptions || !event.choice) {
          return;
        }
        event.choiceResults = await this.choiceResultMapper.mapChoiceResults({
          choiceOptions,
        });
      }),
    );
  }

  private async handleActCompletion(
    initialSession: SessionWithState,
    payload: NextActRequestDto,
  ): Promise<NextActResponseDto> {
    let session = initialSession;
    if (!payload.lastActId) {
      throw this.createBadRequest(
        'LAST_ACT_REQUIRED',
        'lastActId 가 필요합니다.',
      );
    }

    if (!session.currentActId) {
      throw this.createBadRequest('NO_ACTIVE_ACT', '진행 중인 Act가 없습니다.');
    }

    if (Number(session.currentActId) !== payload.lastActId) {
      throw this.createBadRequest(
        'ACT_MISMATCH',
        '현재 진행 중인 Act 와 일치하지 않습니다.',
      );
    }

    const currentAct = await this.prisma.act.findUnique({
      where: { id: BigInt(payload.lastActId) },
      include: { day: true },
    });

    if (!currentAct) {
      throw new NotFoundException({
        code: 'ACT_NOT_FOUND',
        message: 'Act 정보를 찾을 수 없습니다.',
      });
    }

    const chosenOption = payload.choice
      ? await this.loadChoiceOption(
          payload.choice.choiceOptionId,
          payload.lastActId,
        )
      : null;

    if (payload.choice && !chosenOption) {
      throw this.createBadRequest(
        'CHOICE_NOT_FOUND',
        '선택한 옵션을 찾을 수 없습니다.',
      );
    }

    if (payload.choice && chosenOption) {
      await this.prisma.gameSessionHistory.create({
        data: {
          sessionId: session.id,
          actId: BigInt(payload.lastActId),
          choiceOptionId: chosenOption.id,
          itemId: payload.choice.chosenItemId
            ? BigInt(payload.choice.chosenItemId)
            : null,
        },
      });
    }

    session = await this.applyClientUpdates(session, payload.updates);

    if (this.hasSuddenDeath(session)) {
      return this.handleSuddenDeath(session);
    }

    const resultType = this.mapChoiceResultType(chosenOption?.resultType);

    let flowStatus = this.sessionStateMachine.determineNextStatus({
      currentStatus: SessionFlowStatus.IN_PROGRESS,
      resultType,
    });

    if (flowStatus === SessionFlowStatus.IN_PROGRESS) {
      const continuation = await this.findNextActContext(
        payload.lastActId,
        chosenOption,
      );

      if (!continuation) {
        flowStatus = SessionFlowStatus.DAY_END;
      } else {
        await this.prisma.gameSession.update({
          where: { id: session.id },
          data: {
            currentActId: continuation.id,
            currentDayId: continuation.dayId,
            status: gameSession_status.IN_PROGRESS,
          },
        });
        return this.buildActResponse(session, continuation);
      }
    }

    if (flowStatus === SessionFlowStatus.DAY_END) {
      const nextDayContext = await this.prepareNextDayContext(
        session,
        currentAct,
      );

      if (!nextDayContext) {
        return this.handleTerminalState(
          session,
          SessionFlowStatus.GAME_END,
          chosenOption,
        );
      }

      await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          currentActId: nextDayContext.nextActId,
          currentDayId: nextDayContext.nextDayId,
          status: gameSession_status.IN_PROGRESS,
        },
      });

      return {
        sessionId: session.id.toString(),
        status: SessionFlowStatus.DAY_END,
        day: this.toDayMeta(currentAct.day),
        act: null,
        events: [],
        ending: null,
      };
    }

    return this.handleTerminalState(session, flowStatus, chosenOption);
  }

  private async loadChoiceOption(
    choiceOptionId: number,
    actId: number,
  ): Promise<choiceOption & { choiceEvent: { actId: bigint } }> {
    const option = await this.prisma.choiceOption.findUnique({
      where: { id: BigInt(choiceOptionId) },
      include: {
        choiceEvent: true,
      },
    });

    if (!option) {
      return null;
    }

    if (Number(option.choiceEvent.actId) !== actId) {
      return null;
    }

    return option;
  }

  private async findNextActContext(
    currentActId: number,
    choiceOption: (choiceOption & { choiceEvent: { actId: bigint } }) | null,
  ): Promise<ActWithEvents | null> {
    if (choiceOption?.nextActId) {
      return this.loadActWithEvents(Number(choiceOption.nextActId));
    }

    const current = await this.prisma.act.findUnique({
      where: { id: BigInt(currentActId) },
      select: { dayId: true, sequenceNumber: true },
    });

    if (!current) {
      throw new NotFoundException('Act 정보를 찾을 수 없습니다.');
    }

    const nextAct = await this.prisma.act.findFirst({
      where: {
        dayId: current.dayId,
        sequenceNumber: { gt: current.sequenceNumber },
      },
      orderBy: { sequenceNumber: 'asc' },
      include: ACT_WITH_EVENTS.include,
    });

    if (!nextAct) {
      return null;
    }

    return nextAct;
  }

  private async prepareNextDayContext(
    session: SessionWithState,
    currentAct: ActWithDay,
  ): Promise<{ nextDayId: bigint; nextActId: bigint } | null> {
    const nextDay = await this.prisma.day.findFirst({
      where: {
        characterGroupId: session.characterGroupId,
        dayNumber: { gt: currentAct.day.dayNumber },
      },
      orderBy: { dayNumber: 'asc' },
      include: {
        act: {
          orderBy: { sequenceNumber: 'asc' },
          take: 1,
        },
      },
    });

    if (!nextDay || nextDay.act.length === 0) {
      return null;
    }

    return {
      nextDayId: nextDay.id,
      nextActId: nextDay.act[0].id,
    };
  }

  private async handleTerminalState(
    session: SessionWithState,
    flowStatus: SessionFlowStatus,
    choiceOption: (choiceOption & { choiceEvent: { actId: bigint } }) | null,
  ): Promise<NextActResponseDto> {
    const terminalEvents =
      choiceOption?.nextEventId && flowStatus !== SessionFlowStatus.DAY_END
        ? await this.eventAssembler.buildEventChain(
            Number(choiceOption.nextEventId),
          )
        : [];

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        status: this.mapFlowStatusToEntityStatus(flowStatus),
        currentActId: null,
        currentDayId: null,
        endedAt: new Date(),
      },
    });

    return {
      sessionId: session.id.toString(),
      status: flowStatus,
      day: null,
      act: null,
      events: terminalEvents,
      ending: this.resolveEndingMeta(session, flowStatus),
    };
  }

  private async handleSuddenDeath(
    session: SessionWithState,
  ): Promise<NextActResponseDto> {
    const deathActId = session.characterGroup?.deathEndActId;
    let events: SessionEventDto[] = [];

    if (deathActId) {
      const deathAct = await this.loadActWithEvents(Number(deathActId));
      const serialized = await this.eventAssembler.buildActEvents({
        actEventRecords: deathAct.actEvent,
        inventoryItems: [],
      });
      events = serialized.events;
    }

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        status: gameSession_status.SUDDEN_DEATH,
        currentActId: null,
        currentDayId: null,
        endedAt: new Date(),
      },
    });

    return {
      sessionId: session.id.toString(),
      status: SessionFlowStatus.SUDDEN_DEATH,
      day: null,
      act: null,
      events,
      ending: null,
    };
  }

  private async applyClientUpdates(
    session: SessionWithState,
    updates?: NextActUpdatesDto,
  ): Promise<SessionWithState> {
    if (!updates) {
      return session;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.applyCharacterStatusChanges(
        tx,
        session,
        updates.characterStatusChanges,
      );
      await this.applySessionStatChanges(
        tx,
        session,
        updates.sessionStatChanges,
      );
      await this.applyItemChanges(tx, session, updates.itemChanges);
    });

    return this.refreshSessionState(session.id);
  }

  private async applyCharacterStatusChanges(
    tx: Prisma.TransactionClient,
    session: SessionWithState,
    changes?: NextActCharacterStatusChangeDto[],
  ): Promise<void> {
    if (!changes || changes.length === 0) {
      return;
    }

    if (!session.playingCharacterSet) {
      throw this.createBadRequest(
        'CHARACTER_SET_REQUIRED',
        '캐릭터 셋을 먼저 선택해야 합니다.',
      );
    }

    for (const change of changes) {
      const target = session.playingCharacterSet.playingCharacter?.find(
        (pc) => pc.character.code === change.characterCode,
      );

      if (!target) {
        throw this.createBadRequest(
          'CHARACTER_NOT_FOUND',
          `캐릭터 ${change.characterCode}를 찾을 수 없습니다.`,
        );
      }

      const updateData: Prisma.playingCharacterUpdateInput = {};

      if (change.hpChange !== 0) {
        await tx.playingCharacter.updateMany({
          where: { id: target.id, currentHp: null },
          data: { currentHp: 0 },
        });
        updateData.currentHp = { increment: change.hpChange };
      }

      if (change.mentalChange !== 0) {
        await tx.playingCharacter.updateMany({
          where: { id: target.id, currentMental: null },
          data: { currentMental: 0 },
        });
        updateData.currentMental = { increment: change.mentalChange };
      }

      if (Object.keys(updateData).length > 0) {
        await tx.playingCharacter.update({
          where: { id: target.id },
          data: updateData,
        });
      }

      if (change.hpChange !== 0) {
        await tx.sessionStatHistory.create({
          data: {
            sessionId: session.id,
            statType: sessionStatHistory_statType.HP,
            targetCharacterId: target.characterId,
            delta: change.hpChange,
          },
        });
      }

      if (change.mentalChange !== 0) {
        await tx.sessionStatHistory.create({
          data: {
            sessionId: session.id,
            statType: sessionStatHistory_statType.MENTAL,
            targetCharacterId: target.characterId,
            delta: change.mentalChange,
          },
        });
      }
    }
  }

  private async applySessionStatChanges(
    tx: Prisma.TransactionClient,
    session: SessionWithState,
    changes?: NextActSessionStatChangeDto[],
  ): Promise<void> {
    if (!changes || changes.length === 0) {
      return;
    }

    for (const change of changes) {
      const normalizedType = change.statType.toLowerCase();
      if (normalizedType === 'lifepoint') {
        await tx.gameSession.updateMany({
          where: { id: session.id, lifePoint: null },
          data: { lifePoint: 0 },
        });
        await tx.gameSession.update({
          where: { id: session.id },
          data: {
            lifePoint: { increment: change.change },
          },
        });

        await tx.sessionStatHistory.create({
          data: {
            sessionId: session.id,
            statType: sessionStatHistory_statType.LIFE_POINT,
            delta: change.change,
          },
        });
        session.lifePoint += change.change;
      }
    }
  }

  private async applyItemChanges(
    tx: Prisma.TransactionClient,
    session: SessionWithState,
    changes?: NextActItemChangeDto[],
  ): Promise<void> {
    if (!changes || changes.length === 0) {
      return;
    }

    for (const change of changes) {
      const itemId = BigInt(change.itemId);
      const existing = await tx.gameSessionInventory.findUnique({
        where: {
          sessionId_itemId: {
            sessionId: session.id,
            itemId,
          },
        },
      });

      const currentQuantity = existing?.quantity ?? 0;
      const newQuantity = Math.max(currentQuantity + change.quantityChange, 0);
      const actualDelta = newQuantity - currentQuantity;

      if (newQuantity === 0) {
        if (existing) {
          await tx.gameSessionInventory.delete({
            where: {
              sessionId_itemId: {
                sessionId: session.id,
                itemId,
              },
            },
          });
        }
      } else {
        await tx.gameSessionInventory.upsert({
          where: {
            sessionId_itemId: {
              sessionId: session.id,
              itemId,
            },
          },
          update: { quantity: newQuantity },
          create: {
            sessionId: session.id,
            itemId,
            quantity: newQuantity,
          },
        });
      }

      if (actualDelta !== 0) {
        await tx.sessionStatHistory.create({
          data: {
            sessionId: session.id,
            statType: sessionStatHistory_statType.ITEM_QUANTITY,
            delta: actualDelta,
          },
        });
      }
    }
  }

  private hasSuddenDeath(session: SessionWithState): boolean {
    const characters = session.playingCharacterSet?.playingCharacter ?? [];
    return characters.some(
      (pc) => (pc.currentHp ?? 0) <= 0 || (pc.currentMental ?? 0) <= 0,
    );
  }

  private async refreshSessionState(
    sessionId: bigint,
  ): Promise<SessionWithState> {
    const refreshed = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: SESSION_STATE_INCLUDE,
    });

    if (!refreshed) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '게임 세션을 찾을 수 없습니다.',
      });
    }

    return refreshed;
  }

  private resolveEndingMeta(
    session: SessionWithState,
    flowStatus: SessionFlowStatus,
  ): SessionEndingMetaDto | null {
    if (flowStatus !== SessionFlowStatus.GAME_END || !session.endingId) {
      return null;
    }

    return {
      endingId: Number(session.endingId),
      endingIndex: 0,
      title: 'Ending',
      endingImage: null,
    };
  }

  private mapChoiceResultType(
    resultType?: choiceOption_resultType,
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

  private mapFlowStatusToEntityStatus(
    flowStatus: SessionFlowStatus,
  ): gameSession_status {
    switch (flowStatus) {
      case SessionFlowStatus.GAME_END:
        return gameSession_status.GAME_END;
      case SessionFlowStatus.GAME_OVER:
        return gameSession_status.GAME_OVER;
      case SessionFlowStatus.SUDDEN_DEATH:
        return gameSession_status.SUDDEN_DEATH;
      default:
        return gameSession_status.IN_PROGRESS;
    }
  }

  private mapInventorySummaries(
    records: SessionInventoryRecord[],
  ): InventoryItemSummary[] {
    return records.map((record) => ({
      itemId: Number(record.itemId),
      quantity: record.quantity,
      categoryIds:
        record.item.itemToCategory?.map((relation) =>
          Number(relation.categoryId),
        ) ?? [],
    }));
  }

  private createBadRequest(code: string, message: string): BadRequestException {
    return new BadRequestException({ code, message });
  }
}
