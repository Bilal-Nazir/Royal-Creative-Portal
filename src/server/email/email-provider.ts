export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** EMAIL_DRIVER=console (default) — logs the email (and any link embedded in it) to the console instead of sending anything real. */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(`\n--- EMAIL (console) ---\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n-------------------\n`);
  }
}
