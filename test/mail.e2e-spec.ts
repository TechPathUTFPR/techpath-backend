import { Test, TestingModule } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { SMTPServer } from 'smtp-server';
import { MailModule } from './../src/mail/mail.module.js';
import { MailService } from './../src/mail/mail.service.js';

/**
 * Teste de integração com um servidor SMTP real (em memória, porta aleatória):
 * exercita nodemailer de verdade, sem Docker e sem enviar nada pra fora.
 */
describe('MailService with a real SMTP server (e2e)', () => {
  const USER = 'techpath';
  const PASS = 'senha-correta';

  let server: SMTPServer;
  let port: number;
  const received: { from: string; to: string[]; raw: string }[] = [];
  let rcptBehavior: (address: string) => Error | null = () => null;
  let rcptCalls = 0;

  const originalEnv = { ...process.env };

  async function createService(env: Record<string, string>) {
    Object.assign(process.env, {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(port),
      SMTP_USER: USER,
      SMTP_PASS: PASS,
      MAIL_FROM: 'TechPath <no-reply@techpath.test>',
      MAIL_RETRY_DELAY_MS: '0',
      ...env,
    });
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [MailModule],
    }).compile();
    await moduleRef.init();
    return { moduleRef, service: moduleRef.get(MailService) };
  }

  beforeAll(async () => {
    server = new SMTPServer({
      authOptional: false,
      disabledCommands: ['STARTTLS'],
      allowInsecureAuth: true,
      logger: false,
      onAuth(auth, _session, callback) {
        if (auth.username === USER && auth.password === PASS) {
          return callback(null, { user: auth.username });
        }
        const err = new Error('Invalid login') as Error & {
          responseCode: number;
        };
        err.responseCode = 535;
        return callback(err);
      },
      onRcptTo(address, _session, callback) {
        rcptCalls += 1;
        callback(rcptBehavior(address.address));
      },
      onData(stream, session, callback) {
        const chunks: Buffer[] = [];
        stream.on('data', (c: Buffer) => chunks.push(c));
        stream.on('end', () => {
          received.push({
            from: session.envelope.mailFrom
              ? session.envelope.mailFrom.address
              : '',
            to: session.envelope.rcptTo.map((r) => r.address),
            raw: Buffer.concat(chunks).toString('utf8'),
          });
          callback();
        });
      },
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    port = (server.server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.env = originalEnv;
  });

  beforeEach(() => {
    received.length = 0;
    rcptCalls = 0;
    rcptBehavior = () => null;
  });

  it('delivers a text e-mail with the configured sender', async () => {
    const { moduleRef, service } = await createService({});
    const result = await service.send({
      to: 'ana@example.com',
      subject: 'Teste SMTP',
      text: 'Ola mundo',
    });

    expect(result.accepted).toEqual(['ana@example.com']);
    expect(received).toHaveLength(1);
    expect(received[0].from).toBe('no-reply@techpath.test');
    expect(received[0].to).toEqual(['ana@example.com']);
    expect(received[0].raw).toContain('Subject: Teste SMTP');
    expect(received[0].raw).toContain('Ola mundo');
    await moduleRef.close();
  });

  it('delivers html, cc, bcc and an attachment', async () => {
    const { moduleRef, service } = await createService({});
    await service.send({
      to: 'ana@example.com',
      cc: 'cc@example.com',
      bcc: 'bcc@example.com',
      subject: 'Relatorio',
      html: '<p>Seu resultado</p>',
      attachments: [
        { filename: 'resultado.pdf', content: Buffer.from('%PDF-1.4 fake') },
      ],
    });

    expect(received[0].to.sort()).toEqual(
      ['ana@example.com', 'bcc@example.com', 'cc@example.com'].sort(),
    );
    expect(received[0].raw).toContain('resultado.pdf');
    expect(received[0].raw).not.toMatch(/^Bcc:/im); // BCC nunca aparece nos headers
    await moduleRef.close();
  });

  it('fails without retrying when the password is wrong (EAUTH)', async () => {
    const { moduleRef, service } = await createService({
      SMTP_PASS: 'senha-errada',
    });
    await expect(
      service.send({ to: 'ana@example.com', subject: 'x', text: 'y' }),
    ).rejects.toMatchObject({ name: 'MailDeliveryError', transient: false });
    expect(received).toHaveLength(0);
    await moduleRef.close();
  });

  it('reports a rejected recipient on partial delivery', async () => {
    rcptBehavior = (address) =>
      address === 'ruim@example.com'
        ? Object.assign(new Error('User unknown'), { responseCode: 550 })
        : null;
    const { moduleRef, service } = await createService({});
    const result = await service.send({
      to: ['ana@example.com', 'ruim@example.com'],
      subject: 'x',
      text: 'y',
    });
    expect(result.accepted).toEqual(['ana@example.com']);
    expect(result.rejected).toEqual(['ruim@example.com']);
    await moduleRef.close();
  });

  it('fails permanently when every recipient is rejected (5xx)', async () => {
    rcptBehavior = () =>
      Object.assign(new Error('User unknown'), { responseCode: 550 });
    const { moduleRef, service } = await createService({});
    await expect(
      service.send({ to: 'ruim@example.com', subject: 'x', text: 'y' }),
    ).rejects.toMatchObject({ name: 'MailDeliveryError', transient: false });
    expect(rcptCalls).toBe(1); // sem retentativa
    await moduleRef.close();
  });

  it('retries a temporary 4xx and succeeds', async () => {
    let first = true;
    rcptBehavior = () => {
      if (first) {
        first = false;
        return Object.assign(new Error('Try again later'), {
          responseCode: 451,
        });
      }
      return null;
    };
    const { moduleRef, service } = await createService({});
    const result = await service.send({
      to: 'ana@example.com',
      subject: 'x',
      text: 'y',
    });
    expect(result.attempts).toBe(2);
    expect(received).toHaveLength(1);
    await moduleRef.close();
  });

  it('returns a transient error when the server is unreachable', async () => {
    const { moduleRef, service } = await createService({
      SMTP_PORT: '1',
      MAIL_MAX_RETRIES: '1',
    });
    await expect(
      service.send({ to: 'ana@example.com', subject: 'x', text: 'y' }),
    ).rejects.toMatchObject({ name: 'MailDeliveryError', transient: true });
    await moduleRef.close();
  });

  it('boots with e-mail disabled when SMTP_HOST is not set', async () => {
    const saved = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    const moduleRef = await Test.createTestingModule({
      imports: [MailModule],
    }).compile();
    await moduleRef.init();
    const service = moduleRef.get(MailService);
    expect(service.enabled).toBe(false);
    await expect(
      service.send({ to: 'ana@example.com', subject: 'x', text: 'y' }),
    ).rejects.toMatchObject({ name: 'MailNotConfiguredError' });
    process.env.SMTP_HOST = saved;
    await moduleRef.close();
  });
});
