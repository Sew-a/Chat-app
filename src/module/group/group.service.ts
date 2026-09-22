import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../../lib/database/prisma.service';

// Unambiguous alphabet (no 0/O, 1/I) — this is the single "invite code" a user
// shares to let someone else join their group. There is no separate password.
const generateInviteCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 8);

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(userId: string, name?: string) {
    // Retry on the astronomically unlikely chance of a collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = generateInviteCode();
      try {
        return await this.prisma.group.create({
          data: {
            name,
            inviteCode,
            members: { create: { userId } },
          },
          include: { members: true },
        });
      } catch (err: any) {
        if (err.code === 'P2002') continue; // unique constraint clash — retry
        throw err;
      }
    }
    throw new ConflictException('Could not generate a unique invite code, try again');
  }

  async joinGroup(userId: string, inviteCode: string) {
    const group = await this.prisma.group.findUnique({ where: { inviteCode } });
    if (!group) throw new NotFoundException('No group found with that invite code');

    await this.prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId: group.id } },
      create: { userId, groupId: group.id },
      update: {},
    });

    return group;
  }

  async listMyGroups(userId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assertMembership(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) throw new NotFoundException('Not a member of this group');
  }
}
