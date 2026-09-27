import { IsEmail, IsOptional, IsString, IsUrl, MinLength, MaxLength } from 'class-validator';
import { EmptyToNull } from '../../../common/decorators/empty-to-null.decorator';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';

export class SignupDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(32)
  username: string;

  // https only — blocks `javascript:` / `data:` URLs rendered as <img src>.
  @EmptyToNull()
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string | null;
}
