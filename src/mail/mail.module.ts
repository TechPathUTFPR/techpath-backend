import { Global, Module } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { loadMailConfig } from './mail.config.js';
import { MAIL_CONFIG, MAIL_TRANSPORTER } from './mail.constants.js';
import { MailService } from './mail.service.js';
import { MailConfig, MailTransport } from './mail.types.js';

@Global()
@Module({
  providers: [
    { provide: MAIL_CONFIG, useFactory: () => loadMailConfig() },
    {
      provide: MAIL_TRANSPORTER,
      inject: [MAIL_CONFIG],
      useFactory: (config: MailConfig | null): MailTransport | null => {
        if (!config) return null;
        return nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          requireTLS: config.requireTLS,
          auth: config.auth,
          tls: { rejectUnauthorized: config.rejectUnauthorized },
          connectionTimeout: config.timeoutMs,
          greetingTimeout: config.timeoutMs,
          socketTimeout: config.timeoutMs,
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
