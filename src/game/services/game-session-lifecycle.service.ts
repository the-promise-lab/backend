import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitGameSessionInventoryDto } from '../dto/submit-game-session-inventory.dto';

/**
 * GameSessionLifecycleService centralizes creation and inventory confirmation logic
 * so that both legacy `/game` endpoints and new `/sessions` flows can reuse it.
 */
@Injectable()
export class GameSessionLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deletes any existing session for the user and creates a fresh one with the first available bag.
   */
  async createOrResetSession(userId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existingSession = await tx.gameSession.findFirst({
        where: { userId },
        include: {
          playingCharacterSet: true,
          gameSessionInventory: true,
        },
      });

      if (existingSession) {
        if (existingSession.gameSessionInventory.length > 0) {
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

      await tx.gameSession.create({
        data: { userId, bagId: firstBag.id },
      });
    });
  }

  /**
   * Replaces the current inventory for the user's session with the provided payload.
   */
  async confirmInventory(
    userId: number,
    dto: SubmitGameSessionInventoryDto,
  ): Promise<void> {
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
  }
}
