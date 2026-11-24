import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AdminQuestionsService } from './admin-questions.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';

/**
 * Gestão das perguntas do questionário (somente administrador).
 * Não existe DELETE de propósito: perguntas são desativadas (RN12).
 */
@Controller('admin/perguntas')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminQuestionsController {
  constructor(private readonly questionsService: AdminQuestionsService) {}

  /** Lista todas (ativas e inativas). Filtros: ?areaCodigo=DEV&ativa=true */
  @Get()
  list(
    @Query('areaCodigo') areaCodigo?: string,
    @Query('ativa') ativa?: string,
  ) {
    return this.questionsService.list({ areaCodigo, ativa });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }
}
