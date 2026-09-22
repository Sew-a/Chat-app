import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateGroupDto) {
    return this.groupService.createGroup(user.userId, dto.name);
  }

  @Post('join')
  join(@CurrentUser() user: RequestUser, @Body() dto: JoinGroupDto) {
    return this.groupService.joinGroup(user.userId, dto.inviteCode);
  }

  @Get()
  listMine(@CurrentUser() user: RequestUser) {
    return this.groupService.listMyGroups(user.userId);
  }
}
