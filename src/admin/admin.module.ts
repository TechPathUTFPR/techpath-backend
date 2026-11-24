import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { AdminQuestionsController } from './questions/admin-questions.controller.js';
import { AdminQuestionsService } from './questions/admin-questions.service.js';

@Module({
  // AuthModule registra a estratégia JWT; PassportModule fornece o
  // AuthModuleOptions que o JwtAuthGuard precisa neste módulo.
  imports: [AuthModule, PassportModule.register({})],
  controllers: [AdminQuestionsController],
  providers: [AdminQuestionsService, AdminGuard],
})
export class AdminModule {}
