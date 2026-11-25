import { createProfileRanking } from './profile-ranking.js';
import {
  SCORING_AREAS,
  type ScoringAnswer,
  type ScoringArea,
} from '../scoring/scoring.engine.js';

type ValuesByArea = Record<ScoringArea, readonly number[]>;

function createAnswers(valuesByArea: ValuesByArea): ScoringAnswer[] {
  return SCORING_AREAS.flatMap((area) =>
    valuesByArea[area].map((value) => ({ area, value })),
  );
}

function createUniformAnswers(value: number): ScoringAnswer[] {
  return createAnswers({
    DEV: [value, value, value, value, value],
    UX: [value, value, value, value, value],
    QA: [value, value, value, value, value],
    DSO: [value, value, value, value, value],
    DAD: [value, value, value, value, value],
    PRD: [value, value, value, value, value],
  });
}

describe('createProfileRanking', () => {
  it('returns the complete official ranking with positions and descriptions', () => {
    const ranking = createProfileRanking(
      createAnswers({
        DEV: [4, 3, 4, 3, 2],
        UX: [2, 3, 4, 1, 2],
        QA: [3, 4, 3, 4, 4],
        DSO: [1, 2, 1, 0, 2],
        DAD: [2, 2, 3, 1, 2],
        PRD: [3, 2, 2, 3, 1],
      }),
    );

    expect(ranking.areas).toHaveLength(6);
    expect(ranking.areas.map(({ position, area, percentage }) => ({
      position,
      area,
      percentage,
    }))).toEqual([
      { position: 1, area: 'QA', percentage: 90 },
      { position: 2, area: 'DEV', percentage: 80 },
      { position: 3, area: 'UX', percentage: 60 },
      { position: 4, area: 'PRD', percentage: 55.00000000000001 },
      { position: 5, area: 'DAD', percentage: 50 },
      { position: 6, area: 'DSO', percentage: 30 },
    ]);
    expect(ranking.areas[0]).toMatchObject({
      name: 'Qualidade de Software (QA)',
      description:
        'Garante que o software funcione corretamente, planejando e executando testes e encontrando falhas.',
      justification:
        'A área Qualidade de Software (QA) ficou na 1ª posição, com 90% de afinidade (18 de 20 pontos). Garante que o software funcione corretamente, planejando e executando testes e encontrando falhas.',
    });
  });

  it('preserves the scoring engine tie-break order', () => {
    const ranking = createProfileRanking(
      createAnswers({
        DEV: [4, 4, 3, 3, 2],
        UX: [0, 0, 0, 0, 0],
        QA: [4, 3, 3, 3, 3],
        DSO: [0, 0, 0, 0, 0],
        DAD: [0, 0, 0, 0, 0],
        PRD: [0, 0, 0, 0, 0],
      }),
    );

    expect(ranking.areas.slice(0, 2).map(({ area }) => area)).toEqual([
      'DEV',
      'QA',
    ]);
    expect(ranking.primaryAreas).toEqual(['DEV']);
  });

  it('explains hybrid profiles without changing the engine result', () => {
    const ranking = createProfileRanking(createUniformAnswers(4));

    expect(ranking.perfilHibrido).toBe(true);
    expect(ranking.primaryAreas).toEqual([...SCORING_AREAS]);
    expect(ranking.justification).toContain('O perfil é híbrido porque');
    expect(ranking.respostasUniformes).toBe(true);
  });

  it('explains discovery and uniform responses deterministically', () => {
    const ranking = createProfileRanking(createUniformAnswers(0));

    expect(ranking.perfilEmDescoberta).toBe(true);
    expect(ranking.respostasUniformes).toBe(true);
    expect(ranking.justification).toContain('O perfil está em descoberta');
    expect(ranking.justification).toContain('As respostas foram uniformes');
  });
});
