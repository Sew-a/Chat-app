import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { imageUploadOptions } from '../../common/upload/image-upload.options';
import { StorageService } from '../../lib/storage/storage.service';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly storageService: StorageService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return this.userService.getProfile(user.userId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.userId, dto);
  }

  // multipart/form-data upload (field "file"): stores the image in R2 under
  // avatars/ and sets it as the user's avatar. Returns the updated profile.
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async uploadAvatar(@CurrentUser() user: RequestUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded (field name must be "file")');
    }
    const avatarUrl = await this.storageService.uploadImage(file, 'avatars');
    return this.userService.updateProfile(user.userId, { avatarUrl });
  }
}
