/** Todos os campos são opcionais, mas ao menos um deve ser informado. */
export class UpdateQuestionDto {
  enunciado?: string;
  areaCodigo?: string;
  peso?: number;
  ativa?: boolean;
}
