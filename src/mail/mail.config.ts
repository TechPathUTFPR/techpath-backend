import { MailConfigError } from './mail.errors.js';
import { MailConfig } from './mail.types.js';

type Env = Record<string, string | undefined>;

const EMAIL_IN_FROM = /<?([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)>?\s*$/;

function readBool(value: string | undefined, fallback: boolean, name: string) {
  if (value === undefined || value.trim() === '') return fallback;
  const v = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(v)) return true;
  if (['false', '0', 'no'].includes(v)) return false;
  throw new MailConfigError(`${name} deve ser "true" ou "false".`);
}

function readInt(
  value: string | undefined,
  fallback: number,
  name: string,
  { min, max }: { min: number; max: number },
) {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new MailConfigError(
      `${name} deve ser um inteiro entre ${min} e ${max}.`,
    );
  }
  return n;
}

/**
 * Lê a configuração de SMTP das variáveis de ambiente.
 *
 * - Sem `SMTP_HOST` => retorna `null`: o app sobe normalmente, mas o envio
 *   de e-mail fica desativado (útil em dev/CI sem servidor SMTP).
 * - Com `SMTP_HOST` e configuração inválida => lança `MailConfigError`
 *   (falha rápida na inicialização, em vez de falhar no primeiro envio).
 */
export function loadMailConfig(env: Env = process.env): MailConfig | null {
  const host = env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = readInt(env.SMTP_PORT, 587, 'SMTP_PORT', { min: 1, max: 65535 });
  const secure = readBool(env.SMTP_SECURE, port === 465, 'SMTP_SECURE');
  const requireTLS = readBool(env.SMTP_REQUIRE_TLS, false, 'SMTP_REQUIRE_TLS');
  const rejectUnauthorized = readBool(
    env.SMTP_TLS_REJECT_UNAUTHORIZED,
    true,
    'SMTP_TLS_REJECT_UNAUTHORIZED',
  );

  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;
  if ((user && !pass) || (!user && pass)) {
    throw new MailConfigError(
      'SMTP_USER e SMTP_PASS devem ser informados juntos.',
    );
  }

  const from = env.MAIL_FROM?.trim();
  if (!from) {
    throw new MailConfigError(
      'MAIL_FROM é obrigatório quando SMTP_HOST existe.',
    );
  }
  if (/[\r\n]/.test(from) || !EMAIL_IN_FROM.test(from)) {
    throw new MailConfigError(
      'MAIL_FROM inválido. Use "email@dominio.com" ou "Nome <email@dominio.com>".',
    );
  }

  return {
    host,
    port,
    secure,
    requireTLS,
    rejectUnauthorized,
    auth: user && pass ? { user, pass } : undefined,
    from,
    timeoutMs: readInt(env.SMTP_TIMEOUT_MS, 10_000, 'SMTP_TIMEOUT_MS', {
      min: 1_000,
      max: 120_000,
    }),
    maxRetries: readInt(env.MAIL_MAX_RETRIES, 2, 'MAIL_MAX_RETRIES', {
      min: 0,
      max: 5,
    }),
    retryDelayMs: readInt(env.MAIL_RETRY_DELAY_MS, 500, 'MAIL_RETRY_DELAY_MS', {
      min: 0,
      max: 60_000,
    }),
  };
}
