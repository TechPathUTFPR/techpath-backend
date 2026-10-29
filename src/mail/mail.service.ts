import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { MAIL_CONFIG, MAIL_TRANSPORTER } from './mail.constants.js';
import {
  MailDeliveryError,
  MailNotConfiguredError,
  MailValidationError,
} from './mail.errors.js';
import {
  MailConfig,
  MailTransport,
  SendMailInput,
  SendMailResult,
} from './mail.types.js';

const EMAIL_REGEX = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const MAX_RECIPIENTS = 50;
const MAX_SUBJECT_LENGTH = 200;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const TRANSIENT_CODES = new Set([
  'ECONNECTION',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ESOCKET',
  'EDNS',
  'EAI_AGAIN',
]);

interface SmtpError extends Error {
  code?: string;
  responseCode?: number;
}

/**
 * Envio de e-mail via SMTP (nodemailer).
 *
 * Responsabilidades: validar o pedido, enviar, repetir em falhas transitórias
 * (queda de rede, timeout, resposta 4xx) e devolver erros claros. O conteúdo
 * (assunto/corpo/HTML) é decidido por quem chama — ainda não há templates.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_CONFIG) private readonly config: MailConfig | null,
    @Optional()
    @Inject(MAIL_TRANSPORTER)
    private readonly transporter: MailTransport | null,
  ) {}

  /** true quando há SMTP configurado neste ambiente. */
  get enabled(): boolean {
    return this.config !== null && this.transporter !== null;
  }

  /** Confere a conexão/credenciais ao subir, sem derrubar a aplicação. */
  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.warn('SMTP não configurado: envio de e-mail desativado.');
      return;
    }
    this.verifyConnection().then(
      () =>
        this.logger.log(
          `SMTP pronto em ${this.config!.host}:${this.config!.port}.`,
        ),
      (error: unknown) =>
        this.logger.warn(`Falha ao verificar o SMTP: ${this.describe(error)}`),
    );
  }

  /** Testa conexão e autenticação com o servidor SMTP (ex.: health check). */
  async verifyConnection(): Promise<void> {
    if (!this.enabled) throw new MailNotConfiguredError();
    try {
      await this.transporter!.verify();
    } catch (error) {
      throw new MailDeliveryError(
        `Não foi possível conectar ao SMTP: ${this.describe(error)}`,
        this.isTransient(error),
        error,
      );
    }
  }

  async send(input: SendMailInput): Promise<SendMailResult> {
    if (!this.enabled) throw new MailNotConfiguredError();

    const message = this.buildMessage(input);
    const { maxRetries, retryDelayMs } = this.config!;
    let attempt = 0;

    for (;;) {
      attempt += 1;
      try {
        const info = await this.transporter!.sendMail(message);
        const accepted = info.accepted.map(String);
        const rejected = info.rejected.map(String);

        if (accepted.length === 0) {
          throw new MailDeliveryError(
            'O servidor SMTP recusou todos os destinatários.',
            false,
          );
        }
        if (rejected.length > 0) {
          this.logger.warn(
            `Envio parcial: ${rejected.length} destinatário(s) recusado(s).`,
          );
        }
        this.logger.log(
          `E-mail ${info.messageId} enviado a ${accepted.length} destinatário(s) (tentativa ${attempt}).`,
        );
        return {
          messageId: info.messageId,
          accepted,
          rejected,
          attempts: attempt,
        };
      } catch (error) {
        if (error instanceof MailDeliveryError) throw error;

        const transient = this.isTransient(error);
        if (transient && attempt <= maxRetries) {
          const delay = retryDelayMs * 2 ** (attempt - 1);
          this.logger.warn(
            `Falha transitória no SMTP (${this.describe(error)}); nova tentativa em ${delay}ms.`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new MailDeliveryError(
          `Falha ao enviar e-mail: ${this.describe(error)}`,
          transient,
          error,
        );
      }
    }
  }

  // ---------------------------------------------------------------- privado

  private buildMessage(input: SendMailInput): Record<string, unknown> {
    const to = this.normalizeRecipients(input.to, 'to');
    const cc = this.normalizeRecipients(input.cc, 'cc');
    const bcc = this.normalizeRecipients(input.bcc, 'bcc');

    if (to.length === 0) {
      throw new MailValidationError(
        'Informe ao menos um destinatário em "to".',
      );
    }
    if (to.length + cc.length + bcc.length > MAX_RECIPIENTS) {
      throw new MailValidationError(
        `Máximo de ${MAX_RECIPIENTS} destinatários por e-mail.`,
      );
    }

    const subject = input.subject?.trim();
    if (!subject) {
      throw new MailValidationError('O assunto é obrigatório.');
    }
    if (/[\r\n]/.test(subject)) {
      throw new MailValidationError(
        'O assunto não pode conter quebras de linha.',
      );
    }
    if (subject.length > MAX_SUBJECT_LENGTH) {
      throw new MailValidationError(
        `O assunto deve ter no máximo ${MAX_SUBJECT_LENGTH} caracteres.`,
      );
    }

    const text = input.text?.trim() ? input.text : undefined;
    const html = input.html?.trim() ? input.html : undefined;
    if (!text && !html) {
      throw new MailValidationError(
        'Informe o corpo do e-mail em "text" ou "html".',
      );
    }

    let replyTo: string | undefined;
    if (input.replyTo) {
      replyTo = this.normalizeRecipients(input.replyTo, 'replyTo')[0];
    }

    for (const attachment of input.attachments ?? []) {
      if (
        !attachment.filename?.trim() ||
        /[\r\n\\/]/.test(attachment.filename)
      ) {
        throw new MailValidationError('Nome de anexo inválido.');
      }
      const size = Buffer.byteLength(attachment.content);
      if (size > MAX_ATTACHMENT_BYTES) {
        throw new MailValidationError(
          `O anexo "${attachment.filename}" excede 10 MB.`,
        );
      }
    }

    return {
      from: this.config!.from,
      to,
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
      ...(replyTo ? { replyTo } : {}),
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    };
  }

  /** Valida, normaliza (minúsculas) e remove duplicados. */
  private normalizeRecipients(
    value: string | string[] | undefined,
    field: string,
  ): string[] {
    if (value === undefined || value === null) return [];
    const list = Array.isArray(value) ? value : [value];
    const seen = new Set<string>();

    for (const raw of list) {
      const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
      if (!EMAIL_REGEX.test(email)) {
        throw new MailValidationError(`E-mail inválido em "${field}".`);
      }
      seen.add(email);
    }
    return [...seen];
  }

  private isTransient(error: unknown): boolean {
    const err = error as SmtpError;
    if (err?.code && TRANSIENT_CODES.has(err.code)) return true;
    // 4xx do SMTP = "tente de novo mais tarde"; 5xx = definitivo.
    return (
      typeof err?.responseCode === 'number' &&
      err.responseCode >= 400 &&
      err.responseCode < 500
    );
  }

  /** Mensagem segura para log/erro (nunca inclui credenciais ou corpo). */
  private describe(error: unknown): string {
    const err = error as SmtpError;
    const parts = [err?.code, err?.responseCode, err?.message].filter(Boolean);
    return parts.length ? parts.join(' ') : 'erro desconhecido';
  }
}
