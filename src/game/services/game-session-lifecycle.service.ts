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
      const firstBag = await tx.bag.findFirst();
      if (!firstBag) {
        throw new NotFoundException('가방을 찾을 수 없습니다.');
      }

      const existingInProgressSession = await tx.gameSession.findFirst({
        where: { userId, status: 'IN_PROGRESS' },
        orderBy: { id: 'desc' },
      });

      if (existingInProgressSession) {
        await tx.gameSession.update({
          where: { id: existingInProgressSession.id },
          data: { status: 'GIVE_UP', endedAt: new Date() },
        });
      }

      await tx.gameSession.create({
        data: { userId, bagId: firstBag.id, status: 'IN_PROGRESS' },
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
    await this.prisma.$transaction(async (tx) => {
      const gameSession = await tx.gameSession.findFirst({
        where: { userId, status: 'IN_PROGRESS' },
        select: { id: true },
        orderBy: { id: 'desc' },
      });

      if (!gameSession) {
        throw new NotFoundException('게임 세션을 찾을 수 없습니다.');
      }

      await tx.gameSessionInventory.deleteMany({
        where: { sessionId: gameSession.id },
      });

      await tx.gameSession.update({
        where: { id: gameSession.id },
        data: { bagId: dto.bagId, bagConfirmedAt: new Date() },
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
