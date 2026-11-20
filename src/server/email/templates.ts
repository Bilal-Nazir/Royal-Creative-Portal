import { env } from "../env";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface RenderEmailInput {
  subject: string;
  /** One short line under the heading. */
  preview: string;
  /** The heading shown in the dark header band. */
  heading: string;
  /** The main message, plain text — line breaks become paragraphs in the HTML version. */
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

/**
 * One shared template for every transactional email this app sends — not
 * 13 bespoke ones. Dark header with the agency name, one message, one
 * optional button; a plain-text version is derived from the same input so
 * the two never drift apart.
 */
export function renderEmail(input: RenderEmailInput): EmailContent {
  const paragraphs = input.body
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p style="margin:0 0 16px;color:#33333d;font-size:15px;line-height:1.5;">${escapeHtml(line)}</p>`)
    .join("\n");

  const button = input.ctaUrl
    ? `<a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;margin-top:8px;padding:12px 28px;border-radius:8px;background:linear-gradient(90deg,#f2b84b,#eb878f);color:#14141a;font-weight:600;text-decoration:none;font-size:14px;">${escapeHtml(input.ctaLabel ?? "View")}</a>`
    : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#14141a;padding:28px 32px;">
                <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">Royal Creative</p>
                <p style="margin:6px 0 0;color:#cfcfd6;font-size:13px;">${escapeHtml(input.preview)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;color:#14141a;font-size:22px;">${escapeHtml(input.heading)}</h1>
                ${paragraphs}
                ${button}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [input.heading, "", input.body, input.ctaUrl ? `\n${input.ctaLabel ?? "View"}: ${input.ctaUrl}` : ""]
    .filter(Boolean)
    .join("\n");

  return { subject: input.subject, text, html };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Convenience for building an absolute app link from a relative path. */
export function appUrl(path: string): string {
  return `${env.APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
