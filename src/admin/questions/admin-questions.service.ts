import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import {
  QuestionView,
  QuestionWriteView,
} from './dto/question-response.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';

/** RN13: mínimo de perguntas ativas para a área entrar no questionário. */
export const MIN_ACTIVE_QUESTIONS_PER_AREA = 5;
export const MAX_ENUNCIADO_LENGTH = 500;
export const MAX_PESO = 99.99;
const CODE_GENERATION_ATTEMPTS = 5;
const UPDATABLE_FIELDS = ['enunciado', 'areaCodigo', 'peso', 'ativa'] as const;

interface AreaRow {
  id: string;
  codigo: string | null;
  nome: string;
  ativa: boolean;
}

interface QuestionRow {
  id: string;
  codigo: string | null;
  enunciado: string;
  ativa: boolean;
  peso: unknown;
  criadoEm: Date;
  atualizadoEm: Date;
  area: AreaRow | null;
}

export interface ListQuestionsFilter {
  areaCodigo?: string;
  ativa?: string;
}

/**
 * Gestão das perguntas do questionário pelo administrador.
 *
 * Regras (Especificação do Questionário de Afinidade):
 * - RN12: perguntas nunca são apagadas, apenas desativadas (`ativa: false`).
 * - O código (ex.: DEV-06) é gerado pelo sistema e nunca muda; corrigir o
 *   texto mantém o código.
 * - RN14/RN11: o efeito sobre avaliações em andamento/antigas é garantido
 *   por quem congela as perguntas ao iniciar a avaliação e grava o snapshot
 *   das respostas — este serviço só altera o catálogo.
 */
@Injectable()
export class AdminQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ListQuestionsFilter = {}): Promise<QuestionView[]> {
    const where: Record<string, unknown> = {};

    if (filter.areaCodigo !== undefined) {
      where.area = { codigo: this.parseAreaCodigo(filter.areaCodigo) };
    }

    if (filter.ativa !== undefined) {
      if (filter.ativa !== 'true' && filter.ativa !== 'false') {
        throw new BadRequestException(
          'O filtro "ativa" deve ser true ou false.',
        );
      }
      where.ativa = filter.ativa === 'true';
    }

    const rows = (await this.prisma.pergunta.findMany({
      where,
      include: { area: true },
      orderBy: [
        { area: { ordem: 'asc' } },
        { codigo: 'asc' },
        { ordem: 'asc' },
      ],
    })) as unknown as QuestionRow[];

