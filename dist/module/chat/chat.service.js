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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../lib/database/prisma.service");
const group_service_1 = require("../group/group.service");
let ChatService = class ChatService {
    prisma;
    groupService;
    constructor(prisma, groupService) {
        this.prisma = prisma;
        this.groupService = groupService;
    }
    async createMessage(userId, groupId, content, imageUrl) {
        if (!content && !imageUrl) {
            throw new common_1.BadRequestException('Message must have text or an image');
        }
        await this.groupService.assertMembership(userId, groupId);
        return this.prisma.message.create({
            data: { userId, groupId, content, imageUrl },
            include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        });
    }
    async getHistory(userId, groupId, cursor, take = 30) {
        await this.groupService.assertMembership(userId, groupId);
        const messages = await this.prisma.message.findMany({
            where: { groupId },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        });
        return messages.reverse();
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        group_service_1.GroupService])
], ChatService);
//# sourceMappingURL=chat.service.js.map