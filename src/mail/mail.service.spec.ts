import {
  MailDeliveryError,
  MailNotConfiguredError,
  MailValidationError,
} from './mail.errors.js';
import { MailService } from './mail.service.js';
import { MailConfig, MailTransport } from './mail.types.js';

const config: MailConfig = {
  host: 'smtp.test',
  port: 587,
  secure: false,
  requireTLS: false,
  rejectUnauthorized: true,
  from: 'TechPath <no-reply@techpath.com>',
  timeoutMs: 1000,
  maxRetries: 2,
  retryDelayMs: 0,
};

function makeTransport(overrides: Partial<MailTransport> = {}) {
  const transport = {
    sendMail: vi.fn().mockResolvedValue({
      messageId: '<id@test>',
      accepted: ['ana@example.com'],
      rejected: [],
    }),
    verify: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  return transport as MailTransport & {
    sendMail: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };
}

function smtpError(message: string, props: Record<string, unknown>) {
  return Object.assign(new Error(message), props);
}

const valid = { to: 'ana@example.com', subject: 'Olá', text: 'Corpo' };

describe('MailService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('send - sucesso', () => {
    it('sends with the configured sender and returns the result', async () => {
      const transport = makeTransport();
      const service = new MailService(config, transport);

      const result = await service.send(valid);

      expect(result).toEqual({
        messageId: '<id@test>',
        accepted: ['ana@example.com'],
        rejected: [],
        attempts: 1,
      });
      expect(transport.sendMail).toHaveBeenCalledWith({
        from: 'TechPath <no-reply@techpath.com>',
        to: ['ana@example.com'],
        subject: 'Olá',
        text: 'Corpo',
      });
    });

    it('normalizes (trim + lowercase) and de-duplicates recipients', async () => {
      const transport = makeTransport();
      await new MailService(config, transport).send({
        ...valid,
        to: [' Ana@Example.com ', 'ana@example.com', 'bia@example.com'],
      });
      expect(transport.sendMail.mock.calls[0][0].to).toEqual([
        'ana@example.com',
        'bia@example.com',
      ]);
    });

    it('accepts html only, cc, bcc, replyTo and attachments', async () => {
      const transport = makeTransport();
      await new MailService(config, transport).send({
        to: 'ana@example.com',
        cc: 'cc@example.com',
        bcc: ['bcc@example.com'],
        replyTo: 'suporte@techpath.com',
        subject: 'Relatório',
        html: '<p>Oi</p>',
        attachments: [
          { filename: 'resultado.pdf', content: Buffer.from('%PDF') },
        ],
      });
      expect(transport.sendMail.mock.calls[0][0]).toMatchObject({
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        replyTo: 'suporte@techpath.com',
        html: '<p>Oi</p>',
      });
    });

    it('returns rejected recipients on partial delivery', async () => {
      const transport = makeTransport({
        sendMail: vi.fn().mockResolvedValue({
          messageId: '<id@test>',
          accepted: ['ana@example.com'],
          rejected: ['bia@example.com'],
        }),
      });
      const result = await new MailService(config, transport).send({
        ...valid,
        to: ['ana@example.com', 'bia@example.com'],
      });
      expect(result.rejected).toEqual(['bia@example.com']);
    });
  });

  describe('send - validação (nada é enviado)', () => {
    it.each([
      ['sem destinatário', { ...valid, to: [] }],
      ['destinatário inválido', { ...valid, to: 'sem-arroba' }],
      [
        'um destinatário inválido na lista',
        { ...valid, to: ['ana@example.com', 'x'] },
      ],
      [
        'injeção de header no destinatário',
        { ...valid, to: 'a@b.com\r\nBcc: x@y.com' },
      ],
      ['vários e-mails numa string', { ...valid, to: 'a@b.com, c@d.com' }],
      ['assunto vazio', { ...valid, subject: '   ' }],
      [
        'assunto com quebra de linha',
        { ...valid, subject: 'Oi\r\nBcc: x@y.com' },
      ],
      ['assunto muito longo', { ...valid, subject: 'a'.repeat(201) }],
      ['sem corpo', { to: 'ana@example.com', subject: 'Oi' }],
      ['corpo só com espaços', { ...valid, text: '  ', html: '' }],
      ['replyTo inválido', { ...valid, replyTo: 'nao-e-email' }],
      [
        'nome de anexo com caminho',
        { ...valid, attachments: [{ filename: '../x.pdf', content: 'a' }] },
      ],
      [
        'mais de 50 destinatários',
        {
          ...valid,
          to: Array.from({ length: 51 }, (_, i) => `u${i}@example.com`),
        },
      ],
    ])('rejects: %s', async (_name, input) => {
      const transport = makeTransport();
      await expect(
        new MailService(config, transport).send(input as never),
      ).rejects.toBeInstanceOf(MailValidationError);
      expect(transport.sendMail).not.toHaveBeenCalled();
    });

    it('rejects attachments larger than 10 MB', async () => {
      const transport = makeTransport();
      await expect(
        new MailService(config, transport).send({
          ...valid,
          attachments: [
            {
              filename: 'grande.bin',
              content: Buffer.alloc(10 * 1024 * 1024 + 1),
            },
          ],
        }),
      ).rejects.toBeInstanceOf(MailValidationError);
    });
  });

  describe('send - falhas e retentativas', () => {
    it('retries transient network errors and then succeeds', async () => {
      const sendMail = vi
        .fn()
        .mockRejectedValueOnce(smtpError('timeout', { code: 'ETIMEDOUT' }))
        .mockRejectedValueOnce(smtpError('reset', { code: 'ECONNRESET' }))
        .mockResolvedValue({
          messageId: '<ok>',
          accepted: ['ana@example.com'],
          rejected: [],
        });
      const result = await new MailService(
        config,
        makeTransport({ sendMail }),
      ).send(valid);
      expect(sendMail).toHaveBeenCalledTimes(3);
      expect(result.attempts).toBe(3);
    });

    it('retries SMTP 4xx responses (temporary failure)', async () => {
      const sendMail = vi
        .fn()
        .mockRejectedValueOnce(smtpError('try later', { responseCode: 451 }))
        .mockResolvedValue({
          messageId: '<ok>',
          accepted: ['ana@example.com'],
          rejected: [],
        });
      const result = await new MailService(
        config,
        makeTransport({ sendMail }),
      ).send(valid);
      expect(result.attempts).toBe(2);
    });

    it('gives up after maxRetries and flags the error as transient', async () => {
      const sendMail = vi
        .fn()
        .mockRejectedValue(smtpError('timeout', { code: 'ETIMEDOUT' }));
      const promise = new MailService(config, makeTransport({ sendMail })).send(
        valid,
      );
      await expect(promise).rejects.toMatchObject({
        name: 'MailDeliveryError',
        transient: true,
      });
      expect(sendMail).toHaveBeenCalledTimes(3); // 1 + 2 retentativas
    });

    it.each([
      ['autenticação', { code: 'EAUTH', responseCode: 535 }],
      [
        'destinatário inexistente (5xx)',
        { code: 'EENVELOPE', responseCode: 550 },
      ],
    ])('does not retry permanent errors: %s', async (_name, props) => {
      const sendMail = vi.fn().mockRejectedValue(smtpError('fail', props));
      const promise = new MailService(config, makeTransport({ sendMail })).send(
        valid,
      );
      await expect(promise).rejects.toMatchObject({
        name: 'MailDeliveryError',
        transient: false,
      });
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('fails when the server accepts no recipient', async () => {
      const sendMail = vi.fn().mockResolvedValue({
        messageId: '<x>',
        accepted: [],
        rejected: ['ana@example.com'],
      });
      await expect(
        new MailService(config, makeTransport({ sendMail })).send(valid),
      ).rejects.toBeInstanceOf(MailDeliveryError);
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('never leaks credentials or body in the error message', async () => {
      const sendMail = vi
        .fn()
        .mockRejectedValue(smtpError('Invalid login', { code: 'EAUTH' }));
      const service = new MailService(
        { ...config, auth: { user: 'user', pass: 'SEGREDO123' } },
        makeTransport({ sendMail }),
      );
      const error = await service
        .send({ ...valid, text: 'conteudo-sensivel' })
        .catch((e) => e);
      expect(error.message).not.toContain('SEGREDO123');
      expect(error.message).not.toContain('conteudo-sensivel');
    });
  });

  describe('SMTP não configurado', () => {
    it('reports disabled and throws MailNotConfiguredError on send/verify', async () => {
      const service = new MailService(null, null);
      expect(service.enabled).toBe(false);
      await expect(service.send(valid)).rejects.toBeInstanceOf(
        MailNotConfiguredError,
      );
      await expect(service.verifyConnection()).rejects.toBeInstanceOf(
        MailNotConfiguredError,
      );
    });

    it('onModuleInit does not throw when disabled', () => {
      expect(() => new MailService(null, null).onModuleInit()).not.toThrow();
    });
  });

  describe('verifyConnection', () => {
    it('resolves when the server responds', async () => {
      await expect(
        new MailService(config, makeTransport()).verifyConnection(),
      ).resolves.toBeUndefined();
    });

    it('wraps failures in MailDeliveryError', async () => {
      const verify = vi
        .fn()
        .mockRejectedValue(smtpError('refused', { code: 'ECONNREFUSED' }));
      await expect(
        new MailService(config, makeTransport({ verify })).verifyConnection(),
      ).rejects.toMatchObject({ name: 'MailDeliveryError', transient: true });
    });

    it('onModuleInit swallows verification failures (app still boots)', async () => {
      const verify = vi.fn().mockRejectedValue(new Error('down'));
      const service = new MailService(config, makeTransport({ verify }));
      expect(() => service.onModuleInit()).not.toThrow();
      await new Promise((r) => setTimeout(r, 0));
    });
  });
});
