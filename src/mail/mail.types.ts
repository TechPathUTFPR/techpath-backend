export interface MailConfig {
  host: string;
  port: number;
  /** true = TLS direto (porta 465). false = texto puro ou STARTTLS (587). */
  secure: boolean;
  /** Exige STARTTLS em conexões não "secure" (recomendado em produção). */
  requireTLS: boolean;
  /** Aceita só certificados válidos. Deixe true fora de testes locais. */
  rejectUnauthorized: boolean;
  auth?: { user: string; pass: string };
  /** Remetente padrão. Ex.: "TechPath <no-reply@techpath.com>". */
  from: string;
  timeoutMs: number;
  /** Tentativas extras após a primeira, só para falhas transitórias. */
  maxRetries: number;
  /** Espera base entre tentativas; dobra a cada tentativa. */
  retryDelayMs: number;
}

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendMailInput {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  /** Corpo em texto puro. Informe `text`, `html` ou ambos. */
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
}

export interface SendMailResult {
  messageId: string;
  accepted: string[];
  /** Destinatários que o servidor recusou (envio parcial). */
  rejected: string[];
  /** Quantas tentativas foram necessárias (1 = deu certo de primeira). */
  attempts: number;
}

/** Parte do Transporter do nodemailer que o serviço usa (facilita os testes). */
export interface MailTransport {
  sendMail(message: Record<string, unknown>): Promise<{
    messageId: string;
    accepted: unknown[];
    rejected: unknown[];
  }>;
  verify(): Promise<true>;
}
