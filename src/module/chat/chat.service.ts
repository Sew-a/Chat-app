import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { StorageService } from '../../lib/storage/storage.service';
import { GroupService } from '../group/group.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupService: GroupService,
    private readonly storageService: StorageService,
  ) {}

  async createMessage(userId: string, groupId: string, content?: string, imageUrl?: string | null) {
    if (!content && !imageUrl) {
      throw new BadRequestException('Message must have text or an image');
    }
    if (imageUrl && !this.storageService.isStoredImageUrl(imageUrl)) {
      throw new BadRequestException('imageUrl must come from POST /groups/:groupId/messages/image');
    }

    await this.groupService.assertMembership(userId, groupId);

    return this.prisma.message.create({
      data: { userId, groupId, content, imageUrl },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });
  }

  async getHistory(userId: string, groupId: string, cursor?: string, take = 30) {
    await this.groupService.assertMembership(userId, groupId);

    const messages = await this.prisma.message.findMany({
      where: { groupId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });

    return messages.reverse(); // oldest -> newest for easy rendering
  }
}
