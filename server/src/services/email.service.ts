import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = env.SMTP_USER && env.SMTP_PASS
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export function assertEmailConfigured(): void {
  if (!transporter || !env.SMTP_FROM) {
    throw new Error("Password reset email is not configured; set SMTP_USER and SMTP_PASS (SMTP_FROM defaults to SMTP_USER)");
  }
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  assertEmailConfigured();

  await transporter!.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}
