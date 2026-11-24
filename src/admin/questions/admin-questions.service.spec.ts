import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminQuestionsService } from './admin-questions.service.js';

const dev = {
  id: 'area-dev',
  codigo: 'DEV',
  nome: 'Desenvolvimento',
  ativa: true,
};
const now = new Date('2026-11-23T12:00:00Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1',
    codigo: 'DEV-01',
    enunciado: 'Gosto de resolver problemas.',
    ativa: true,
    peso: '1',
    criadoEm: now,
    atualizadoEm: now,
    area: dev,
    ...overrides,
  };
}

function makePrisma() {
  return {
    area: { findUnique: vi.fn().mockResolvedValue(dev) },
    pergunta: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(row()),
      aggregate: vi.fn().mockResolvedValue({ _max: { ordem: 30 } }),
      count: vi.fn().mockResolvedValue(5),
      create: vi
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve(row({ ...data, id: 'novo' })),
        ),
      update: vi
        .fn()
        .mockImplementation(({ data }) => Promise.resolve(row(data))),
    },
  };
}

function build() {
  const prisma = makePrisma();
  const service = new AdminQuestionsService(prisma as never);
  return { prisma, service };
}

const uniqueViolation = () =>
  Object.assign(new Error('unique'), { code: 'P2002' });

