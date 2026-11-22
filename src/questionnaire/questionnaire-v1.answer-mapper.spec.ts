import {
  QUESTIONNAIRE_V1_QUESTIONS,
  type QuestionnaireV1QuestionCode,
} from './questionnaire-v1.criteria.js';
import {
  calculateQuestionnaireV1Profile,
  mapQuestionnaireV1Responses,
  type QuestionnaireV1ResponseInput,
} from './questionnaire-v1.answer-mapper.js';

function createResponses(
  valueForQuestion: (questionCode: QuestionnaireV1QuestionCode) => number = () =>
    0,
): QuestionnaireV1ResponseInput[] {
  return QUESTIONNAIRE_V1_QUESTIONS.map(({ code }) => ({
    questionCode: code,
    value: valueForQuestion(code),
  }));
}

describe('questionnaire v1 answer mapper', () => {
  it('maps each official question code to its area, value and unit weight', () => {
    const responses = createResponses((questionCode) =>
      questionCode === 'QA-01' ? 4 : 0,
    );

    expect(mapQuestionnaireV1Responses(responses)).toEqual(
      QUESTIONNAIRE_V1_QUESTIONS.map((question) => ({
        questionCode: question.code,
        area: question.area,
        value: question.code === 'QA-01' ? 4 : 0,
        weight: question.weight,
        weightedValue: question.code === 'QA-01' ? 4 : 0,
      })),
    );
  });

  it('rejects an unknown question code', () => {
    const responses = createResponses();
    responses[0] = { questionCode: 'UNKNOWN-01', value: 0 };

    expect(() => mapQuestionnaireV1Responses(responses)).toThrow(
      'Código de pergunta desconhecido: UNKNOWN-01.',
    );
  });

  it('rejects duplicate answers for a question', () => {
    const responses = createResponses();
    responses[1] = { ...responses[0] };

    expect(() => mapQuestionnaireV1Responses(responses)).toThrow(
      'A pergunta DEV-01 foi respondida mais de uma vez.',
    );
  });

  it.each([5, -1, 2.5])('rejects the invalid response value %s', (value) => {
    const responses = createResponses();
    responses[0] = { ...responses[0], value };

    expect(() => mapQuestionnaireV1Responses(responses)).toThrow(
      'A resposta da pergunta DEV-01 deve ter um valor permitido.',
    );
  });

  it('rejects an incomplete questionnaire', () => {
    const responses = createResponses().slice(1);

    expect(() => mapQuestionnaireV1Responses(responses)).toThrow(
      'Faltam respostas para as perguntas: DEV-01.',
    );
  });

  it('integrates mapped answers with the scoring engine', () => {
    const result = calculateQuestionnaireV1Profile(
      createResponses((questionCode) => (questionCode.startsWith('QA-') ? 4 : 0)),
    );

    expect(result.ranking[0]).toMatchObject({
      area: 'QA',
      points: 20,
      maximumPoints: 20,
      affinity: 100,
    });
    expect(result.primaryAreas).toEqual(['QA']);
  });
});
