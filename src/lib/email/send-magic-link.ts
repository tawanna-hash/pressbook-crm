/**
 * Email sender for portal magic links.
 *
 * Uses Resend's HTTP API directly (no SDK dependency). If
 * RESEND_API_KEY is not configured, returns { sent: false } so the
 * caller can still surface the link to staff as a copy-fallback.
 *
 * The from address defaults to `magic-link@${mailDomain}` of the org
 * if available, otherwise `onboarding@resend.dev` (Resend's test
 * domain). Staff should configure a verified domain for production.
 */

export type SendMagicLinkInput = {
  toEmail: string;
  toName?: string | null;
  orgName: string;
  orgBrandColor?: string | null;
  magicUrl: string;
  expiresAt: Date;
  fromAddress?: string | null;
};

export type SendMagicLinkResult =
  | { sent: true; providerId: string }
  | { sent: false; reason: "no_api_key" | "no_recipient" | "provider_error"; detail?: string };

function renderHtml(input: SendMagicLinkInput): string {
  const { orgName, orgBrandColor, magicUrl, expiresAt, toName } = input;
  const brand = orgBrandColor || "#021D40";
  const greetingName = toName?.trim() || "there";
  const expires = expiresAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr><td style="padding:24px 28px;background:${brand};color:#fff;">
            <div style="font-size:14px;font-weight:600;letter-spacing:0.02em;">${escapeHtml(orgName)}</div>
            <div style="font-size:22px;font-weight:800;margin-top:4px;">Your client portal is ready</div>
          </td></tr>
          <tr><td style="padding:28px;color:#1f2937;font-size:15px;line-height:1.55;">
            <p style="margin:0 0 16px;">Hi ${escapeHtml(greetingName)},</p>
            <p style="margin:0 0 16px;">You've got a client portal with ${escapeHtml(orgName)} where you can review files, complete forms, and manage your account. Click below to open it — no password required.</p>
            <p style="text-align:center;margin:28px 0;">
              <a href="${escapeAttr(magicUrl)}" style="display:inline-block;background:${brand};color:#ffffff;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;">Open My Portal</a>
            </p>
            <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">This link works once and expires on ${escapeHtml(expires)}. If it stops working, just reply to this email and we'll send you a fresh one.</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">If the button doesn't work, paste this into your browser:<br><span style="word-break:break-all;color:#374151;">${escapeHtml(magicUrl)}</span></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function renderText(input: SendMagicLinkInput): string {
  return [
    `Your ${input.orgName} client portal is ready.`,
    ``,
    `Open it with the link below — no password required.`,
    ``,
    input.magicUrl,
    ``,
    `This link works once and expires ${input.expiresAt.toISOString()}.`,
  ].join("\n");
}

export async function sendMagicLinkEmail(
  input: SendMagicLinkInput,
): Promise<SendMagicLinkResult> {
  if (!input.toEmail) return { sent: false, reason: "no_recipient" };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "no_api_key" };

  const from =
    input.fromAddress ??
    process.env.RESEND_FROM_ADDRESS ??
    "PressBook Portal <onboarding@resend.dev>";

  const body = {
    from,
    to: [input.toEmail],
    subject: `Your ${input.orgName} client portal`,
    html: renderHtml(input),
    text: renderText(input),
  };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { sent: false, reason: "provider_error", detail: detail.slice(0, 500) };
    }
    const json = (await res.json().catch(() => null)) as
      | { id?: string }
      | null;
    return { sent: true, providerId: json?.id ?? "" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { sent: false, reason: "provider_error", detail };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
