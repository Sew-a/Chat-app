"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
const common_1 = require("@nestjs/common");
const nanoid_1 = require("nanoid");
const prisma_service_1 = require("../../lib/database/prisma.service");
const generateInviteCode = (0, nanoid_1.customAlphabet)('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 8);
let GroupService = class GroupService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createGroup(userId, name) {
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
            }
            catch (err) {
                if (err.code === 'P2002')
                    continue;
                throw err;
            }
        }
        throw new common_1.ConflictException('Could not generate a unique invite code, try again');
    }
    async joinGroup(userId, inviteCode) {
        const group = await this.prisma.group.findUnique({ where: { inviteCode } });
        if (!group)
            throw new common_1.NotFoundException('No group found with that invite code');
        await this.prisma.groupMember.upsert({
            where: { userId_groupId: { userId, groupId: group.id } },
            create: { userId, groupId: group.id },
            update: {},
        });
        return group;
    }
    async listMyGroups(userId) {
        return this.prisma.group.findMany({
            where: { members: { some: { userId } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async assertMembership(userId, groupId) {
        const membership = await this.prisma.groupMember.findUnique({
            where: { userId_groupId: { userId, groupId } },
        });
        if (!membership)
            throw new common_1.NotFoundException('Not a member of this group');
    }
};
exports.GroupService = GroupService;
exports.GroupService = GroupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupService);
//# sourceMappingURL=group.service.js.map