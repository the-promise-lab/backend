import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  choiceOption,
  choiceOption_resultType,
  endingCondition,
  endingCondition_conditionType,
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
import {
  CharacterImageLookup,
  InventoryItemSummary,
} from './utils/event-assembler';
import { IntroRequestDto } from './dto/intro-request.dto';
import { IntroResponseDto } from './dto/intro-response.dto';
import { SessionReportTab } from './dto/session-report-tab.enum';
import { SessionReportResponseDto } from './dto/session-report-response.dto';
import { ReportAssembler } from './utils/report-assembler';
import { RankingResponseDto } from './dto/ranking-response.dto';
import {
  EndingCollectionGroupDto,
  EndingCollectionItemDto,
  EndingCollectionResponseDto,
} from './dto/collection-response.dto';
import { HistoryResponseDto, HistoryItemDto } from './dto/history-response.dto';

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

const ENDING_WITH_EVENTS = {
  include: {
    endingEvent: {
      orderBy: { eventOrder: 'asc' },
      include: {
        event: EVENT_WITH_RELATIONS,
      },
    },
  },
} satisfies Prisma.endingDefaultArgs;

const ENDING_WITH_CONDITIONS = {
  include: {
    endingEvent: {
      orderBy: { eventOrder: 'asc' },
      include: {
        event: EVENT_WITH_RELATIONS,
      },
    },
    endingCondition: true,
  },
} satisfies Prisma.endingDefaultArgs;

type EndingWithEvents = Prisma.endingGetPayload<typeof ENDING_WITH_EVENTS>;
type EndingWithFullRelations = Prisma.endingGetPayload<
  typeof ENDING_WITH_CONDITIONS
>;

const REPORT_SESSION_INCLUDE = {
  user: true,
  characterGroup: true,
  bag: true,
  ending: true,
  playingCharacterSet: {
    include: {
      playingCharacter: {
        include: {
          character: true,
        },
      },
    },
  },
  gameSessionInventory: {
    include: {
      item: true,
    },
  },
  gameSessionHistory: true,
  sessionStatHistory: true,
  currentDay: true,
} satisfies Prisma.gameSessionDefaultArgs['include'];

type SessionWithReport = Prisma.gameSessionGetPayload<{
  include: typeof REPORT_SESSION_INCLUDE;
}>;

type SessionInventoryRecord = Prisma.gameSessionInventoryGetPayload<{
  include: {
    item: {
      include: {
        itemToCategory: true;
      };
    };
  };
}>;

interface DeathEndingResolution {
  readonly events: SessionEventDto[];
  readonly meta: SessionEndingMetaDto;
  readonly endingId: bigint;
}

interface EndingResolution {
  readonly events: SessionEventDto[];
  readonly meta: SessionEndingMetaDto;
  readonly endingId: bigint;
}

interface EndingEvaluationContext {
  readonly characterStats: Map<bigint, CharacterStatSnapshot>;
  readonly itemQuantities: Map<bigint, number>;
  readonly lifePoint: number;
}

