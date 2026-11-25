import {
  QUESTIONNAIRE_V1_QUESTIONS,
  QUESTIONNAIRE_V1_RESPONSE_VALUES,
  type QuestionnaireV1Area,
  type QuestionnaireV1QuestionCode,
} from './questionnaire-v1.criteria.js';
import {
  calculateProfile,
  type ProfileResult,
  type ScoringAnswer,
} from '../scoring/scoring.engine.js';

export interface QuestionnaireV1ResponseInput {
  readonly questionCode: string;
  readonly value: number;
}

export interface MappedQuestionnaireV1Response {
  readonly questionCode: QuestionnaireV1QuestionCode;
  readonly area: QuestionnaireV1Area;
  readonly value: number;
  readonly weight: number;
  readonly weightedValue: number;
}

const questionsByCode = new Map(
  QUESTIONNAIRE_V1_QUESTIONS.map((question) => [question.code, question]),
);

const validResponseValues = new Set<number>(QUESTIONNAIRE_V1_RESPONSE_VALUES);

/**
 * Converte as respostas identificadas pelo código oficial da pergunta em
 * respostas de pontuação. A lista deve conter exatamente uma resposta para
 * cada pergunta do catálogo v1.
 */
export function mapQuestionnaireV1Responses(
  responses: readonly QuestionnaireV1ResponseInput[],
): MappedQuestionnaireV1Response[] {
  const responseCodes = new Set<string>();

  for (const response of responses) {
    const question = questionsByCode.get(
      response.questionCode as QuestionnaireV1QuestionCode,
    );

    if (!question) {
      throw new RangeError(
        `Código de pergunta desconhecido: ${response.questionCode}.`,
      );
    }

    if (responseCodes.has(response.questionCode)) {
      throw new RangeError(
        `A pergunta ${response.questionCode} foi respondida mais de uma vez.`,
      );
    }

    if (!validResponseValues.has(response.value)) {
      throw new RangeError(
        `A resposta da pergunta ${response.questionCode} deve ter um valor permitido.`,
      );
    }

    responseCodes.add(response.questionCode);
  }

  const missingQuestionCodes = QUESTIONNAIRE_V1_QUESTIONS.filter(
    (question) => !responseCodes.has(question.code),
  ).map((question) => question.code);

  if (missingQuestionCodes.length > 0) {
    throw new RangeError(
      `Faltam respostas para as perguntas: ${missingQuestionCodes.join(', ')}.`,
    );
  }

  return responses.map((response) => {
    const question = questionsByCode.get(
      response.questionCode as QuestionnaireV1QuestionCode,
    )!;

    return {
      questionCode: question.code,
      area: question.area,
      value: response.value,
      weight: question.weight,
      weightedValue: response.value * question.weight,
    };
  });
}

/** Calcula o perfil v1 a partir de respostas identificadas pelos códigos oficiais. */
export function calculateQuestionnaireV1Profile(
  responses: readonly QuestionnaireV1ResponseInput[],
): ProfileResult {
  const scoringAnswers: ScoringAnswer[] = mapQuestionnaireV1Responses(
    responses,
  ).map(({ area, weightedValue }) => ({ area, value: weightedValue }));

  return calculateProfile(scoringAnswers);
}
