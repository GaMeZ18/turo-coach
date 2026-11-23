import "server-only";

// Envío de emails con Resend (https://resend.com). Sin RESEND_API_KEY no se envía nada (y se avisa en el panel).
// Variables en Vercel: RESEND_API_KEY y EMAIL_REMITENTE (p. ej. «CB Turó de la Peira <eventos@cbturo.com>»).
export type Adjunto = { filename: string; content: string; content_id?: string };

export const emailConfigurado = () => !!process.env.RESEND_API_KEY;

export async function enviarEmail(d: { para: string | string[]; asunto: string; html: string; adjuntos?: Adjunto[]; responderA?: string }): Promise<{ ok?: boolean; error?: string }> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) return { error: "El email no está configurado (falta RESEND_API_KEY en Vercel)." };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_REMITENTE || "CB Turó de la Peira <eventos@cbturo.com>",
        to: Array.isArray(d.para) ? d.para : [d.para],
        subject: d.asunto,
        html: d.html,
        ...(d.responderA ? { reply_to: d.responderA } : {}),
        ...(d.adjuntos?.length ? { attachments: d.adjuntos } : {}),
      }),
    });
    if (!r.ok) return { error: `No se ha podido enviar el email (${r.status}): ${(await r.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { error: `No se ha podido enviar el email: ${(e as Error).message}` };
  }
}

/** Escapa texto para meterlo en el HTML del email */
export const esc = (s: string | null | undefined) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plantilla sencilla con los colores del club */
export function plantillaEmail(titulo: string, cuerpo: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f4f8;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1b2440">
<div style="max-width:560px;margin:0 auto;padding:16px">
<div style="background:#0d1b3e;color:#fff;border-radius:12px 12px 0 0;padding:16px 20px"><div style="font-size:12px;letter-spacing:.12em;color:#e7b53c;font-weight:700">CB TURÓ DE LA PEIRA</div><div style="font-size:20px;font-weight:700;margin-top:4px">${titulo}</div></div>
<div style="background:#fff;border-radius:0 0 12px 12px;padding:20px;line-height:1.5;font-size:15px">${cuerpo}</div>
<p style="text-align:center;font-size:11px;color:#8a90a6;margin-top:12px">C.B. Turó de la Peira · Barcelona</p>
</div></body></html>`;
}
