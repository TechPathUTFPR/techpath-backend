/** Configuração de SMTP ausente ou inválida (variáveis de ambiente). */
export class MailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailConfigError';
  }
}

/** O e-mail pedido é inválido (destinatário, assunto, corpo...). Nada foi enviado. */
export class MailValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailValidationError';
  }
}

/**
 * O servidor SMTP não aceitou/entregou a mensagem.
 * `transient` indica se vale a pena tentar de novo mais tarde
 * (queda de conexão, timeout, resposta 4xx) ou se é um erro definitivo
 * (autenticação, destinatário rejeitado, resposta 5xx).
 */
export class MailDeliveryError extends Error {
  constructor(
    message: string,
    readonly transient: boolean,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MailDeliveryError';
  }
}

/** O envio foi pedido, mas o SMTP não está configurado neste ambiente. */
export class MailNotConfiguredError extends Error {
  constructor() {
    super(
      'O envio de e-mail não está configurado (defina SMTP_HOST e MAIL_FROM).',
    );
    this.name = 'MailNotConfiguredError';
  }
}
