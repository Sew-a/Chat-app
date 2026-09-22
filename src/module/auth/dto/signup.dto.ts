import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(32)
  username: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
