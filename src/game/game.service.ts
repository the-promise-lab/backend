import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SelectCharacterSetDto } from './dto/select-character-set.dto';
import { SubmitInventoryDto } from './dto/submit-inventory.dto';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async findGameSession(userId: number) {
    const session = await this.prisma.gameSession.findFirst({
      where: { userId },
      include: {
        playingCharacterSet: {
          include: {
            playingCharacter: {
              include: {
                character: true,
              },
            },
          },
        },
        inventories: {
          include: {
            slots: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('게임 세션을 찾을 수 없습니다.');
    }

    return {
      id: Number(session.id),
      userId: Number(session.userId),
      currentActId: session.currentActId ? Number(session.currentActId) : null,
      createdAt: session.createdAt,
      playingCharacterSet: session.playingCharacterSet
        ? {
            id: Number(session.playingCharacterSet.id),
            characterGroupId: Number(
              session.playingCharacterSet.characterGroupId,
            ),
            playingCharacter: session.playingCharacterSet.playingCharacter.map(
              (pc) => ({
                id: Number(pc.id),
                playingCharacterSetId: Number(pc.playingCharacterSetId),
                character: {
                  ...pc.character,
                  id: BigInt(pc.character.id),
                  characterGroupId: pc.character.characterGroupId
                    ? BigInt(pc.character.characterGroupId)
                    : null,
                },
                currentHp: pc.currentHp,
                currentSp: pc.currentSp,
              }),
            ),
          }
        : null,
      inventories: session.inventories.map((inv) => ({
        id: Number(inv.id),
        bagId: Number(inv.bagId),
        slots: inv.slots.map((slot) => ({
          id: Number(slot.id),
          invId: Number(slot.invId),
          itemId: Number(slot.itemId),
          quantity: slot.quantity,
        })),
      })),
    };
  }

  async createGameSession(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const existingSession = await tx.gameSession.findFirst({
        where: { userId },
        include: {
          inventories: true,
          playingCharacterSet: true,
        },
      });

      if (existingSession) {
        if (existingSession.inventories.length > 0) {
          const inventoryIds = existingSession.inventories.map((inv) => inv.id);
          await tx.slot.deleteMany({
            where: { invId: { in: inventoryIds } },
          });
          await tx.inventory.deleteMany({
            where: { gameSessionId: existingSession.id },
          });
        }

        if (existingSession.playingCharacterSet) {
          await tx.playingCharacter.deleteMany({
            where: {
              playingCharacterSetId: existingSession.playingCharacterSet.id,
            },
          });
          await tx.playingCharacterSet.delete({
            where: { id: existingSession.playingCharacterSet.id },
          });
        }

        await tx.gameSession.delete({ where: { id: existingSession.id } });
      }

      const session = await tx.gameSession.create({
        data: { userId },
      });
      return {
        ...session,
        id: Number(session.id),
        userId: Number(session.userId),
        currentActId: session.currentActId
          ? Number(session.currentActId)
          : null,
      };
    });
  }

  async getCharacterGroups() {
    const groups = await this.prisma.characterGroup.findMany();
    return groups.map((g) => ({
      ...g,
      id: Number(g.id),
    }));
  }

  async selectCharacterSet(userId: number, dto: SelectCharacterSetDto) {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!gameSession) {
      throw new NotFoundException('게임 세션을 찾을 수 없습니다.');
    }

    const characters = await this.prisma.character.findMany({
      where: {
        characterGroupId: dto.characterGroupId,
      },
    });

    if (characters.length === 0) {
      throw new NotFoundException('선택한 그룹에 캐릭터가 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const playingSet = await tx.playingCharacterSet.upsert({
        where: { gameSessionId: gameSession.id },
        update: {
          characterGroupId: dto.characterGroupId,
        },
        create: {
          gameSessionId: gameSession.id,
          characterGroupId: dto.characterGroupId,
        },
      });

      // Delete old characters and create new ones
      await tx.playingCharacter.deleteMany({
        where: { playingCharacterSetId: playingSet.id },
      });

      await tx.playingCharacter.createMany({
        data: characters.map((char) => ({
          playingCharacterSetId: playingSet.id,
          characterId: char.id,
          currentHp: char.defaultHp,
          currentSp: char.defaultSp,
        })),
      });

      const result = await tx.playingCharacterSet.findUnique({
        where: { id: playingSet.id },
        include: { playingCharacter: { include: { character: true } } },
      });

      if (!result) {
        return null;
      }

      return {
        ...result,
        id: Number(result.id),
        gameSessionId: Number(result.gameSessionId),
        characterGroupId: Number(result.characterGroupId),
        playingCharacter: result.playingCharacter.map((pc) => ({
          ...pc,
          id: Number(pc.id),
          playingCharacterSetId: Number(pc.playingCharacterSetId),
          characterId: Number(pc.characterId),
          character: {
            ...pc.character,
            id: BigInt(pc.character.id),
            characterGroupId: pc.character.characterGroupId
              ? BigInt(pc.character.characterGroupId)
              : null,
          },
        })),
      };
    });
  }

  async getSetupInfo() {
    const [bags, items] = await Promise.all([
      this.prisma.bag.findMany(),
      this.prisma.item.findMany(),
    ]);

    const mappedBags = bags.map((b) => ({
      ...b,
      id: Number(b.id),
    }));

    const mappedItems = items.map((i) => ({
      ...i,
      id: Number(i.id),
      itemCategoryId: i.itemCategoryId ? Number(i.itemCategoryId) : null,
    }));

    return { bags: mappedBags, items: mappedItems };
  }

  async getPrologEvents(userId: number) {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: { userId },
      include: {
        playingCharacterSet: {
          include: {
            characterGroup: {
              include: {
                prologAct: {
                  include: {
                    events: {
                      orderBy: {
                        order: 'asc',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!gameSession) {
      throw new NotFoundException('게임 세션을 찾을 수 없습니다.');
    }

    if (!gameSession.playingCharacterSet) {
      throw new NotFoundException('캐릭터 그룹이 선택되지 않았습니다.');
    }

    const prologAct = gameSession.playingCharacterSet.characterGroup?.prologAct;

    if (!prologAct) {
      return [];
    }

    return prologAct.events.map((event) => ({
      ...event,
      id: BigInt(event.id),
      actId: BigInt(event.actId),
    }));
  }

  async submitInventory(userId: number, dto: SubmitInventoryDto) {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!gameSession) {
      throw new NotFoundException('게임 세션을 찾을 수 없습니다.');
    }

    const inventory = await this.prisma.inventory.create({
      data: {
        gameSessionId: gameSession.id,
        bagId: dto.bagId,
        slots: {
          create: dto.slots,
        },
      },
      include: {
        slots: true,
      },
    });

    const mappedInventory = {
      ...inventory,
      id: Number(inventory.id),
      gameSessionId: Number(inventory.gameSessionId),
      bagId: Number(inventory.bagId),
      slots: inventory.slots.map((slot) => ({
        ...slot,
        id: Number(slot.id),
        invId: Number(slot.invId),
        itemId: Number(slot.itemId),
      })),
    };

    return { inventories: [mappedInventory] };
  }
}
