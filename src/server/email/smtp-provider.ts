import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env";
import type { EmailProvider, EmailMessage } from "./email-provider";

/** EMAIL_DRIVER=smtp — real email via nodemailer. Requires SMTP_HOST/SMTP_FROM (checked in env.ts). */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ? Number(env.SMTP_PORT) : 587,
      secure: env.SMTP_PORT === "465",
      auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
    return this.transporter;
  }

  async send(message: EmailMessage): Promise<void> {
    await this.getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
