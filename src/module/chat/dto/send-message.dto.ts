import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { EmptyToNull } from '../../../common/decorators/empty-to-null.decorator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  groupId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  // Shape check only — ChatService additionally requires the URL to point at
  // an object uploaded through POST /groups/:groupId/messages/image.
  @EmptyToNull()
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  imageUrl?: string | null;
}