interface CharacterStatSnapshot {
  readonly currentHp: number;
  readonly currentMental: number;
}

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
    private readonly reportAssembler: ReportAssembler,
  ) {}

  private findLatestInProgressSession(
    userId: number,
  ): Promise<SessionWithState | null> {
    return this.prisma.gameSession.findFirst({
      where: {
        userId,
        status: gameSession_status.IN_PROGRESS,
      },
      orderBy: { createdAt: 'desc' },
      include: SESSION_STATE_INCLUDE,
    });
  }

  async playIntro(params: PlayIntroParams): Promise<IntroResponseDto> {
    const session = await this.findLatestInProgressSession(params.userId);

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

    const characterImages = await this.loadCharacterImages();
    const events = await this.eventAssembler.buildIntroEvents({
      events: introSequence.introSequenceEvent.map((entry) => entry.event),
      characterImages,
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
    const session = await this.findLatestInProgressSession(params.userId);

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '게임 세션을 찾을 수 없습니다.',
      });
    }

    const ownedItemIds = this.getOwnedItemIds(session);
    this.ensureSessionReady(session);

    if (!params.payload.lastActId) {
      const actContext = await this.ensureCurrentAct(session, ownedItemIds);
      return this.buildActResponse(session, actContext);
    }

    return this.handleActCompletion(session, params.payload);
  }

  /**
   * Returns the result report for a finished session.
   */
  async getSessionReport(params: {
    readonly userId: number;
    readonly sessionId: number;
  }): Promise<SessionReportResponseDto> {
    const tab = SessionReportTab.RESULT;
    const includeInventory = true;
    const session = await this.prisma.gameSession.findFirst({
      where: { id: BigInt(params.sessionId), userId: BigInt(params.userId) },
      include: REPORT_SESSION_INCLUDE,
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '게임 세션을 찾을 수 없습니다.',
      });
    }

    if (
      session.status === gameSession_status.IN_PROGRESS ||
      session.status === gameSession_status.GAME_OVER
    ) {
      throw this.createBadRequest(
        'REPORT_NOT_AVAILABLE',
        '게임 종료 후 조회할 수 있습니다.',
      );
    }

    const ending =
      session.ending ??
      (session.status === gameSession_status.SUDDEN_DEATH
        ? await this.prisma.ending.findFirst({
            where: {
              characterGroupId: session.characterGroupId ?? undefined,
              priority: 8,
            },
          })
        : null);
    if (ending) {
      (session as SessionWithReport).ending = ending;
    }

    return this.reportAssembler.buildResultReport({
      session,
      tab,
      includeInventory,
    });
  }

  async getRankingSummary(userId: number): Promise<RankingResponseDto> {
    // 1. Calculate Aggregate Rankings (Sum of XP per User)
    // Uses window function to calculate rank based on Total XP
    const rankingQuery = Prisma.sql`
      WITH CTE_SessionXP AS (
        SELECT
          gs.userId,
          u.name as nickname,
          (
            COALESCE(gs.lifePoint, 0) +
            COALESCE((
              SELECT SUM(pc.currentHp)
              FROM playingCharacterSet pcs
              JOIN playingCharacter pc ON pc.playingCharacterSetId = pcs.id
              WHERE pcs.gameSessionId = gs.id
            ), 0) +
            COALESCE((
              SELECT SUM(pc.currentMental)
              FROM playingCharacterSet pcs
              JOIN playingCharacter pc ON pc.playingCharacterSetId = pcs.id
              WHERE pcs.gameSessionId = gs.id
            ), 0)
          ) as sessionXp
        FROM gameSession gs
        JOIN user u ON gs.userId = u.id
        WHERE gs.status IN ('GAME_END', 'GAME_OVER', 'SUDDEN_DEATH')
      ),
      CTE_UserTotalXP AS (
        SELECT
          userId,
          MAX(nickname) as nickname,
          SUM(sessionXp) as totalXp
        FROM CTE_SessionXP
        GROUP BY userId
      ),
      CTE_Ranking AS (
        SELECT
          *,
          RANK() OVER (ORDER BY totalXp DESC, userId ASC) as ranking
        FROM CTE_UserTotalXP
      )
      SELECT * FROM CTE_Ranking
      ORDER BY ranking ASC
    `;

    const allRankings = await this.prisma.$queryRaw<
      Array<{
        userId: bigint;
        nickname: string | null;
        totalXp: number;
        ranking: bigint;
      }>
    >(rankingQuery);

    const totalUsers = allRankings.length;
    const myRankData = allRankings.find((r) => r.userId === BigInt(userId));

    // 2. Transform Rankings (Top 5)
    const topRankings = allRankings
      .slice(0, 5) // Top 5
      .map((r) => ({
        rank: Number(r.ranking),
        nickname: r.nickname || 'Unknown',
        xp: Number(r.totalXp),
        isCurrentUser: r.userId === BigInt(userId),
      }));

    // 3. Fetch Best Result per Character Group
    // Logic: Fetch all completed sessions for user -> Group by characterGroupId -> Pick best by priority/grade
    // Need ending details.
    const userSessions = await this.prisma.gameSession.findMany({
      where: {
        userId: BigInt(userId),
        status: { in: ['GAME_END', 'GAME_OVER', 'SUDDEN_DEATH'] },
        endingId: { not: null }, // Must have an ending
      },
      include: {
        ending: true,
        characterGroup: true,
        playingCharacterSet: {
          include: {
            playingCharacter: {
              include: { character: true },
            },
          },
        },
      },
    });

    const bestResultsMap = new Map<string, any>(); // groupCode -> Session

    for (const s of userSessions) {
      if (!s.characterGroup || !s.ending) continue;

      const groupCode = s.characterGroup.code;
      const existing = bestResultsMap.get(groupCode);

      // Comparison Logic: Lower Priority is better (usually 1 is best).
      // Or Grade: Good > Normal > Bad > Hidden?
      // Let's assume 'priority' field in Ending entity dictates the hierarchy.
      // If priority is missing, fallback to ID.
      // Current Schema: ending.priority (Int), ending.grade (String).
      // Let's use priority (smaller is better?).
      // User request: Good > Normal > Bad > Hidden.
      // We need to know how these map to priority.
      // Assuming existing data convention: verify later if needed.
      // For now, let's assume 'priority' is the sort key (ascending).

      const currentPriority = s.ending.priority;

      if (!existing || currentPriority < existing.ending.priority) {
        bestResultsMap.set(groupCode, s);
      }
    }

    const charactersResults = Array.from(bestResultsMap.values()).map((s) => {
      const characterNames =
        s.playingCharacterSet?.playingCharacter
          .map((pc) => pc.character.name)
          .join(', ') ?? '';

      return {
        characterGroupName: s.characterGroup?.name ?? '',
        characterNames,
        result: s.ending?.title ?? '',
        grade: s.ending?.grade ?? '',
        imageUrl: s.ending?.image ?? undefined,
      };
    });

    return {
      success: true,
      data: {
        myScore: {
          rank: myRankData ? Number(myRankData.ranking) : 0,
          totalUsers,
          xp: myRankData ? Number(myRankData.totalXp) : 0,
        },
        characters: charactersResults,
        rankings: topRankings,
      },
    };
  }

  async getEndingCollection(
    userId: number,
  ): Promise<EndingCollectionResponseDto> {
    // 1. Fetch all Character Groups with their Endings and Members
    const groups = await this.prisma.characterGroup.findMany({
      include: {
        ending: {
          orderBy: { priority: 'asc' }, // Assume priority determines order
        },
        characterGroupMember: {
          include: { character: true },
          orderBy: { slotOrder: 'asc' },
        },
      },
      orderBy: { id: 'asc' }, // Ensure consistent group order
    });

    // 2. Fetch User's Collected Ending IDs
    const userSessions = await this.prisma.gameSession.findMany({
      where: {
        userId: BigInt(userId),
        endingId: { not: null },
      },
      select: { endingId: true },
      distinct: ['endingId'],
    });

    const collectedEndingIds = new Set(
      userSessions.map((s) => Number(s.endingId)),
    );

    // 3. Assemble Response
    const data: EndingCollectionGroupDto[] = groups.map((group) => {
      const items: EndingCollectionItemDto[] = group.ending.map((end) => {
        const isCollected = collectedEndingIds.has(Number(end.id));
        return {
          endingId: Number(end.id),
          title: end.title,
          imageUrl: isCollected ? end.image : null,
          isCollected,
        };
      });

      return {
        characterGroupCode: group.code,
        items,
      };
    });

    return {
      success: true,
      data,
    };
  }

  async getHistory(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<HistoryResponseDto> {
    const skip = (page - 1) * limit;

    const [total, sessions] = await Promise.all([
      this.prisma.gameSession.count({
        where: {
          userId: BigInt(userId),
          status: { in: ['GAME_END', 'GAME_OVER', 'SUDDEN_DEATH'] },
        },
      }),
      this.prisma.gameSession.findMany({
        where: {
          userId: BigInt(userId),
          status: { in: ['GAME_END', 'GAME_OVER', 'SUDDEN_DEATH'] },
        },
        include: {
          ending: true,
          characterGroup: true,
          playingCharacterSet: {
            include: {
              playingCharacter: {
                include: { character: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const historyItems: HistoryItemDto[] = sessions.map((session) => {
      // XP Calculation: LifePoint + Sum(HP) + Sum(Mental)
      const hpSum =
        session.playingCharacterSet?.playingCharacter.reduce(
          (sum, pc) => sum + pc.currentHp,
          0,
        ) ?? 0;
      const mentalSum =
        session.playingCharacterSet?.playingCharacter.reduce(
          (sum, pc) => sum + pc.currentMental,
          0,
        ) ?? 0;
      const xp = (session.lifePoint ?? 0) + hpSum + mentalSum;

      // Character Names
      const characterNames =
        session.playingCharacterSet?.playingCharacter
          .map((pc) => pc.character.name)
          .join(',') ?? 'Unknown';

      // Date Formatting
      // session.updatedAt -> "25.01.21" / "14:30"
      const dateObj = new Date(session.updatedAt);
      const yy = String(dateObj.getFullYear()).slice(-2);
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${yy}.${mm}.${dd}`;

      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${min}`;

      return {
        id: String(session.id),
        characterName: characterNames,
        resultType: session.ending?.grade ?? 'Unknown',
        xp,
        date: dateStr,
        time: timeStr,
        // Use characterGroup image if available (not in schema yet? check), fallback to ending image
        // Assuming characterGroup might NOT have image yet, or strictly 'ending' image as per req (1)?
        // Req says "(1) 캐릭터 구성 이미지". If characterGroup has image, use it.
        // If not, maybe use ending.image.
        // Let's check if `characterGroup` actually has `image` field in Prisma.
        // If not, for now use ending image or null.
        // Wait, schema check was fuzzy. I will use `ending.image` as a safe fallback.
        characterImageUrl: session.ending?.image ?? undefined,
      };
    });

    return {
      success: true,
      data: historyItems,
      total,
      page,
      limit,
    };
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
    ownedItemIds: number[],
  ): Promise<ActWithEvents> {
    if (!session.currentActId) {
      const firstAct = await this.findFirstUnlockedActForSession(
        session,
        ownedItemIds,
      );
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

    const act = await this.loadActWithEvents(Number(session.currentActId));

    if (this.isActUnlocked(act, ownedItemIds)) {
      return act;
    }

    const continuation = await this.findNextActContext(
      Number(act.id),
      null,
      ownedItemIds,
    );

    if (!continuation) {
      throw this.createBadRequest(
        'NEXT_ACT_NOT_AVAILABLE',
        '진행 가능한 Act가 없습니다.',
      );
    }

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        currentActId: continuation.id,
        currentDayId: continuation.dayId,
        status: gameSession_status.IN_PROGRESS,
      },
    });

    return continuation;
  }

  private async findFirstUnlockedActForSession(
    session: SessionWithState,
    ownedItemIds: number[],
  ): Promise<{
    id: bigint;
    dayId: bigint;
  }> {
    const firstAct = await this.prisma.act.findFirst({
      where: {
        day: { characterGroupId: session.characterGroupId },
        AND: [this.buildUnlockedActCondition(ownedItemIds)],
      },
      orderBy: [{ day: { dayNumber: 'asc' } }, { sequenceNumber: 'asc' }],
      select: {
        id: true,
        dayId: true,
      },
    });

    if (!firstAct) {
      throw new NotFoundException(
        '해당 캐릭터 그룹에 사용할 수 있는 Act가 없습니다.',
      );
    }

    return firstAct;
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
    const inventoryItems = this.mapInventorySummaries(
      session.gameSessionInventory ?? [],
    );
    const characterImages = await this.loadCharacterImages();
    const { events, choiceOptionMap } =
      await this.eventAssembler.buildActEvents({
        actEventRecords: act.actEvent,
        inventoryItems,
        characterImages,
      });
    await this.populateChoiceResults(
      events,
      choiceOptionMap,
      inventoryItems,
      characterImages,
    );

    return {
      sessionId: session.id.toString(),
      status: SessionFlowStatus.IN_PROGRESS,
      day: this.toDayMeta(act.day),
      act: this.toActMeta(act),
      events,
      ending: null,
    };
  }

  private async loadCharacterImages(): Promise<CharacterImageLookup> {
    const rows = await this.prisma.characterEmotionImage.findMany({
      where: { deletedAt: null },
    });
    return rows.reduce<CharacterImageLookup>((acc, row) => {
      const code = row.characterCode;
      const emotion = row.emotion || 'default';
      const existing = acc[code] ?? {};
      existing[emotion] = row.imageUrl;
      acc[code] = existing;
      return acc;
    }, {});
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
    inventoryItems: InventoryItemSummary[],
    characterImages: CharacterImageLookup,
  ): Promise<void> {
    await Promise.all(
      events.map(async (event) => {
        const choiceOptions = choiceOptionMap[event.eventId];
        if (!choiceOptions || !event.choice) {
          return;
        }
        const choiceResults = await this.choiceResultMapper.mapChoiceResults({
          choiceOptions,
          inventoryItems,
          characterImages,
        });
        event.choice.outcomes = choiceResults;
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
    const ownedItemIds = this.getOwnedItemIds(session);

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
        ownedItemIds,
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
        ownedItemIds,
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
    ownedItemIds: number[],
  ): Promise<ActWithEvents | null> {
    const unlockedCondition = this.buildUnlockedActCondition(ownedItemIds);

    if (choiceOption?.nextActId) {
      const unlockedNextAct = await this.prisma.act.findFirst({
        where: {
          id: BigInt(choiceOption.nextActId),
          AND: [unlockedCondition],
        },
        include: ACT_WITH_EVENTS.include,
      });

      if (unlockedNextAct) {
        return unlockedNextAct;
      }
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
        AND: [unlockedCondition],
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
    ownedItemIds: number[],
  ): Promise<{ nextDayId: bigint; nextActId: bigint } | null> {
    const unlockedCondition = this.buildUnlockedActCondition(ownedItemIds);
    const nextDay = await this.prisma.day.findFirst({
      where: {
        characterGroupId: session.characterGroupId,
        dayNumber: { gt: currentAct.day.dayNumber },
      },
      orderBy: { dayNumber: 'asc' },
      include: {
        act: {
          where: unlockedCondition,
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
    if (flowStatus === SessionFlowStatus.GAME_END) {
      const endingResolution = await this.resolveEndingOutcome(session);
      const terminalEvents =
        endingResolution?.events ??
        (choiceOption?.nextEventId
          ? await this.eventAssembler.buildEventChain(
              Number(choiceOption.nextEventId),
            )
          : []);

      await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          status: gameSession_status.GAME_END,
          currentActId: null,
          currentDayId: session.currentDayId ?? session.currentDay?.id ?? null,
          endingId: endingResolution ? endingResolution.endingId : null,
          endedAt: new Date(),
        },
      });

      return {
        sessionId: session.id.toString(),
        status: SessionFlowStatus.GAME_END,
        day: null,
        act: null,
        events: terminalEvents,
        ending: endingResolution?.meta ?? null,
      };
    }

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
        currentDayId: session.currentDayId ?? session.currentDay?.id ?? null,
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
    const inventoryItems = this.mapInventorySummaries(
      session.gameSessionInventory ?? [],
    );
    const deathEnding = await this.loadDeathEndingResolution(
      session,
      inventoryItems,
    );
    const events = deathEnding?.events ?? [];

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        status: gameSession_status.SUDDEN_DEATH,
        currentActId: null,
        currentDayId: session.currentDayId ?? session.currentDay?.id ?? null,
        endingId: deathEnding ? deathEnding.endingId : null,
        endedAt: new Date(),
      },
    });

    return {
      sessionId: session.id.toString(),
      status: SessionFlowStatus.SUDDEN_DEATH,
      day: null,
      act: null,
      events,
      ending: deathEnding?.meta ?? null,
    };
  }

  private async loadDeathEndingResolution(
    session: SessionWithState,
    inventoryItems: InventoryItemSummary[],
  ): Promise<DeathEndingResolution | null> {
    if (!session.characterGroupId) {
      return null;
    }

    const deathEndingIndex = session.characterGroup?.deathEndingIndex;
    if (deathEndingIndex === null || deathEndingIndex === undefined) {
      return null;
    }

    const ending = await this.prisma.ending.findFirst({
      where: {
        characterGroupId: session.characterGroupId,
        priority: deathEndingIndex,
      },
      include: ENDING_WITH_EVENTS.include,
    });

    if (!ending) {
      return null;
    }

    return {
      events: await this.mapEndingEvents(ending, inventoryItems),
      meta: this.buildEndingMeta(ending),
      endingId: ending.id,
    };
  }

  private async mapEndingEvents(
    ending: { endingEvent: EndingWithEvents['endingEvent'] },
    inventoryItems: InventoryItemSummary[],
  ): Promise<SessionEventDto[]> {
    const events: SessionEventDto[] = [];
    for (const endingEvent of ending.endingEvent) {
      const { dto } = await this.eventAssembler.mapEvent(
        endingEvent.event,
        inventoryItems,
      );
      events.push(dto);
    }
    return events;
  }

  private buildEndingMeta(
    ending: Pick<EndingWithEvents, 'id' | 'priority' | 'title' | 'image'>,
  ): SessionEndingMetaDto {
    return {
      endingId: Number(ending.id),
      endingIndex: ending.priority,
      title: ending.title,
      endingImage: ending.image ?? null,
    };
  }

  private async resolveEndingOutcome(
    session: SessionWithState,
  ): Promise<EndingResolution | null> {
    if (!session.characterGroupId) {
      return null;
    }

    const endings: EndingWithFullRelations[] =
      await this.prisma.ending.findMany({
        where: { characterGroupId: session.characterGroupId },
        include: ENDING_WITH_CONDITIONS.include,
        orderBy: { priority: 'asc' },
      });

    if (endings.length === 0) {
      return null;
    }

    const evaluationContext = this.buildEndingEvaluationContext(session);
    const inventoryItems = this.mapInventorySummaries(
      session.gameSessionInventory ?? [],
    );

    for (const ending of endings) {
      if (this.isEndingSatisfied(ending.endingCondition, evaluationContext)) {
        return {
          events: await this.mapEndingEvents(ending, inventoryItems),
          meta: this.buildEndingMeta(ending),
          endingId: ending.id,
        };
      }
    }

    return null;
  }

  private buildEndingEvaluationContext(
    session: SessionWithState,
  ): EndingEvaluationContext {
    const characterStats = new Map<bigint, CharacterStatSnapshot>();
    session.playingCharacterSet?.playingCharacter?.forEach((pc) => {
      characterStats.set(pc.characterId, {
        currentHp: pc.currentHp ?? 0,
        currentMental: pc.currentMental ?? 0,
      });
    });

    const itemQuantities = new Map<bigint, number>();
    (session.gameSessionInventory ?? []).forEach((record) => {
      itemQuantities.set(record.itemId, record.quantity);
    });

    return {
      characterStats,
      itemQuantities,
      lifePoint: session.lifePoint ?? 0,
    };
  }

  private isEndingSatisfied(
    conditions: endingCondition[],
    context: EndingEvaluationContext,
  ): boolean {
    for (const condition of conditions) {
      switch (condition.conditionType) {
        case endingCondition_conditionType.CHARACTER_STAT:
          if (
            !this.satisfiesCharacterCondition(condition, context.characterStats)
          ) {
            return false;
          }
          break;
        case endingCondition_conditionType.ITEM:
          if (!this.satisfiesItemCondition(condition, context.itemQuantities)) {
            return false;
          }
          break;
        case endingCondition_conditionType.SESSION_STAT:
          if (!this.satisfiesSessionCondition(condition, context.lifePoint)) {
            return false;
          }
          break;
        default:
          return false;
      }
    }
    return true;
  }

  private satisfiesCharacterCondition(
    condition: endingCondition,
    characterStats: Map<bigint, CharacterStatSnapshot>,
  ): boolean {
    if (!condition.targetId || !condition.statType) {
      return false;
    }

    const stats = characterStats.get(condition.targetId);
    if (!stats) {
      return false;
    }

    const actualValue =
      condition.statType === 'HP' ? stats.currentHp : stats.currentMental;
    return this.compareValues(
      actualValue,
      condition.value,
      condition.comparison,
    );
  }

  private satisfiesItemCondition(
    condition: endingCondition,
    itemQuantities: Map<bigint, number>,
  ): boolean {
    if (!condition.targetId) {
      return false;
    }

    const quantity = itemQuantities.get(condition.targetId) ?? 0;
    return this.compareValues(quantity, condition.value, condition.comparison);
  }

  private satisfiesSessionCondition(
    condition: endingCondition,
    lifePoint: number,
  ): boolean {
    if (condition.statType !== 'LIFE_POINT') {
      return false;
    }

    return this.compareValues(lifePoint, condition.value, condition.comparison);
  }

  private compareValues(
    actual: number,
    required: number,
    comparison?: string,
  ): boolean {
    switch (comparison) {
      case '>':
        return actual > required;
      case '<':
        return actual < required;
      case '<=':
        return actual <= required;
      case '==':
        return actual === required;
      case '>=':
      default:
        return actual >= required;
    }
  }

  private readonly logger = new Logger(SessionsService.name);

  private async applyClientUpdates(
    session: SessionWithState,
    updates?: NextActUpdatesDto,
  ): Promise<SessionWithState> {
    if (!updates) {
      return session;
    }

    this.logger.debug(
      `Applying Client Updates for Session ${session.id}: ${JSON.stringify(updates)}`,
    );

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
        (pc) =>
          pc.character.code.toLowerCase() ===
          change.characterCode.toLowerCase(),
      );

      if (!target) {
        throw this.createBadRequest(
          'CHARACTER_NOT_FOUND',
          `캐릭터 ${change.characterCode}를 찾을 수 없습니다.`,
        );
      }

      const updateData: Prisma.playingCharacterUpdateInput = {};

      if (change.hpChange !== 0) {
        this.ensureCharacterStatInitialized({
          characterCode: change.characterCode,
          statName: 'HP',
          currentValue: target.currentHp,
        });
        updateData.currentHp = { increment: change.hpChange };
      }

      if (change.mentalChange !== 0) {
        this.ensureCharacterStatInitialized({
          characterCode: change.characterCode,
          statName: 'MENTAL',
          currentValue: target.currentMental,
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
      if (
        normalizedType === 'lifepoint' ||
        normalizedType === 'life_point' ||
        normalizedType === 'life point'
      ) {
        this.ensureLifePointInitialized(session.lifePoint);
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
      const item = await tx.item.findUnique({
        where: { id: itemId },
        select: { capacityCost: true },
      });
      const capacityCost = item?.capacityCost ?? 0;

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

      if (change.quantityChange > 0 && capacityCost > 0) {
        await tx.gameSession.update({
          where: { id: session.id },
          data: {
            bagCapacityUsed:
              (session.bagCapacityUsed ?? 0) +
              capacityCost * change.quantityChange,
          },
        });
        session.bagCapacityUsed =
          (session.bagCapacityUsed ?? 0) + capacityCost * change.quantityChange;
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
      name: record.item.name ?? null,
      image: record.item.image ?? null,
    }));
  }

  private getOwnedItemIds(session: SessionWithState): number[] {
    const ids = new Set<number>();
    (session.gameSessionInventory ?? []).forEach((record) => {
      if (record.quantity > 0) {
        ids.add(Number(record.itemId));
      }
    });
    return Array.from(ids);
  }

  private buildUnlockedActCondition(
    ownedItemIds: number[],
  ): Prisma.actWhereInput {
    if (ownedItemIds.length === 0) {
      return { triggerItemId: null };
    }

    return {
      OR: [
        { triggerItemId: null },
        { triggerItemId: { in: ownedItemIds.map((id) => BigInt(id)) } },
      ],
    };
  }

  private isActUnlocked(
    act: Pick<ActWithEvents, 'triggerItemId'>,
    ownedItemIds: number[],
  ): boolean {
    if (act.triggerItemId === null) {
      return true;
    }

    return ownedItemIds.includes(Number(act.triggerItemId));
  }

  private createBadRequest(code: string, message: string): BadRequestException {
    return new BadRequestException({ code, message });
  }

  private ensureCharacterStatInitialized(params: {
    characterCode: string;
    statName: 'HP' | 'MENTAL';
    currentValue: number | null;
  }): void {
    if (params.currentValue === null || params.currentValue === undefined) {
      throw this.createBadRequest(
        `${params.statName}_NOT_INITIALIZED`,
        `캐릭터 ${params.characterCode}의 ${params.statName} 값이 초기화되지 않았습니다.`,
      );
    }
  }

  private ensureLifePointInitialized(currentValue: number | null): void {
    if (currentValue === null || currentValue === undefined) {
      throw this.createBadRequest(
        'LIFE_POINT_NOT_INITIALIZED',
        '세션의 라이프 포인트가 초기화되지 않았습니다.',
      );
    }
  }
}
