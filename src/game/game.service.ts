import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SelectCharacterSetDto } from './dto/select-character-set.dto';
import { SubmitGameSessionInventoryDto } from './dto/submit-game-session-inventory.dto';

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
        gameSessionInventory: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('게임 세션을 찾을 수 없습니다.');
    }

    return {
      ...session,
      id: Number(session.id),
      userId: Number(session.userId),
      characterGroupId: session.characterGroupId
        ? Number(session.characterGroupId)
        : null,
      bagId: Number(session.bagId),
      currentDayId: session.currentDayId ? Number(session.currentDayId) : null,
      currentActId: session.currentActId ? Number(session.currentActId) : null,
      endingId: session.endingId ? Number(session.endingId) : null,
      playingCharacterSet: session.playingCharacterSet
        ? {
            id: Number(session.playingCharacterSet.id),
            gameSessionId: Number(session.playingCharacterSet.gameSessionId),
            characterGroupId: Number(
              session.playingCharacterSet.characterGroupId,
            ),
            playingCharacter: session.playingCharacterSet.playingCharacter.map(
              (pc) => ({
                id: Number(pc.id),
                playingCharacterSetId: Number(pc.playingCharacterSetId),
                characterId: Number(pc.characterId),
                currentHp: pc.currentHp,
                currentMental: pc.currentMental,
              }),
            ),
          }
        : null,
      gameSessionInventory: session.gameSessionInventory.map((inv) => ({
        sessionId: Number(inv.sessionId),
        itemId: Number(inv.itemId),
        quantity: inv.quantity,
      })),
    };
  }

  async createGameSession(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const existingSession = await tx.gameSession.findFirst({
        where: { userId },
        include: {
          playingCharacterSet: true,
          gameSessionInventory: true,
        },
      });

      if (existingSession) {
        if (existingSession.gameSessionInventory) {
          await tx.gameSessionInventory.deleteMany({
            where: { sessionId: existingSession.id },
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

      const firstBag = await tx.bag.findFirst();
      if (!firstBag) {
        throw new NotFoundException('가방을 찾을 수 없습니다.');
      }

      const session = await tx.gameSession.create({
        data: { userId, bagId: firstBag.id },
      });
      return {
        ...session,
        id: Number(session.id),
        userId: Number(session.userId),
        characterGroupId: session.characterGroupId
          ? Number(session.characterGroupId)
          : null,
        bagId: Number(session.bagId),
        currentDayId: session.currentDayId
          ? Number(session.currentDayId)
          : null,
        currentActId: session.currentActId
          ? Number(session.currentActId)
          : null,
        endingId: session.endingId ? Number(session.endingId) : null,
      };
    });
  }

  async getCharacterGroups() {
    const groups = await this.prisma.characterGroup.findMany();
    return groups.map((g) => ({
      id: Number(g.id),
      code: g.code,
      name: g.name,
      groupSelectImage: g.groupSelectImage,
      deathEndActId: g.deathEndActId ? Number(g.deathEndActId) : null,
      prologActId: g.prologActId ? Number(g.prologActId) : null,
      description: g.description,
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

    const groupMembers = await this.prisma.characterGroupMember.findMany({
      where: {
        characterGroupId: dto.characterGroupId,
      },
      include: {
        character: true,
      },
    });

    if (groupMembers.length === 0) {
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
        data: groupMembers.map((member) => ({
          playingCharacterSetId: playingSet.id,
          characterId: member.characterId,
          currentHp: member.character.defaultHp,
          currentMental: member.character.defaultMental,
        })),
      });

      const result = await tx.playingCharacterSet.findUnique({
        where: { id: playingSet.id },
        include: { playingCharacter: true },
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
        })),
      };
    });
  }

  async getSetupInfo() {
    const [bags, storeSections] = await Promise.all([
      this.prisma.bag.findMany(),
      this.prisma.storeSection.findMany({
        include: {
          item: true,
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
      items: section.item.map((item) => ({
        ...item,
        id: Number(item.id),
        storeSectionId: item.storeSectionId ? Number(item.storeSectionId) : null,
      })),
    }));

    return { bags: mappedBags, storeSections: mappedStoreSections };
  }



  async submitGameSessionInventory(userId: number, dto: SubmitGameSessionInventoryDto) {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!gameSession) {
      throw new NotFoundException('게임 세션을 찾을 수 없습니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gameSessionInventory.deleteMany({
        where: { sessionId: gameSession.id },
      });

      await tx.gameSession.update({
        where: { id: gameSession.id },
        data: { bagId: dto.bagId },
      });

      await tx.gameSessionInventory.createMany({
        data: dto.items.map((item) => ({
          sessionId: gameSession.id,
          itemId: item.itemId,
          quantity: item.quantity,
        })),
      });
    });

    return this.findGameSession(userId);
  }
}
