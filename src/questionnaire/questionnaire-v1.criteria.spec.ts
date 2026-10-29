import {
  QUESTIONNAIRE_V1_AREA_DETAILS,
  QUESTIONNAIRE_V1_AREAS,
  QUESTIONNAIRE_V1_QUESTIONS,
  QUESTIONNAIRE_V1_RESPONSE_OPTIONS,
  QUESTIONNAIRE_V1_RESPONSE_VALUES,
} from './questionnaire-v1.criteria.js';

const OFFICIAL_AREAS = [
  [
    'DEV',
    'Desenvolvimento de Software',
    'Constrói sistemas, sites e aplicativos escrevendo código e resolvendo problemas com lógica.',
  ],
  [
    'UX',
    'UX/UI Design',
    'Projeta a experiência e a interface, garantindo que produtos sejam fáceis e agradáveis de usar.',
  ],
  [
    'QA',
    'Qualidade de Software (QA)',
    'Garante que o software funcione corretamente, planejando e executando testes e encontrando falhas.',
  ],
  [
    'DSO',
    'DevSecOps',
    'Automatiza, mantém e protege a infraestrutura, os servidores e o caminho do código até a produção.',
  ],
  [
    'DAD',
    'Análise de Dados',
    'Coleta, organiza e interpreta dados para gerar informações que apoiam decisões.',
  ],
  [
    'PRD',
    'Gestão de Produto',
    'Define o que será construído e por quê, prioriza demandas e faz a ponte entre negócio, usuários e time técnico.',
  ],
] as const;

const OFFICIAL_QUESTIONS = [
  [
    'DEV-01',
    'DEV',
    'Gosto de resolver problemas descrevendo, passo a passo, a lógica de como algo deve funcionar.',
  ],
  [
    'DEV-02',
    'DEV',
    'Sinto satisfação quando consigo fazer algo funcionar depois de muitas tentativas.',
  ],
  [
    'DEV-03',
    'DEV',
    'Tenho curiosidade em entender como os aplicativos e sites que uso foram construídos.',
  ],
  [
    'DEV-04',
    'DEV',
    'Consigo ficar concentrado por bastante tempo em uma tarefa que exige raciocínio lógico.',
  ],
  [
    'DEV-05',
    'DEV',
    'Gosto de aprender novas linguagens, ferramentas ou formas de construir coisas.',
  ],
  [
    'UX-01',
    'UX',
    'Percebo com facilidade quando um site ou aplicativo é confuso de usar.',
  ],
  [
    'UX-02',
    'UX',
    'Gosto de pensar em como deixar algo mais bonito, organizado e agradável visualmente.',
  ],
  [
    'UX-03',
    'UX',
    'Antes de criar algo, procuro entender as necessidades e dificuldades de quem vai usar.',
  ],
  [
    'UX-04',
    'UX',
    'Gosto de desenhar, rascunhar ou montar protótipos para explicar uma ideia.',
  ],
  [
    'UX-05',
    'UX',
    'Me interesso por cores, tipografia, ícones e composição visual.',
  ],
  [
    'QA-01',
    'QA',
    'Costumo encontrar erros ou detalhes que outras pessoas deixam passar.',
  ],
  [
    'QA-02',
    'QA',
    'Gosto de testar algo de várias formas diferentes para ver se ele quebra.',
  ],
  [
    'QA-03',
    'QA',
    'Prefiro conferir tudo com cuidado antes de considerar uma tarefa concluída.',
  ],
  [
    'QA-04',
    'QA',
    'Gosto de seguir e criar roteiros, checklists ou procedimentos bem definidos.',
  ],
  [
    'QA-05',
    'QA',
    'Me incomoda entregar algo sem ter certeza de que funciona corretamente.',
  ],
  [
    'DSO-01',
    'DSO',
    'Gosto de automatizar tarefas repetitivas para não precisar fazê-las manualmente.',
  ],
  [
    'DSO-02',
    'DSO',
    'Tenho interesse em entender como servidores, redes e a nuvem funcionam.',
  ],
  [
    'DSO-03',
    'DSO',
    'Penso em como proteger sistemas e dados contra ataques ou vazamentos.',
  ],
  [
    'DSO-04',
    'DSO',
    'Me sinto à vontade usando o terminal (linha de comando) do computador.',
  ],
  [
    'DSO-05',
    'DSO',
    'Gosto de garantir que um sistema fique estável e funcionando o tempo todo.',
  ],
  ['DAD-01', 'DAD', 'Gosto de trabalhar com números, planilhas e tabelas.'],
  [
    'DAD-02',
    'DAD',
    'Tenho curiosidade em descobrir padrões e tendências escondidos em informações.',
  ],
  [
    'DAD-03',
    'DAD',
    'Prefiro tomar decisões com base em dados e evidências do que na intuição.',
  ],
  [
    'DAD-04',
    'DAD',
    'Gosto de transformar informações em gráficos ou relatórios fáceis de entender.',
  ],
  [
    'DAD-05',
    'DAD',
    'Me interesso por estatística, matemática ou inteligência artificial.',
  ],
  [
    'PRD-01',
    'PRD',
    'Gosto de organizar tarefas, prioridades e prazos de um grupo.',
  ],
  [
    'PRD-02',
    'PRD',
    'Me sinto à vontade conversando com pessoas para entender o que elas precisam.',
  ],
  [
    'PRD-03',
    'PRD',
    'Gosto de pensar no porquê de um produto existir e no valor que ele entrega.',
  ],
  [
    'PRD-04',
    'PRD',
    'Costumo mediar opiniões diferentes até o grupo chegar a um acordo.',
  ],
  ['PRD-05', 'PRD', 'Me interesso por negócios, mercado e estratégia.'],
] as const;

