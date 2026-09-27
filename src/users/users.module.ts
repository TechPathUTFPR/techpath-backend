import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from './users.controller.js';
import { UsersAuthService } from './users-auth.service.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [UsersController],
  providers: [UsersService, UsersAuthService],
  exports: [UsersService],
})
export class UsersModule {}
