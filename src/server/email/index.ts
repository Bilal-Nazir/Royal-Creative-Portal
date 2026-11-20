import { env } from "../env";
import { ConsoleEmailProvider } from "./email-provider";
import { SmtpEmailProvider } from "./smtp-provider";
import type { EmailProvider } from "./email-provider";

/** EMAIL_DRIVER=smtp (real email) or console (default — logs instead of sending). */
export const emailProvider: EmailProvider = env.EMAIL_DRIVER === "smtp" ? new SmtpEmailProvider() : new ConsoleEmailProvider();

export type { EmailProvider, EmailMessage } from "./email-provider";
export { renderEmail, appUrl } from "./templates";
