import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { EmptyToNull } from '../../../common/decorators/empty-to-null.decorator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  username?: string;

  // https only — blocks `javascript:` / `data:` URLs rendered as <img src>.
  // "" or null clears the avatar.
  @EmptyToNull()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string | null;
}
