import nodemailer, { type Transporter } from "nodemailer";
import { AppError } from "../core/AppError.js";
import { Env } from "../core/Env.js";
import type { EmailOptions, IMailer } from "../core/contracts.js";

export class EmailService implements IMailer {
  #transporter?: Transporter;

  get transporter(): Transporter {
    this.#transporter ??= nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: Env.get("gmail"),
        pass: Env.get("gmailPass"),
      },
    });
    return this.#transporter;
  }

  async send({ to, cc, bcc, subject, html, attachments = [] }: EmailOptions): Promise<void> {
    const info = await this.transporter.sendMail({
      from: `"Route Academy" <${Env.get("gmail")}>`,
      to,
      cc,
      bcc,
      subject,
      html,
      attachments,
    });
    if (info.rejected.length) {
      throw new AppError("Email Rejected", 400);
    }
  }
}

