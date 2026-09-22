import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './lib/database/prisma.module';
import { StorageModule } from './lib/storage/storage.module';
import { AuthModule } from './module/auth/auth.module';
import { UserModule } from './module/user/user.module';
import { GroupModule } from './module/group/group.module';
import { ChatModule } from './module/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UserModule,
    GroupModule,
    ChatModule,
  ],
})
export class AppModule {}