describe('AdminQuestionsService', () => {
  describe('create', () => {
    it('creates with generated code, default weight 1 and active', async () => {
      const { prisma, service } = build();
      prisma.pergunta.findMany.mockResolvedValue([
        { codigo: 'DEV-01' },
        { codigo: 'DEV-05' },
        { codigo: 'DEV-03' },
      ]);

      const result = await service.create({
        enunciado: '  Gosto de aprender novas ferramentas.  ',
        areaCodigo: 'dev',
      });

      expect(prisma.area.findUnique).toHaveBeenCalledWith({
        where: { codigo: 'DEV' },
      });
      expect(prisma.pergunta.create).toHaveBeenCalledWith({
        data: {
          codigo: 'DEV-06',
          enunciado: 'Gosto de aprender novas ferramentas.',
          ordem: 31,
          ativa: true,
          peso: 1,
          areaId: 'area-dev',
        },
        include: { area: true },
      });
      expect(result.codigo).toBe('DEV-06');
      expect(result.peso).toBe(1);
    });

    it('starts at 01 when the area has no questions yet', async () => {
      const { prisma, service } = build();
      await service.create({ enunciado: 'Texto', areaCodigo: 'DEV' });
      expect(prisma.pergunta.create.mock.calls[0][0].data.codigo).toBe(
        'DEV-01',
      );
    });

    it('does not reuse the code of a deactivated question', async () => {
      const { prisma, service } = build();
      prisma.pergunta.findMany.mockResolvedValue([{ codigo: 'DEV-05' }]);
      await service.create({ enunciado: 'Texto', areaCodigo: 'DEV' });
      expect(prisma.pergunta.create.mock.calls[0][0].data.codigo).toBe(
        'DEV-06',
      );
    });

    it('retries with the next code when two creations collide (P2002)', async () => {
      const { prisma, service } = build();
      prisma.pergunta.findMany
        .mockResolvedValueOnce([{ codigo: 'DEV-05' }])
        .mockResolvedValueOnce([{ codigo: 'DEV-05' }, { codigo: 'DEV-06' }]);
      prisma.pergunta.create
        .mockRejectedValueOnce(uniqueViolation())
        .mockImplementationOnce(({ data }) => Promise.resolve(row(data)));

      const result = await service.create({
        enunciado: 'Texto',
        areaCodigo: 'DEV',
      });

      expect(prisma.pergunta.create).toHaveBeenCalledTimes(2);
      expect(result.codigo).toBe('DEV-07');
    });

    it('gives up with 500 after repeated code collisions', async () => {
      const { prisma, service } = build();
      prisma.pergunta.create.mockRejectedValue(uniqueViolation());
      await expect(
        service.create({ enunciado: 'Texto', areaCodigo: 'DEV' }),
      ).rejects.toThrow('código único');
      expect(prisma.pergunta.create).toHaveBeenCalledTimes(5);
    });

    it('rethrows unexpected database errors', async () => {
      const { prisma, service } = build();
      prisma.pergunta.create.mockRejectedValue(new Error('conexão perdida'));
      await expect(
        service.create({ enunciado: 'Texto', areaCodigo: 'DEV' }),
      ).rejects.toThrow('conexão perdida');
      expect(prisma.pergunta.create).toHaveBeenCalledTimes(1);
    });

    it('reports whether the area is eligible (RN13): 4 active questions is not enough', async () => {
      const { prisma, service } = build();
      prisma.pergunta.count.mockResolvedValue(4);
      const result = await service.create({
        enunciado: 'Texto',
        areaCodigo: 'DEV',
      });
      expect(result).toMatchObject({
        areaPerguntasAtivas: 4,
        areaElegivel: false,
      });
    });

    it('is eligible with 5 active questions in an active area', async () => {
      const { service } = build();
      const result = await service.create({
        enunciado: 'Texto',
        areaCodigo: 'DEV',
      });
      expect(result).toMatchObject({
        areaPerguntasAtivas: 5,
        areaElegivel: true,
      });
    });

    it('is not eligible when the area itself is inactive', async () => {
      const { prisma, service } = build();
      prisma.area.findUnique.mockResolvedValue({ ...dev, ativa: false });
      prisma.pergunta.create.mockImplementation(({ data }) =>
        Promise.resolve(row({ ...data, area: { ...dev, ativa: false } })),
      );
      const result = await service.create({
        enunciado: 'Texto',
        areaCodigo: 'DEV',
      });
      expect(result.areaElegivel).toBe(false);
    });

    it.each([
      ['enunciado ausente', { areaCodigo: 'DEV' }],
      ['enunciado só com espaços', { enunciado: '   ', areaCodigo: 'DEV' }],
      ['enunciado não-string', { enunciado: 10, areaCodigo: 'DEV' }],
      [
        'enunciado maior que 500',
        { enunciado: 'a'.repeat(501), areaCodigo: 'DEV' },
      ],
      ['área ausente', { enunciado: 'Texto' }],
      ['área com formato inválido', { enunciado: 'Texto', areaCodigo: 'D3V!' }],
      ['peso zero', { enunciado: 'Texto', areaCodigo: 'DEV', peso: 0 }],
      ['peso negativo', { enunciado: 'Texto', areaCodigo: 'DEV', peso: -1 }],
      [
        'peso acima de 99,99',
        { enunciado: 'Texto', areaCodigo: 'DEV', peso: 100 },
      ],
      [
        'peso com 3 casas',
        { enunciado: 'Texto', areaCodigo: 'DEV', peso: 1.234 },
      ],
      ['peso como texto', { enunciado: 'Texto', areaCodigo: 'DEV', peso: '2' }],
      ['peso NaN', { enunciado: 'Texto', areaCodigo: 'DEV', peso: NaN }],
      [
        'ativa não-booleano',
        { enunciado: 'Texto', areaCodigo: 'DEV', ativa: 'sim' },
      ],
    ])('rejects with 400: %s', async (_name, dto) => {
      const { prisma, service } = build();
      await expect(service.create(dto as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.pergunta.create).not.toHaveBeenCalled();
    });

    it('rejects with 400 when the area does not exist', async () => {
      const { prisma, service } = build();
      prisma.area.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ enunciado: 'Texto', areaCodigo: 'XYZ' }),
      ).rejects.toThrow('Área "XYZ" não encontrada');
      expect(prisma.pergunta.create).not.toHaveBeenCalled();
    });

    it('accepts weights with up to 2 decimals', async () => {
      const { prisma, service } = build();
      await service.create({
        enunciado: 'Texto',
        areaCodigo: 'DEV',
        peso: 1.25,
      });
      expect(prisma.pergunta.create.mock.calls[0][0].data.peso).toBe(1.25);
    });

    it('rejects a missing body', async () => {
      const { service } = build();
      await expect(service.create(undefined as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('edits the text keeping the code', async () => {
      const { prisma, service } = build();
      const result = await service.update('q1', { enunciado: ' Novo texto ' });
      expect(prisma.pergunta.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { enunciado: 'Novo texto' },
        include: { area: true },
      });
      expect(result.codigo).toBe('DEV-01');
    });

    it('deactivates a question (RN12) and reports the area impact', async () => {
      const { prisma, service } = build();
      prisma.pergunta.count.mockResolvedValue(4);
      const result = await service.update('q1', { ativa: false });
      expect(prisma.pergunta.update.mock.calls[0][0].data).toEqual({
        ativa: false,
      });
      expect(result).toMatchObject({ ativa: false, areaElegivel: false });
    });

    it('changes weight and area together', async () => {
      const { prisma, service } = build();
      prisma.area.findUnique.mockResolvedValue({
        id: 'area-qa',
        codigo: 'QA',
        nome: 'QA',
        ativa: true,
      });
      await service.update('q1', { peso: 2, areaCodigo: 'qa' });
      expect(prisma.area.findUnique).toHaveBeenCalledWith({
        where: { codigo: 'QA' },
      });
      expect(prisma.pergunta.update.mock.calls[0][0].data).toEqual({
        peso: 2,
        areaId: 'area-qa',
      });
    });

    it('returns 404 when the question does not exist', async () => {
      const { prisma, service } = build();
      prisma.pergunta.findUnique.mockResolvedValue(null);
      await expect(
        service.update('nope', { ativa: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.pergunta.update).not.toHaveBeenCalled();
    });

    it.each([
      ['corpo vazio', {}],
      ['só campos indefinidos', { ativa: undefined }],
      ['campo desconhecido', { codigo: 'DEV-99' }],
      ['campo desconhecido junto de válido', { ativa: true, foo: 1 }],
      ['enunciado vazio', { enunciado: '' }],
      ['peso inválido', { peso: 0 }],
      ['ativa inválido', { ativa: 'false' }],
    ])('rejects with 400: %s', async (_name, dto) => {
      const { prisma, service } = build();
      await expect(service.update('q1', dto as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.pergunta.update).not.toHaveBeenCalled();
    });

    it('rejects with 400 when the new area does not exist', async () => {
      const { prisma, service } = build();
      prisma.area.findUnique.mockResolvedValue(null);
      await expect(
        service.update('q1', { areaCodigo: 'XYZ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.pergunta.update).not.toHaveBeenCalled();
    });
  });

  describe('list / findOne', () => {
    it('lists everything (inactive included) with numeric weight', async () => {
      const { prisma, service } = build();
      prisma.pergunta.findMany.mockResolvedValue([
        row(),
        row({ id: 'q2', codigo: 'DEV-02', ativa: false, peso: '1.50' }),
      ]);
      const result = await service.list();
      expect(prisma.pergunta.findMany.mock.calls[0][0].where).toEqual({});
      expect(result.map((q) => [q.codigo, q.ativa, q.peso])).toEqual([
        ['DEV-01', true, 1],
        ['DEV-02', false, 1.5],
      ]);
    });

    it('applies filters', async () => {
      const { prisma, service } = build();
      await service.list({ areaCodigo: 'dev', ativa: 'false' });
      expect(prisma.pergunta.findMany.mock.calls[0][0].where).toEqual({
        area: { codigo: 'DEV' },
        ativa: false,
      });
    });

    it('rejects invalid filters with 400', async () => {
      const { service } = build();
      await expect(service.list({ ativa: 'talvez' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.list({ areaCodigo: '12' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('finds one and returns 404 when missing', async () => {
      const { prisma, service } = build();
      await expect(service.findOne('q1')).resolves.toMatchObject({ id: 'q1' });
      prisma.pergunta.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('does not leak anything beyond the public view', async () => {
      const { service } = build();
      const view = await service.findOne('q1');
      expect(Object.keys(view).sort()).toEqual(
        [
          'area',
          'ativa',
          'atualizadoEm',
          'codigo',
          'criadoEm',
          'enunciado',
          'id',
          'peso',
        ].sort(),
      );
    });
  });
});
