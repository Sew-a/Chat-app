import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;
}
