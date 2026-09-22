import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';
import { GroupService } from '../group/group.service';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  cors: { origin: '*' }, // tighten to your frontend origin before shipping
  namespace: 'chat',
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly groupService: GroupService,
  ) {}

  // Client connects with: io('/chat', { auth: { token: accessToken } })
  // then emits this once per group it wants live updates for.
  @SubscribeMessage('join_group')
  async handleJoinGroup(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string }) {
    const userId = client.data.user.userId;
    await this.groupService.assertMembership(userId, data.groupId);
    await client.join(data.groupId);
    return { event: 'joined_group', data: { groupId: data.groupId } };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() dto: SendMessageDto) {
    const userId = client.data.user.userId;
    const message = await this.chatService.createMessage(userId, dto.groupId, dto.content, dto.imageUrl);

    // Broadcast to everyone in the room, including the sender, so every
    // client renders off the same server-confirmed message object.
    this.server.to(dto.groupId).emit('new_message', message);

    return { event: 'message_sent', data: { messageId: message.id } };
  }
}