describe('questionnaire v1 criteria', () => {
  it('defines the six official areas in their stable order', () => {
    expect(QUESTIONNAIRE_V1_AREAS).toEqual(
      OFFICIAL_AREAS.map(([code]) => code),
    );
    expect(
      QUESTIONNAIRE_V1_AREA_DETAILS.map(({ code, name, description }) => [
        code,
        name,
        description,
      ]),
    ).toEqual(OFFICIAL_AREAS);
    expect(new Set(QUESTIONNAIRE_V1_AREAS).size).toBe(6);
  });

  it('defines the 30 official question codes and prompts exactly', () => {
    expect(QUESTIONNAIRE_V1_QUESTIONS).toHaveLength(30);
    expect(
      QUESTIONNAIRE_V1_QUESTIONS.map(({ code, area, prompt }) => [
        code,
        area,
        prompt,
      ]),
    ).toEqual(OFFICIAL_QUESTIONS);
    expect(
      new Set(QUESTIONNAIRE_V1_QUESTIONS.map((question) => question.code)).size,
    ).toBe(30);
  });

  it('assigns five questions exclusively to each area', () => {
    for (const area of QUESTIONNAIRE_V1_AREAS) {
      const questions = QUESTIONNAIRE_V1_QUESTIONS.filter(
        (question) => question.area === area,
      );

      expect(questions).toHaveLength(5);
      expect(
        questions.every((question) => question.code.startsWith(`${area}-`)),
      ).toBe(true);
      expect(
        questions.every(
          (question) =>
            Object.keys(question).sort().join(',') ===
            'area,code,prompt,weight',
        ),
      ).toBe(true);
    }
  });

  it('uses a unit weight for every question without inverted or cross-area scoring', () => {
    expect(
      QUESTIONNAIRE_V1_QUESTIONS.every((question) => question.weight === 1),
    ).toBe(true);
  });

  it('defines the official response value order and labels', () => {
    expect(QUESTIONNAIRE_V1_RESPONSE_VALUES).toEqual([0, 1, 2, 3, 4]);
    expect(QUESTIONNAIRE_V1_RESPONSE_OPTIONS).toEqual([
      { value: 0, label: 'Nunca é verdade' },
      { value: 1, label: 'Nem sempre é verdade' },
      { value: 2, label: 'Às vezes é verdade' },
      { value: 3, label: 'Quase sempre é verdade' },
      { value: 4, label: 'Sempre é verdade' },
    ]);
  });

  it('does not leave required question fields empty', () => {
    expect(
      QUESTIONNAIRE_V1_QUESTIONS.every(
        (question) =>
          question.code.length > 0 &&
          question.area.length > 0 &&
          question.prompt.length > 0 &&
          question.weight === 1,
      ),
    ).toBe(true);
  });
});