    return rows.map((row) => this.toView(row));
  }

  async findOne(id: string): Promise<QuestionView> {
    return this.toView(await this.getRow(id));
  }

  async create(dto: CreateQuestionDto): Promise<QuestionWriteView> {
    const body = this.requireObject(dto);
    const enunciado = this.parseEnunciado(body.enunciado);
    const peso = body.peso === undefined ? 1 : this.parsePeso(body.peso);
    const ativa = body.ativa === undefined ? true : this.parseAtiva(body.ativa);
    const area = await this.getAreaByCodigo(
      this.parseAreaCodigo(body.areaCodigo),
    );

    const aggregate = await this.prisma.pergunta.aggregate({
      _max: { ordem: true },
    });
    const ordem = (aggregate._max.ordem ?? 0) + 1;

    for (let attempt = 1; attempt <= CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const codigo = await this.nextCode(area);
      try {
        const created = (await this.prisma.pergunta.create({
          data: { codigo, enunciado, ordem, ativa, peso, areaId: area.id },
          include: { area: true },
        })) as unknown as QuestionRow;

        return this.toWriteView(created);
      } catch (error) {
        // Duas criações simultâneas podem gerar o mesmo código: o banco
        // recusa (único) e tentamos de novo com o próximo número.
        if (
          this.isUniqueViolation(error) &&
          attempt < CODE_GENERATION_ATTEMPTS
        ) {
          continue;
        }
        if (this.isUniqueViolation(error)) {
          throw new InternalServerErrorException(
            'Não foi possível gerar um código único para a pergunta. Tente novamente.',
          );
        }
        throw error;
      }
    }

    // Inalcançável: o laço sempre retorna ou lança.
    throw new InternalServerErrorException('Falha ao criar a pergunta.');
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<QuestionWriteView> {
    const body = this.requireObject(dto);

    const unknown = Object.keys(body).filter(
      (key) => !(UPDATABLE_FIELDS as readonly string[]).includes(key),
    );
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Campo(s) não permitido(s): ${unknown.join(', ')}. Permitidos: ${UPDATABLE_FIELDS.join(', ')}.`,
      );
    }
    if (UPDATABLE_FIELDS.every((field) => body[field] === undefined)) {
      throw new BadRequestException(
        `Informe ao menos um campo para alterar: ${UPDATABLE_FIELDS.join(', ')}.`,
      );
    }

    const data: Record<string, unknown> = {};
    if (body.enunciado !== undefined) {
      data.enunciado = this.parseEnunciado(body.enunciado);
    }
    if (body.peso !== undefined) data.peso = this.parsePeso(body.peso);
    if (body.ativa !== undefined) data.ativa = this.parseAtiva(body.ativa);
    if (body.areaCodigo !== undefined) {
      const area = await this.getAreaByCodigo(
        this.parseAreaCodigo(body.areaCodigo),
      );
      data.areaId = area.id;
    }

    await this.getRow(id); // 404 se não existir, antes de tentar gravar

    const updated = (await this.prisma.pergunta.update({
      where: { id },
      data,
      include: { area: true },
    })) as unknown as QuestionRow;

    return this.toWriteView(updated);
  }

  // ---------------------------------------------------------------- privado

  private async getRow(id: string): Promise<QuestionRow> {
    const row = (await this.prisma.pergunta.findUnique({
      where: { id },
      include: { area: true },
    })) as unknown as QuestionRow | null;

    if (!row) throw new NotFoundException('Pergunta não encontrada.');
    return row;
  }

  private async getAreaByCodigo(codigo: string): Promise<AreaRow> {
    const area = (await this.prisma.area.findUnique({
      where: { codigo },
    })) as unknown as AreaRow | null;

    if (!area) {
      throw new BadRequestException(`Área "${codigo}" não encontrada.`);
    }
    return area;
  }

  /** Próximo código da área: maior número existente + 1 (DEV-05 -> DEV-06). */
  private async nextCode(area: AreaRow): Promise<string> {
    const prefix = `${area.codigo}-`;
    const existing = (await this.prisma.pergunta.findMany({
      where: { codigo: { startsWith: prefix } },
      select: { codigo: true },
    })) as unknown as { codigo: string | null }[];

    const highest = existing.reduce((max, { codigo }) => {
      const number = Number(codigo?.slice(prefix.length));
      return Number.isInteger(number) && number > max ? number : max;
    }, 0);

    return `${prefix}${String(highest + 1).padStart(2, '0')}`;
  }

  private requireObject<T extends object>(
    value: T,
  ): Record<string, unknown> & T {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(
        'Envie um objeto JSON no corpo da requisição.',
      );
    }
    return value as Record<string, unknown> & T;
  }

  private parseEnunciado(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException('O enunciado é obrigatório.');
    }
    const enunciado = value.trim();
    if (enunciado.length > MAX_ENUNCIADO_LENGTH) {
      throw new BadRequestException(
        `O enunciado deve ter no máximo ${MAX_ENUNCIADO_LENGTH} caracteres.`,
      );
    }
    return enunciado;
  }

  private parseAreaCodigo(value: unknown): string {
    if (typeof value !== 'string' || !/^[A-Za-z]{2,10}$/.test(value.trim())) {
      throw new BadRequestException(
        'Informe o código da área (ex.: DEV, UX, QA).',
      );
    }
    return value.trim().toUpperCase();
  }

  private parsePeso(value: unknown): number {
    const valid =
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0 &&
      value <= MAX_PESO &&
      /^\d+(\.\d{1,2})?$/.test(String(value));

    if (!valid) {
      throw new BadRequestException(
        `O peso deve ser um número maior que 0 e até ${MAX_PESO}, com no máximo 2 casas decimais.`,
      );
    }
    return value as number;
  }

  private parseAtiva(value: unknown): boolean {
    if (typeof value !== 'boolean') {
      throw new BadRequestException('O campo "ativa" deve ser true ou false.');
    }
    return value;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (error as { code?: string } | null)?.code === 'P2002';
  }

  private toView(row: QuestionRow): QuestionView {
    return {
      id: row.id,
      codigo: row.codigo,
      enunciado: row.enunciado,
      ativa: row.ativa,
      peso: Number(row.peso),
      area: row.area
        ? {
            id: row.area.id,
            codigo: row.area.codigo ?? '',
            nome: row.area.nome,
            ativa: row.area.ativa,
          }
        : null,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    };
  }

  private async toWriteView(row: QuestionRow): Promise<QuestionWriteView> {
    const view = this.toView(row);
    const areaPerguntasAtivas = row.area
      ? await this.prisma.pergunta.count({
          where: { areaId: row.area.id, ativa: true },
        })
      : 0;

    return {
      ...view,
      areaPerguntasAtivas,
      areaElegivel:
        !!row.area?.ativa &&
        areaPerguntasAtivas >= MIN_ACTIVE_QUESTIONS_PER_AREA,
    };
  }
}
