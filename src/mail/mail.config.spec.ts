import { loadMailConfig } from './mail.config.js';
import { MailConfigError } from './mail.errors.js';

const base = {
  SMTP_HOST: 'smtp.example.com',
  MAIL_FROM: 'TechPath <no-reply@techpath.com>',
};

describe('loadMailConfig', () => {
  it('returns null when SMTP_HOST is not set (email disabled)', () => {
    expect(loadMailConfig({})).toBeNull();
    expect(loadMailConfig({ SMTP_HOST: '   ' })).toBeNull();
  });

  it('applies defaults', () => {
    expect(loadMailConfig(base)).toMatchObject({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      requireTLS: false,
      rejectUnauthorized: true,
      auth: undefined,
      timeoutMs: 10_000,
      maxRetries: 2,
    });
  });

  it('uses secure=true by default on port 465', () => {
    expect(loadMailConfig({ ...base, SMTP_PORT: '465' })?.secure).toBe(true);
  });

  it('lets SMTP_SECURE override the port default', () => {
    expect(
      loadMailConfig({ ...base, SMTP_PORT: '465', SMTP_SECURE: 'false' })
        ?.secure,
    ).toBe(false);
  });

  it('reads credentials when both are present', () => {
    expect(
      loadMailConfig({ ...base, SMTP_USER: 'u', SMTP_PASS: 'p' })?.auth,
    ).toEqual({ user: 'u', pass: 'p' });
  });

  it.each([
    [{ SMTP_USER: 'u' }, 'SMTP_USER e SMTP_PASS'],
    [{ SMTP_PASS: 'p' }, 'SMTP_USER e SMTP_PASS'],
    [{ SMTP_PORT: 'abc' }, 'SMTP_PORT'],
    [{ SMTP_PORT: '70000' }, 'SMTP_PORT'],
    [{ SMTP_SECURE: 'talvez' }, 'SMTP_SECURE'],
    [{ MAIL_MAX_RETRIES: '-1' }, 'MAIL_MAX_RETRIES'],
    [{ MAIL_FROM: '' }, 'MAIL_FROM'],
    [{ MAIL_FROM: 'sem-arroba' }, 'MAIL_FROM'],
    [{ MAIL_FROM: 'a@b.com\r\nBcc: x@y.com' }, 'MAIL_FROM'],
  ])('throws MailConfigError for invalid config %j', (override, fragment) => {
    const env = { ...base, ...override };
    expect(() => loadMailConfig(env)).toThrow(MailConfigError);
    expect(() => loadMailConfig(env)).toThrow(fragment);
  });
});
