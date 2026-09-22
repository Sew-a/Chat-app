import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { StorageService } from '../../lib/storage/storage.service';
import { GroupService } from '../group/group.service';
import { ChatService } from './chat.service';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/messages')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly storageService: StorageService,
    private readonly groupService: GroupService,
  ) {}

  @Get()
  getHistory(
    @CurrentUser() user: RequestUser,
    @Param('groupId') groupId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chatService.getHistory(user.userId, groupId, cursor);
  }

  // multipart/form-data upload; returns { imageUrl } which the client then
  // sends over the WebSocket `send_message` event alongside any caption text.
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser() user: RequestUser,
    @Param('groupId') groupId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded (field name must be "file")');
    }
    await this.groupService.assertMembership(user.userId, groupId);
    const imageUrl = await this.storageService.uploadImage(file);
    return { imageUrl };
  }
}
