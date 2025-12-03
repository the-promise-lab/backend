
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
      where: { userId, status: 'IN_PROGRESS' },
      orderBy: { id: 'desc' },
      include: {
        bag: true,
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
      id: Number(session.id),
      userId: Number(session.userId),
      bag: {
        id: Number(session.bag.id),
        code: session.bag.code,
        name: session.bag.name,
        capacity: session.bag.capacity,
        image: session.bag.image,
        description: session.bag.description,
      },
      bagCapacityUsed: session.bagCapacityUsed,
      bagConfirmedAt: session.bagConfirmedAt,
      status: session.status,
      lifePoint: session.lifePoint,
      currentDayId: session.currentDayId ? Number(session.currentDayId) : null,
      currentActId: session.currentActId ? Number(session.currentActId) : null,
      endingId: session.endingId ? Number(session.endingId) : null,
      endedAt: session.endedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
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
                character: {
                  id: Number(pc.character.id),
                  code: pc.character.code,
                  name: pc.character.name,
                  age: pc.character.age,
                  description: pc.character.description,
                  selectImage: pc.character.selectImage,
                  portraitImage: pc.character.portraitImage,
                  defaultHp: pc.character.defaultHp,
                  defaultMental: pc.character.defaultMental,
                  bgColor: pc.character.bgColor,
                  borderColor: pc.character.borderColor,
                },
                currentHp: pc.currentHp,
                currentMental: pc.currentMental,
              }),
            ),
          }
        : null,
      gameSessionInventory: session.gameSessionInventory.map((inv) => ({
        sessionId: Number(inv.sessionId),
        item: {
          id: Number(inv.item.id),
          name: inv.item.name,
          image: inv.item.image,
          capacityCost: inv.item.capacityCost,
          isConsumable: inv.item.isConsumable,
          storeSectionId: inv.item.storeSectionId
            ? Number(inv.item.storeSectionId)
            : null,
          isVisable: inv.item.isVisable,
          positionX: inv.item.positionX,
          positionY: inv.item.positionY,
        },
        quantity: inv.quantity,
      })),
    };
  }

  async createGameSession(userId: number) {
    await this.prisma.$transaction(async (tx) => {
      const existingSession = await tx.gameSession.findFirst({
        where: { userId, status: 'IN_PROGRESS' },
        orderBy: { id: 'desc' },
      });

      if (existingSession) {
        await tx.gameSession.update({
          where: { id: existingSession.id },
          data: { status: 'GIVE_UP', endedAt: new Date() },
        });
      }

      const firstBag = await tx.bag.findFirst();
      if (!firstBag) {
        throw new NotFoundException('가방을 찾을 수 없습니다.');
      }

      await tx.gameSession.create({
        data: { userId, bagId: firstBag.id },
      });
    });

    return this.findGameSession(userId);
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
      where: { userId, status: 'IN_PROGRESS' },
      orderBy: { id: 'desc' },
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
        include: { playingCharacter: { include: { character: true } } },
      });

      if (!result) {
        return null;
      }

      return {
        id: Number(result.id),
        gameSessionId: Number(result.gameSessionId),
        characterGroupId: result.characterGroupId
          ? Number(result.characterGroupId)
          : null,
        playingCharacter: result.playingCharacter.map((pc) => ({
          id: Number(pc.id),
          playingCharacterSetId: Number(pc.playingCharacterSetId),
          characterId: Number(pc.characterId),
          character: {
            id: Number(pc.character.id),
            code: pc.character.code,
            name: pc.character.name,
            age: pc.character.age,
            description: pc.character.description,
            selectImage: pc.character.selectImage,
            portraitImage: pc.character.portraitImage,
            defaultHp: pc.character.defaultHp,
            defaultMental: pc.character.defaultMental,
            bgColor: pc.character.bgColor,
            borderColor: pc.character.borderColor,
          },
          currentHp: pc.currentHp,
          currentMental: pc.currentMental,
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
      id: Number(b.id),
      code: b.code,
      name: b.name,
      capacity: b.capacity,
      image: b.image,
      description: b.description,
    }));

    const mappedStoreSections = storeSections.map((section) => ({
      id: Number(section.id),
      code: section.code,
      displayName: section.displayName,
      backgroundImage: section.backgroundImage,
      items: section.item.map((item) => ({
        id: Number(item.id),
        name: item.name,
        image: item.image,
        capacityCost: item.capacityCost,
        isConsumable: item.isConsumable,
        storeSectionId: item.storeSectionId
          ? Number(item.storeSectionId)
          : null,
        isVisable: item.isVisable,
        positionX: item.positionX,
        positionY: item.positionY,
      })),
    }));

    return { bags: mappedBags, storeSections: mappedStoreSections };
  }



  async submitGameSessionInventory(userId: number, dto: SubmitGameSessionInventoryDto) {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: { userId, status: 'IN_PROGRESS' },
      orderBy: { id: 'desc' },
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
