import { Injectable } from '@nestjs/common';
import { Prisma, gameSession_status } from '@prisma/client';
import { SessionReportTab } from '../dto/session-report-tab.enum';
import { SessionReportResponseDto } from '../dto/session-report-response.dto';

type SessionWithReportRelations = Prisma.gameSessionGetPayload<{
  include: {
    user: true;
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
  private readonly point1GoodChoices = new Set<number>([
    9,
    10, // act 10103 good
    25,
    26, // act 10201 good
    33,
    34,
    36, // act 10203 good
  ]);

  private readonly point2GoodChoices = new Set<number>([
    61, // 10403 option 1
    77,
    78, // 10601 option 1,2
    81,
    82,
    83, // 10602 option 1,2,3
    84, // 10602 option 4 (good)
  ]);

  private readonly badChoices = new Set<number>([
    // 10103
    11, 12,
    // 10201
    27, 28,
    // 10203
    35,
    // 10403
    62, 63,
    // 10601
    79,
  ]);

  private readonly pointDescriptions = {
    point1: {
      good: '물과 보온 용품을 준비하고, 심리적 안정을 위한 애착 물건을 챙기는 것은 극한 상황을 대비하는 훌륭한 전략입니다.',
      bad: '재난 상황에서는 물을 충분히 확보하고, 체온 유지를 위한 물품을 준비해야 합니다. 평소 애착 물건은 심리적 안정을 돕습니다.',
    },
    point2: {
      good: '개인의 특성에 맞춘 준비는 극한 상황에서 생존 확률을 높이는 탁월한 선택입니다.',
      bad: '개인 특성에 맞춘 준비가 생존의 핵심입니다. 수면 예민/시력 보조 등 개인화 준비가 필요합니다.',
    },
  };

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
    const points = this.buildPoints(session);
    const experiencePoints = this.buildExperiencePoints(session);
    const hiddenStats = this.buildHiddenStats(session);

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
      userName: session.user?.name ?? '',
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
      grade: (ending as { grade?: string }).grade ?? null,
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
    const efficiency = this.computeBagEfficiency(session);

    return {
      bagId: session.bag ? Number(session.bag.id) : 0,
      bagName: session.bag?.name ?? 'Unknown',
      capacity,
      usedCapacity,
      usageRate,
      grade: null,
      efficiency,
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
    const choiceIds = session.gameSessionHistory.map((h) =>
      Number(h.choiceOptionId),
    );

    let goodChoices = 0;
    let badChoices = 0;
    let neutralChoices = 0;

    for (const id of choiceIds) {
      if (this.point1GoodChoices.has(id) || this.point2GoodChoices.has(id)) {
        goodChoices += 1;
      } else if (this.badChoices.has(id)) {
        badChoices += 1;
      } else {
        neutralChoices += 1;
      }
    }

    const totalChoices = choiceIds.length;
    const survivalDays = session.currentDay?.dayNumber ?? null;
    return {
      lifePoint: session.lifePoint,
      survivalDays,
      totalChoices,
      goodChoices,
      badChoices,
      neutralChoices,
    };
  }

  private buildPoints(session: SessionWithReportRelations) {
    const choiceIds = session.gameSessionHistory.map((h) =>
      Number(h.choiceOptionId),
    );

    const point1Good = choiceIds.filter((id) =>
      this.point1GoodChoices.has(id),
    ).length;
    const point2Good = choiceIds.filter((id) =>
      this.point2GoodChoices.has(id),
    ).length;

    const points = [];

    points.push({
      type: point1Good >= 2 ? 'GOOD' : 'BAD',
      category: 'POINT1',
      title: '재난 일반',
      description:
        point1Good >= 2
          ? this.pointDescriptions.point1.good
          : this.pointDescriptions.point1.bad,
      dayNumber: null,
      actId: null,
      points: point1Good,
    });

    points.push({
      type: point2Good >= 2 ? 'GOOD' : 'BAD',
      category: 'POINT2',
      title: '개인 특성',
      description:
        point2Good >= 2
          ? this.pointDescriptions.point2.good
          : this.pointDescriptions.point2.bad,
      dayNumber: null,
      actId: null,
      points: point2Good,
    });

    return points;
  }

  private buildExperiencePoints(session: SessionWithReportRelations) {
    const characters = session.playingCharacterSet?.playingCharacter ?? [];
    const characterTotal = characters.reduce((acc, pc) => {
      return acc + (pc.currentHp ?? 0) + (pc.currentMental ?? 0);
    }, 0);

    const lifePoint = session.lifePoint ?? 0;
    return {
      total: characterTotal + lifePoint,
    };
  }

  private buildHiddenStats(session: SessionWithReportRelations) {
    return [
      {
        statCode: 'life_point',
        name: 'LifePoint',
        value: session.lifePoint,
        maxValue: 100,
        grade: null,
        description: '세션의 생존 포인트',
      },
    ];
  }

  private computeBagEfficiency(
    session: SessionWithReportRelations,
  ): number | null {
    const ownedCount = session.gameSessionInventory.reduce(
      (sum, inv) => sum + inv.quantity,
      0,
    );
    if (ownedCount === 0) {
      return null;
    }

    const usedCount = session.gameSessionHistory.filter(
      (h) => h.itemId !== null,
    ).length;

    const efficiency = (usedCount / ownedCount) * 100;
    return Number(efficiency.toFixed(2));
  }
}
