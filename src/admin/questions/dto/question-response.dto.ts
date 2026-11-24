export interface QuestionAreaView {
  id: string;
  codigo: string;
  nome: string;
  ativa: boolean;
}

export interface QuestionView {
  id: string;
  codigo: string | null;
  enunciado: string;
  ativa: boolean;
  peso: number;
  area: QuestionAreaView | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

/** Devolvido ao criar/editar: mostra o efeito da mudança na área (RN13). */
export interface QuestionWriteView extends QuestionView {
  areaPerguntasAtivas: number;
  /** A área só aparece no questionário se estiver ativa e tiver 5+ perguntas ativas. */
  areaElegivel: boolean;
}
