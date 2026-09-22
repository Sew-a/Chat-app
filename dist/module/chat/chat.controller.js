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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const storage_service_1 = require("../../lib/storage/storage.service");
const group_service_1 = require("../group/group.service");
const chat_service_1 = require("./chat.service");
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
let ChatController = class ChatController {
    chatService;
    storageService;
    groupService;
    constructor(chatService, storageService, groupService) {
        this.chatService = chatService;
        this.storageService = storageService;
        this.groupService = groupService;
    }
    getHistory(user, groupId, cursor) {
        return this.chatService.getHistory(user.userId, groupId, cursor);
    }
    async uploadImage(user, groupId, file) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded (field name must be "file")');
        }
        await this.groupService.assertMembership(user.userId, groupId);
        const imageUrl = await this.storageService.uploadImage(file);
        return { imageUrl };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype?.startsWith('image/')) {
                return cb(new common_1.BadRequestException('Only image files are allowed'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "uploadImage", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('groups/:groupId/messages'),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        storage_service_1.StorageService,
        group_service_1.GroupService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map