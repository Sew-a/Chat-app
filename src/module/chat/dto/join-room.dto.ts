import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Payload of the `join_group` WebSocket event.
export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  groupId: string;
}
