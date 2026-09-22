import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Use as @UseGuards(JwtAuthGuard) on any controller/route that requires a signed-in user.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
