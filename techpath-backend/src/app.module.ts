import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
