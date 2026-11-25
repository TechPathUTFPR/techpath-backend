import {
  calculateProfile,
  type ProfileResult,
  type ScoringAnswer,
  type ScoringArea,
} from '../scoring/scoring.engine.js';
import {
  QUESTIONNAIRE_V1_AREA_DETAILS,
  type QuestionnaireV1AreaDefinition,
} from '../questionnaire/questionnaire-v1.criteria.js';

export interface RankedArea {
  readonly position: number;
  readonly area: ScoringArea;
  readonly name: string;
  readonly description: string;
  readonly points: number;
  readonly maximumPoints: number;
  readonly percentage: number;
  readonly justification: string;
}

export interface ProfileRanking {
  readonly areas: readonly RankedArea[];
  readonly primaryAreas: readonly ScoringArea[];
  readonly perfilHibrido: boolean;
  readonly perfilEmDescoberta: boolean;
  readonly respostasUniformes: boolean;
  readonly justification: string;
}

const areasByCode = new Map<ScoringArea, QuestionnaireV1AreaDefinition>(
  QUESTIONNAIRE_V1_AREA_DETAILS.map((area) => [area.code, area]),
);

/**
 * Enriquece o resultado do motor de scoring com a apresentação oficial das
 * áreas. A ordem, os desempates e os indicadores de perfil permanecem sendo
 * definidos exclusivamente por calculateProfile.
 */
export function createProfileRanking(
  answers: readonly ScoringAnswer[],
): ProfileRanking {
  const profile = calculateProfile(answers);

  return {
    areas: profile.ranking.map((score, index) => {
      const area = areasByCode.get(score.area);

      if (!area) {
        throw new Error(`Área sem descrição oficial: ${score.area}.`);
      }

      const position = index + 1;

      return {
        position,
        area: score.area,
        name: area.name,
        description: area.description,
        points: score.points,
        maximumPoints: score.maximumPoints,
        percentage: score.affinity,
        justification: `A área ${area.name} ficou na ${position}ª posição, com ${score.affinity}% de afinidade (${score.points} de ${score.maximumPoints} pontos). ${area.description}`,
      };
    }),
    primaryAreas: profile.primaryAreas,
    perfilHibrido: profile.perfilHibrido,
    perfilEmDescoberta: profile.perfilEmDescoberta,
    respostasUniformes: profile.respostasUniformes,
    justification: createProfileJustification(profile),
  };
}

function createProfileJustification(profile: ProfileResult): string {
  const explanations = [
    'O ranking segue a pontuação e os critérios de desempate do questionário v1.',
  ];

  if (profile.perfilHibrido) {
    explanations.push(
      `O perfil é híbrido porque ${profile.primaryAreas.join(' e ')} compartilham a maior afinidade e a mesma quantidade de respostas com valor 4.`,
    );
  }

  if (profile.perfilEmDescoberta) {
    explanations.push(
      'O perfil está em descoberta porque todas as áreas têm afinidade de até 40%.',
    );
  }

  if (profile.respostasUniformes) {
    explanations.push(
      'As respostas foram uniformes em todas as perguntas.',
    );
  }

  return explanations.join(' ');
}
