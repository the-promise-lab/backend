import {
  ConflictException,
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
            playingCharacter: true,
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

    return session;
  }

  async createGameSession(userId: number) {
    const existingSession = await this.prisma.gameSession.findFirst({
      where: { userId },
    });

    if (existingSession) {
      throw new ConflictException('이미 진행 중인 게임 세션이 존재합니다.');
    }

    return this.prisma.gameSession.create({
      data: { userId },
    });
  }

  async getCharacterGroups() {
    return this.prisma.characterGroup.findMany();
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
      const playingSet = await tx.playingCharacterSet.create({
        data: {
          gameSessionId: gameSession.id,
          characterGroupId: dto.characterGroupId,
        },
      });

      await tx.playingCharacter.createMany({
        data: characters.map((char) => ({
          playingCharacterSetId: playingSet.id,
          characterId: char.id,
          currentHp: char.defaultHp,
          currentSp: char.defaultSp,
        })),
      });

      return tx.playingCharacterSet.findUnique({
        where: { id: playingSet.id },
        include: { playingCharacter: true },
      });
    });
  }

  async getSetupInfo() {
    const [bags, items] = await Promise.all([
      this.prisma.bag.findMany(),
      this.prisma.item.findMany(),
    ]);
    return { bags, items };
  }

  async submitInventory(userId: number, dto: SubmitInventoryDto) {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!gameSession) {
      throw new NotFoundException('게임 세션을 찾을 수 없습니다.');
    }

    return this.prisma.inventory.create({
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
  }
}
