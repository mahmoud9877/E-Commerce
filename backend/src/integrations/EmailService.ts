import nodemailer, { type Transporter } from "nodemailer";
import { AppError } from "../core/AppError.js";
import { Env } from "../core/Env.js";
import type { EmailOptions, IMailer } from "../core/contracts.js";

export class EmailService implements IMailer {
  #transporter?: Transporter;

  // Any SMTP provider (SES, SendGrid, Mailgun, ...) when SMTP_HOST is set, otherwise Gmail
  get transporter(): Transporter {
    this.#transporter ??= process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: Env.get("SMTP_HOST"),
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: { user: Env.get("SMTP_USER"), pass: Env.get("SMTP_PASS") },
        })
      : nodemailer.createTransport({
          service: "gmail",
          auth: { user: Env.get("gmail"), pass: Env.get("gmailPass") },
        });
    return this.#transporter;
  }

  static get #from(): string {
    if (process.env.MAIL_FROM) return process.env.MAIL_FROM;
    const address = process.env.SMTP_HOST ? Env.get("SMTP_USER") : Env.get("gmail");
    return `"${process.env.APP_NAME || "E-Commerce"}" <${address}>`;
  }

  async send({ to, cc, bcc, subject, html, attachments = [] }: EmailOptions): Promise<void> {
    const info = await this.transporter.sendMail({
      from: EmailService.#from,
      to,
      cc,
      bcc,
      subject,
      html,
      attachments,
    });
    if (info.rejected?.length) {
      throw new AppError("Email Rejected", 400);
    }
  }
}
