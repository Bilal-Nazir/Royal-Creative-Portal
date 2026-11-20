import { emailProvider } from "../email";
import type { EmailMessage } from "../email";

/** Every email in the app goes through this — a failed send is logged and never breaks the caller's action (invite, notification, ...). */
export async function sendEmailSafely(message: EmailMessage): Promise<void> {
  try {
    await emailProvider.send(message);
  } catch (error) {
    console.error(`Failed to send email to ${message.to} ("${message.subject}"):`, error);
  }
}
