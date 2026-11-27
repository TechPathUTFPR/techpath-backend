export class CreateQuestionDto {
  /** Texto da afirmação, em primeira pessoa. */
  enunciado: string;
  /** Código da área (DEV, UX, QA, DSO, DAD, PRD...). */
  areaCodigo: string;
  /** Peso da pergunta (padrão 1). Até 2 casas decimais, > 0 e <= 99,99. */
  peso?: number;
  /** Padrão: true. */
  ativa?: boolean;
}
