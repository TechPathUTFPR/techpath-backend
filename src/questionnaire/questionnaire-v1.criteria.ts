/** Áreas e ordem provisória definidas para o questionário v1. */
export const QUESTIONNAIRE_V1_AREAS = Object.freeze([
  'DEV',
  'UX',
  'QA',
  'DSO',
  'DAD',
  'PRD',
] as const);

export type QuestionnaireV1Area = (typeof QUESTIONNAIRE_V1_AREAS)[number];

type QuestionnaireV1QuestionSequence = '01' | '02' | '03' | '04' | '05';

export type QuestionnaireV1QuestionCode =
  `${QuestionnaireV1Area}-${QuestionnaireV1QuestionSequence}`;

export interface QuestionnaireV1AreaDefinition {
  readonly code: QuestionnaireV1Area;
  readonly name: string;
  readonly description: string;
}

export interface QuestionnaireV1Question {
  readonly code: QuestionnaireV1QuestionCode;
  readonly area: QuestionnaireV1Area;
  readonly prompt: string;
  readonly weight: 1;
}

export const QUESTIONNAIRE_V1_RESPONSE_VALUES = Object.freeze([
  0, 1, 2, 3, 4,
] as const);

export type QuestionnaireV1ResponseValue =
  (typeof QUESTIONNAIRE_V1_RESPONSE_VALUES)[number];

export interface QuestionnaireV1ResponseOption {
  readonly value: QuestionnaireV1ResponseValue;
  readonly label: string;
}

/** Nomes e descrições exibidos no resultado, conforme a especificação do PO. */
export const QUESTIONNAIRE_V1_AREA_DETAILS = Object.freeze([
  Object.freeze({
    code: 'DEV',
    name: 'Desenvolvimento de Software',
    description:
      'Constrói sistemas, sites e aplicativos escrevendo código e resolvendo problemas com lógica.',
  }),
  Object.freeze({
    code: 'UX',
    name: 'UX/UI Design',
    description:
      'Projeta a experiência e a interface, garantindo que produtos sejam fáceis e agradáveis de usar.',
  }),
  Object.freeze({
    code: 'QA',
    name: 'Qualidade de Software (QA)',
    description:
      'Garante que o software funcione corretamente, planejando e executando testes e encontrando falhas.',
  }),
  Object.freeze({
    code: 'DSO',
    name: 'DevSecOps',
    description:
      'Automatiza, mantém e protege a infraestrutura, os servidores e o caminho do código até a produção.',
  }),
  Object.freeze({
    code: 'DAD',
    name: 'Análise de Dados',
    description:
      'Coleta, organiza e interpreta dados para gerar informações que apoiam decisões.',
  }),
  Object.freeze({
    code: 'PRD',
    name: 'Gestão de Produto',
    description:
      'Define o que será construído e por quê, prioriza demandas e faz a ponte entre negócio, usuários e time técnico.',
  }),
] as const satisfies readonly QuestionnaireV1AreaDefinition[]);

/** Escala oficial de resposta da versão 1. */
export const QUESTIONNAIRE_V1_RESPONSE_OPTIONS = Object.freeze([
  Object.freeze({ value: 0, label: 'Nunca é verdade' }),
  Object.freeze({ value: 1, label: 'Nem sempre é verdade' }),
  Object.freeze({ value: 2, label: 'Às vezes é verdade' }),
  Object.freeze({ value: 3, label: 'Quase sempre é verdade' }),
  Object.freeze({ value: 4, label: 'Sempre é verdade' }),
] as const satisfies readonly QuestionnaireV1ResponseOption[]);

/**
 * Catálogo estrutural da versão 1. Cada pergunta pertence exclusivamente à
 * própria área, com peso unitário e sem inversão de pontuação.
 */
