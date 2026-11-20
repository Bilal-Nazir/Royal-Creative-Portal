export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text is enough for the dev provider and real provider alike (4b wires real HTML templates). */
  body: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** Phase 4a — logs the email and link to the console instead of sending anything real. Real email is 4b. */
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(`\n--- EMAIL (dev) ---\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.body}\n-------------------\n`);
  }
}

export const emailProvider: EmailProvider = new ConsoleEmailProvider();
