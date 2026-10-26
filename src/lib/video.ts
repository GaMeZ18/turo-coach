// Vídeo: utilidades para enlaces de YouTube y tiempos
export function youtubeId(url: string): string | null {
  const u = url.trim();
  if (/^[\w-]{11}$/.test(u)) return u;
  try {
    const x = new URL(u.startsWith("http") ? u : `https://${u}`);
    const host = x.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return x.pathname.slice(1, 12) || null;
    if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
      const v = x.searchParams.get("v");
      if (v) return v.slice(0, 11);
      const m = x.pathname.match(/\/(?:embed|live|shorts|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

export const mmss = (s: number) => {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), ss = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${m}:${String(ss).padStart(2, "0")}`;
};

export type Categoria = { id: string; equipo_id: string | null; nombre: string; color: string; antes: number; despues: number; orden: number };
export type Clip = { id: string; video_id: string; categoria_id: string | null; inicio: number; fin: number; jugador_id: string | null; resultado: "bien" | "mal" | null; periodo: number | null; nota: string | null };