export const QUESTIONNAIRE_V1_QUESTIONS = Object.freeze([
  defineQuestion(
    'DEV-01',
    'DEV',
    'Gosto de resolver problemas descrevendo, passo a passo, a lógica de como algo deve funcionar.',
  ),
  defineQuestion(
    'DEV-02',
    'DEV',
    'Sinto satisfação quando consigo fazer algo funcionar depois de muitas tentativas.',
  ),
  defineQuestion(
    'DEV-03',
    'DEV',
    'Tenho curiosidade em entender como os aplicativos e sites que uso foram construídos.',
  ),
  defineQuestion(
    'DEV-04',
    'DEV',
    'Consigo ficar concentrado por bastante tempo em uma tarefa que exige raciocínio lógico.',
  ),
  defineQuestion(
    'DEV-05',
    'DEV',
    'Gosto de aprender novas linguagens, ferramentas ou formas de construir coisas.',
  ),
  defineQuestion(
    'UX-01',
    'UX',
    'Percebo com facilidade quando um site ou aplicativo é confuso de usar.',
  ),
  defineQuestion(
    'UX-02',
    'UX',
    'Gosto de pensar em como deixar algo mais bonito, organizado e agradável visualmente.',
  ),
  defineQuestion(
    'UX-03',
    'UX',
    'Antes de criar algo, procuro entender as necessidades e dificuldades de quem vai usar.',
  ),
  defineQuestion(
    'UX-04',
    'UX',
    'Gosto de desenhar, rascunhar ou montar protótipos para explicar uma ideia.',
  ),
  defineQuestion(
    'UX-05',
    'UX',
    'Me interesso por cores, tipografia, ícones e composição visual.',
  ),
  defineQuestion(
    'QA-01',
    'QA',
    'Costumo encontrar erros ou detalhes que outras pessoas deixam passar.',
  ),
  defineQuestion(
    'QA-02',
    'QA',
    'Gosto de testar algo de várias formas diferentes para ver se ele quebra.',
  ),
  defineQuestion(
    'QA-03',
    'QA',
    'Prefiro conferir tudo com cuidado antes de considerar uma tarefa concluída.',
  ),
  defineQuestion(
    'QA-04',
    'QA',
    'Gosto de seguir e criar roteiros, checklists ou procedimentos bem definidos.',
  ),
  defineQuestion(
    'QA-05',
    'QA',
    'Me incomoda entregar algo sem ter certeza de que funciona corretamente.',
  ),
  defineQuestion(
    'DSO-01',
    'DSO',
    'Gosto de automatizar tarefas repetitivas para não precisar fazê-las manualmente.',
  ),
  defineQuestion(
    'DSO-02',
    'DSO',
    'Tenho interesse em entender como servidores, redes e a nuvem funcionam.',
  ),
  defineQuestion(
    'DSO-03',
    'DSO',
    'Penso em como proteger sistemas e dados contra ataques ou vazamentos.',
  ),
  defineQuestion(
    'DSO-04',
    'DSO',
    'Me sinto à vontade usando o terminal (linha de comando) do computador.',
  ),
  defineQuestion(
    'DSO-05',
    'DSO',
    'Gosto de garantir que um sistema fique estável e funcionando o tempo todo.',
  ),
  defineQuestion(
    'DAD-01',
    'DAD',
    'Gosto de trabalhar com números, planilhas e tabelas.',
  ),
  defineQuestion(
    'DAD-02',
    'DAD',
    'Tenho curiosidade em descobrir padrões e tendências escondidos em informações.',
  ),
  defineQuestion(
    'DAD-03',
    'DAD',
    'Prefiro tomar decisões com base em dados e evidências do que na intuição.',
  ),
  defineQuestion(
    'DAD-04',
    'DAD',
    'Gosto de transformar informações em gráficos ou relatórios fáceis de entender.',
  ),
  defineQuestion(
    'DAD-05',
    'DAD',
    'Me interesso por estatística, matemática ou inteligência artificial.',
  ),
  defineQuestion(
    'PRD-01',
    'PRD',
    'Gosto de organizar tarefas, prioridades e prazos de um grupo.',
  ),
  defineQuestion(
    'PRD-02',
    'PRD',
    'Me sinto à vontade conversando com pessoas para entender o que elas precisam.',
  ),
  defineQuestion(
    'PRD-03',
    'PRD',
    'Gosto de pensar no porquê de um produto existir e no valor que ele entrega.',
  ),
  defineQuestion(
    'PRD-04',
    'PRD',
    'Costumo mediar opiniões diferentes até o grupo chegar a um acordo.',
  ),
  defineQuestion(
    'PRD-05',
    'PRD',
    'Me interesso por negócios, mercado e estratégia.',
  ),
] as const);

function defineQuestion(
  code: QuestionnaireV1QuestionCode,
  area: QuestionnaireV1Area,
  prompt: string,
): QuestionnaireV1Question {
  return Object.freeze({ code, area, prompt, weight: 1 as const });
}
