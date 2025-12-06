import { Injectable } from '@nestjs/common';
import { Prisma, gameSession_status } from '@prisma/client';
import { SessionReportTab } from '../dto/session-report-tab.enum';
import { SessionReportResponseDto } from '../dto/session-report-response.dto';

type SessionWithReportRelations = Prisma.gameSessionGetPayload<{
  include: {
    characterGroup: true;
    bag: true;
    ending: true;
    playingCharacterSet: {
      include: {
        playingCharacter: {
          include: {
            character: true;
          };
        };
      };
    };
    gameSessionInventory: {
      include: {
        item: true;
      };
    };
    gameSessionHistory: true;
    sessionStatHistory: true;
    currentDay: true;
  };
}>;

interface BuildReportParams {
  readonly session: SessionWithReportRelations;
  readonly tab: SessionReportTab;
  readonly includeInventory: boolean;
}

@Injectable()
export class ReportAssembler {
  buildResultReport(params: BuildReportParams): SessionReportResponseDto {
    const { session, tab, includeInventory } = params;
    const meta = this.buildSessionMeta(session);
    const ending = this.buildEnding(session);
    const characters = this.buildCharacters(session);
    const survivalBag = this.buildBag(session);
    const inventory = includeInventory
      ? this.buildInventory(session)
      : undefined;
    const finalStats = this.buildFinalStats(session);
    const points = this.buildPoints();
    const experiencePoints = this.buildExperiencePoints();
    const hiddenStats = this.buildHiddenStats();

    return {
      success: true,
      data: {
        session: meta,
        tab,
        result: {
          ending,
          finalStats,
          characters,
          hiddenStats,
          survivalBag,
          inventory,
          points,
          experiencePoints,
        },
      },
    };
  }

  private buildSessionMeta(
    session: SessionWithReportRelations,
  ): SessionReportResponseDto['data']['session'] {
    const totalPlayTimeSeconds =
      session.endedAt && session.createdAt
        ? Math.max(
            0,
            Math.floor(
              (new Date(session.endedAt).getTime() -
                new Date(session.createdAt).getTime()) /
                1000,
            ),
          )
        : null;

    return {
      id: Number(session.id),
      characterGroupCode: session.characterGroup?.code ?? null,
      characterGroupName: session.characterGroup?.name ?? null,
      status: session.status ?? gameSession_status.IN_PROGRESS,
      endedAt: session.endedAt ?? null,
      createdAt: session.createdAt ?? new Date(),
      totalPlayTimeSeconds,
      lifePoint: session.lifePoint,
    };
  }

  private buildEnding(session: SessionWithReportRelations) {
    const ending = session.ending;
    if (!ending) {
      return {
        endingId: null,
        endingIndex: null,
        title: null,
        grade: null,
        image: null,
      };
    }

    return {
      endingId: Number(ending.id),
      endingIndex: ending.priority,
      title: ending.title,
      grade: null,
      image: ending.image ?? null,
    };
  }

  private buildCharacters(session: SessionWithReportRelations) {
    const playingCharacters =
      session.playingCharacterSet?.playingCharacter ?? [];
    return playingCharacters.map((pc) => ({
      characterCode: pc.character.code,
      name: pc.character.name,
      finalHp: pc.currentHp,
      finalMental: pc.currentMental,
      maxHp: pc.character.defaultHp ?? null,
      maxMental: pc.character.defaultMental ?? null,
      survivalStatus:
        pc.currentHp <= 0 || pc.currentMental <= 0 ? 'DEAD' : 'ALIVE',
    }));
  }

  private buildBag(session: SessionWithReportRelations) {
    const capacity = session.bag?.capacity ?? 0;
    const usedCapacity = session.bagCapacityUsed ?? null;
    const usageRate =
      capacity > 0 && usedCapacity !== null
        ? Number(((usedCapacity / capacity) * 100).toFixed(2))
        : null;

    return {
      bagId: session.bag ? Number(session.bag.id) : 0,
      bagName: session.bag?.name ?? 'Unknown',
      capacity,
      usedCapacity,
      usageRate,
      grade: null,
    };
  }

  private buildInventory(session: SessionWithReportRelations) {
    return session.gameSessionInventory.map((inv) => ({
      itemId: Number(inv.itemId),
      itemName: inv.item.name,
      quantity: inv.quantity,
    }));
  }

  private buildFinalStats(session: SessionWithReportRelations) {
    const totalChoices = session.gameSessionHistory.length;
    const survivalDays = session.currentDay?.dayNumber ?? null;
    return {
      lifePoint: session.lifePoint,
      survivalDays,
      totalChoices,
      goodChoices: null,
      badChoices: null,
      neutralChoices: null,
    };
  }

  private buildPoints() {
    return [];
  }

  private buildExperiencePoints() {
    return {
      total: null,
    };
  }

  private buildHiddenStats() {
    return [];
  }
}
