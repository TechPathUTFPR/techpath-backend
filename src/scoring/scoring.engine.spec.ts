import {
  calculateProfile,
  SCORING_AREAS,
  type ScoringAnswer,
  type ScoringArea,
} from './scoring.engine.js';

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

describe('calculateProfile', () => {
  it('CT01: ranks QA first with the specified affinities', () => {
    const result = calculateProfile(
      createAnswers({
        DEV: [4, 3, 4, 3, 2],
        UX: [2, 3, 4, 1, 2],
        QA: [3, 4, 3, 4, 4],
        DSO: [1, 2, 1, 0, 2],
        DAD: [2, 2, 3, 1, 2],
        PRD: [3, 2, 2, 3, 1],
      }),
    );

    expect(
      result.ranking.map(({ area, points, maximumPoints }) => ({
        area,
        points,
        maximumPoints,
      })),
    ).toEqual([
      { area: 'QA', points: 18, maximumPoints: 20 },
      { area: 'DEV', points: 16, maximumPoints: 20 },
      { area: 'UX', points: 12, maximumPoints: 20 },
      { area: 'PRD', points: 11, maximumPoints: 20 },
      { area: 'DAD', points: 10, maximumPoints: 20 },
      { area: 'DSO', points: 6, maximumPoints: 20 },
    ]);
    expect(result.ranking.map((score) => score.affinity)).toEqual([
      90,
      80,
      60,
      expect.closeTo(55),
      50,
      30,
    ]);
    expect(result.primaryAreas).toEqual(['QA']);
    expect(result.perfilHibrido).toBe(false);
    expect(result.perfilEmDescoberta).toBe(false);
  });

  it('CT02: returns a hybrid profile for 30 answers with value 4', () => {
    const result = calculateProfile(createUniformAnswers(4));

    expect(result.ranking).toHaveLength(6);
    expect(result.ranking).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ points: 20, affinity: 100 }),
      ]),
    );
    expect(result.ranking.every((score) => score.points === 20)).toBe(true);
    expect(result.ranking.every((score) => score.affinity === 100)).toBe(true);
    expect(result.primaryAreas).toEqual([...SCORING_AREAS]);
    expect(result.perfilHibrido).toBe(true);
    expect(result.respostasUniformes).toBe(true);
  });

  it('CT03: returns a discovery profile for 30 answers with value 0', () => {
    const result = calculateProfile(createUniformAnswers(0));

    expect(result.ranking.every((score) => score.points === 0)).toBe(true);
    expect(result.ranking.every((score) => score.affinity === 0)).toBe(true);
    expect(result.perfilEmDescoberta).toBe(true);
    expect(result.respostasUniformes).toBe(true);
  });

  it('CT04: selects DEV when it has more answers with value 4 than QA', () => {
    const result = calculateProfile(
      createAnswers({
        DEV: [4, 4, 3, 3, 2],
        UX: [0, 0, 0, 0, 0],
        QA: [4, 3, 3, 3, 3],
        DSO: [0, 0, 0, 0, 0],
        DAD: [0, 0, 0, 0, 0],
        PRD: [0, 0, 0, 0, 0],
      }),
    );

    expect(result.ranking.slice(0, 2)).toMatchObject([
      { area: 'DEV', points: 16, answersWithValueFour: 2 },
      { area: 'QA', points: 16, answersWithValueFour: 1 },
    ]);
    expect(result.primaryAreas).toEqual(['DEV']);
    expect(result.perfilHibrido).toBe(false);
  });

  it('CT05: returns DEV and QA as primary areas when the tie persists', () => {
    const result = calculateProfile(
      createAnswers({
        DEV: [4, 4, 3, 3, 2],
        UX: [0, 0, 0, 0, 0],
        QA: [4, 4, 3, 3, 2],
        DSO: [0, 0, 0, 0, 0],
        DAD: [0, 0, 0, 0, 0],
        PRD: [0, 0, 0, 0, 0],
      }),
    );

    expect(result.ranking.slice(0, 2)).toMatchObject([
      { area: 'DEV', points: 16, answersWithValueFour: 2 },
      { area: 'QA', points: 16, answersWithValueFour: 2 },
    ]);
    expect(result.primaryAreas).toEqual(['DEV', 'QA']);
    expect(result.perfilHibrido).toBe(true);
  });

  it('CT06: returns a discovery profile when the highest affinity is exactly 40%', () => {
    const result = calculateProfile(
      createAnswers({
        DEV: [4, 4, 0, 0, 0],
        UX: [0, 0, 0, 0, 0],
        QA: [0, 0, 0, 0, 0],
        DSO: [0, 0, 0, 0, 0],
        DAD: [0, 0, 0, 0, 0],
        PRD: [0, 0, 0, 0, 0],
      }),
    );

    expect(result.ranking[0]).toMatchObject({
      area: 'DEV',
      points: 8,
      affinity: 40,
    });
    expect(result.perfilEmDescoberta).toBe(true);
  });

  it('rejects input with fewer than 30 answers', () => {
    expect(() => calculateProfile(createUniformAnswers(0).slice(1))).toThrow(
      RangeError,
    );
  });

  it('rejects an answer outside the allowed range', () => {
    const answers = createUniformAnswers(0);
    answers[0] = { area: 'DEV', value: 5 };

    expect(() => calculateProfile(answers)).toThrow(RangeError);
  });

  it('rejects an answer with a non-integer value', () => {
    const answers = createUniformAnswers(0);
    answers[0] = { area: 'DEV', value: 2.5 };

    expect(() => calculateProfile(answers)).toThrow(RangeError);
  });

  it('rejects an input whose answers are not distributed across five per area', () => {
    const answers = createUniformAnswers(0);
    answers[0] = { area: 'QA', value: 0 };

    expect(() => calculateProfile(answers)).toThrow(RangeError);
  });

  it('rejects an answer associated with an unknown area', () => {
    const answers = createUniformAnswers(0);
    answers[0] = { area: 'UNKNOWN' as ScoringArea, value: 0 };

    expect(() => calculateProfile(answers)).toThrow(RangeError);
  });
});
