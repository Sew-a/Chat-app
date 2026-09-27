import { IsEmail, IsString } from 'class-validator';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';

export class SigninDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
