// TEMPORAL: comprueba si el servidor puede leer basquetcatala.cat sin captcha
export const dynamic = "force-dynamic";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const URLS = [
  "https://www.basquetcatala.cat/partits/calendari_club_mensual/3373",
  "https://www.basquetcatala.cat/equip/93937",
  "https://www.basquetcatala.cat/competicions/resultats/23391/0",
];

export async function GET() {
  const out = [];
  for (const url of URLS) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "ca,es;q=0.9" }, cache: "no-store", redirect: "follow" });
      const t = await r.text();
      out.push({
        url, status: r.status, final: r.url, bytes: t.length,
        server: r.headers.get("server"), cf: r.headers.get("cf-ray"),
        captcha: /captcha|challenge|cf-chl|turnstile|recaptcha|hcaptcha/i.test(t),
        teamNameLink: (t.match(/teamNameLink/g) ?? []).length,
        llistatpartits: (t.match(/llistatpartits\/\d+/g) ?? []).length,
        resultats: [...new Set(t.match(/\/competicions\/[a-z_]+\/\d+(\/\d+)?/g) ?? [])].slice(0, 15),
        titulo: t.match(/<title>([^<]*)/i)?.[1]?.trim(),
        muestra: t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300),
      });
    } catch (e) {
      out.push({ url, error: String(e) });
    }
  }
  return Response.json(out);
}
