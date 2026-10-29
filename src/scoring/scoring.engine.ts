/** Áreas fixas definidas para a versão 1 do questionário. */
export const SCORING_AREAS = ['DEV', 'UX', 'QA', 'DSO', 'DAD', 'PRD'] as const;

export type ScoringArea = (typeof SCORING_AREAS)[number];

export interface ScoringAnswer {
  area: ScoringArea;
  value: number;
}

export interface AreaScore {
  area: ScoringArea;
  points: number;
  maximumPoints: number;
  affinity: number;
  answersWithValueFour: number;
}

export interface ProfileResult {
  ranking: AreaScore[];
  primaryAreas: ScoringArea[];
  perfilHibrido: boolean;
  perfilEmDescoberta: boolean;
  respostasUniformes: boolean;
}

const ANSWERS_PER_AREA = 5;
const TOTAL_ANSWERS = SCORING_AREAS.length * ANSWERS_PER_AREA;
const MIN_ANSWER_VALUE = 0;
const MAX_ANSWER_VALUE = 4;
const MAXIMUM_POINTS_PER_AREA = ANSWERS_PER_AREA * MAX_ANSWER_VALUE;
const DISCOVERY_THRESHOLD = 40;

const areaOrder: Readonly<Record<ScoringArea, number>> = {
  DEV: 0,
  UX: 1,
  QA: 2,
  DSO: 3,
  DAD: 4,
  PRD: 5,
};

/**
 * Calcula o perfil v1 a partir das 30 respostas do questionário.
 *
 * A afinidade não é arredondada: consumidores que precisarem exibi-la devem
 * aplicar arredondamento apenas na camada de apresentação.
 */
export function calculateProfile(answers: readonly ScoringAnswer[]): ProfileResult {
  validateAnswers(answers);

  const scores = new Map<ScoringArea, AreaScore>();

  for (const area of SCORING_AREAS) {
    scores.set(area, {
      area,
      points: 0,
      maximumPoints: MAXIMUM_POINTS_PER_AREA,
      affinity: 0,
      answersWithValueFour: 0,
    });
  }

  for (const answer of answers) {
    const score = scores.get(answer.area);

    if (!score) {
      throw new Error(`Área de scoring inválida: ${answer.area}`);
    }

    score.points += answer.value;

    if (answer.value === MAX_ANSWER_VALUE) {
      score.answersWithValueFour += 1;
    }
  }

  for (const score of scores.values()) {
    score.affinity = (score.points / score.maximumPoints) * 100;
  }

  const ranking = [...scores.values()].sort(compareAreaScores);
  const topScore = ranking[0];
  const primaryAreas = ranking
    .filter(
      (score) =>
        score.affinity === topScore.affinity &&
        score.answersWithValueFour === topScore.answersWithValueFour,
    )
    .map((score) => score.area);

  return {
    ranking,
    primaryAreas,
    perfilHibrido: primaryAreas.length > 1,
    perfilEmDescoberta: ranking.every(
      (score) => score.affinity <= DISCOVERY_THRESHOLD,
    ),
    respostasUniformes: answers.every(
      (answer) => answer.value === answers[0].value,
    ),
  };
}

function validateAnswers(answers: readonly ScoringAnswer[]): void {
  if (answers.length !== TOTAL_ANSWERS) {
    throw new RangeError(
      `O questionário deve conter exatamente ${TOTAL_ANSWERS} respostas.`,
    );
  }

  const answersByArea = new Map<ScoringArea, number>();

  for (const area of SCORING_AREAS) {
    answersByArea.set(area, 0);
  }

  for (const answer of answers) {
    if (!Object.hasOwn(areaOrder, answer.area)) {
      throw new RangeError(`Área de scoring inválida: ${answer.area}`);
    }

    if (
      !Number.isInteger(answer.value) ||
      answer.value < MIN_ANSWER_VALUE ||
      answer.value > MAX_ANSWER_VALUE
    ) {
      throw new RangeError(
        `A resposta da área ${answer.area} deve ser um inteiro entre ${MIN_ANSWER_VALUE} e ${MAX_ANSWER_VALUE}.`,
      );
    }

    answersByArea.set(answer.area, answersByArea.get(answer.area)! + 1);
  }

  for (const area of SCORING_AREAS) {
    if (answersByArea.get(area) !== ANSWERS_PER_AREA) {
      throw new RangeError(
        `A área ${area} deve conter exatamente ${ANSWERS_PER_AREA} respostas.`,
      );
    }
  }
}

function compareAreaScores(first: AreaScore, second: AreaScore): number {
  if (first.affinity !== second.affinity) {
    return second.affinity - first.affinity;
  }

  if (first.answersWithValueFour !== second.answersWithValueFour) {
    return second.answersWithValueFour - first.answersWithValueFour;
  }

  return areaOrder[first.area] - areaOrder[second.area];
}
