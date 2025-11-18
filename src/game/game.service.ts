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
        inventory: {
          include: {
            slots: {
              include: {
                item: true,
              },
            },
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
      inventory: session.inventory
        ? {
            id: Number(session.inventory.id),
            bagId: Number(session.inventory.bagId),
            slots: session.inventory.slots.map((slot) => ({
              id: Number(slot.id),
              invId: Number(slot.invId),
              item: {
                ...slot.item,
                id: Number(slot.item.id),
                itemCategoryId: slot.item.itemCategoryId
                  ? Number(slot.item.itemCategoryId)
                  : null,
                storeSectionId: slot.item.storeSectionId
                  ? Number(slot.item.storeSectionId)
                  : null,
              },
              quantity: slot.quantity,
            })),
          }
        : null,
    };
  }

  async createGameSession(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const existingSession = await tx.gameSession.findFirst({
        where: { userId },
        include: {
          playingCharacterSet: true,
          inventory: true,
        },
      });

      if (existingSession) {
        if (existingSession.inventory) {
          await tx.slot.deleteMany({
            where: { invId: existingSession.inventory.id },
          });
          await tx.inventory.delete({
            where: { id: existingSession.inventory.id },
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
    const [bags, storeSections] = await Promise.all([
      this.prisma.bag.findMany(),
      this.prisma.storeSection.findMany({
        include: {
          items: true,
        },
      }),
    ]);

    const mappedBags = bags.map((b) => ({
      ...b,
      id: Number(b.id),
    }));

    const mappedStoreSections = storeSections.map((section) => ({
      ...section,
      id: Number(section.id),
      items: section.items.map((item) => ({
        ...item,
        id: Number(item.id),
        itemCategoryId: item.itemCategoryId ? Number(item.itemCategoryId) : null,
        storeSectionId: item.storeSectionId ? Number(item.storeSectionId) : null,
      })),
    }));

    return { bags: mappedBags, storeSections: mappedStoreSections };
  }



  async submitInventory(userId: number, dto: SubmitInventoryDto) {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!gameSession) {
      throw new NotFoundException('게임 세션을 찾을 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingInventory = await tx.inventory.findUnique({
        where: { gameSessionId: gameSession.id },
      });

      if (existingInventory) {
        await tx.slot.deleteMany({ where: { invId: existingInventory.id } });
        await tx.inventory.delete({ where: { id: existingInventory.id } });
      }

      const inventory = await tx.inventory.create({
        data: {
          gameSessionId: gameSession.id,
          bagId: dto.bagId,
          slots: {
            create: dto.slots,
          },
        },
        include: {
          slots: {
            include: {
              item: true,
            },
          },
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
          item: {
            ...slot.item,
            id: Number(slot.item.id),
            itemCategoryId: slot.item.itemCategoryId
              ? Number(slot.item.itemCategoryId)
              : null,
            storeSectionId: slot.item.storeSectionId
              ? Number(slot.item.storeSectionId)
              : null,
          },
        })),
      };

      return mappedInventory;
    });
  }
}
