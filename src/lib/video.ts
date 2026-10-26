/** Convierte un enlace de YouTube o Vimeo en URL de inserción (o null si no se reconoce). */
export function urlEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

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

export type Estadistica = "t2" | "t3" | "tl" | "perdida";
export type Categoria = { id: string; equipo_id: string | null; nombre: string; color: string; antes: number; despues: number; orden: number; tecla?: string | null; estadistica?: Estadistica | null };

export const NOMBRE_ESTADISTICA: Record<Estadistica, string> = { t2: "Tiro de 2", t3: "Tiro de 3", tl: "Tiro libre", perdida: "Pérdida" };
export const esTiro = (e: Estadistica | null | undefined) => e === "t2" || e === "t3" || e === "tl";

/** Tecla de cada etiqueta: la que tenga puesta o, si no, el primer número libre (1-9, 0) */
export function teclasDe(categorias: Categoria[]) {
  const usadas = new Set(categorias.map((c) => c.tecla?.toUpperCase()).filter(Boolean) as string[]);
  const libres = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].filter((d) => !usadas.has(d));
  const mapa = new Map<string, Categoria>();
  for (const c of categorias) {
    const k = c.tecla ? c.tecla.toUpperCase() : libres.shift();
    if (k && !mapa.has(k)) mapa.set(k, c);
  }
  return mapa;
}

export type StatVideo = { t2m: number; t2a: number; t3m: number; t3a: number; tlm: number; tla: number; perdidas: number; pts: number };
export const statVacia = (): StatVideo => ({ t2m: 0, t2a: 0, t3m: 0, t3a: 0, tlm: 0, tla: 0, perdidas: 0, pts: 0 });

/** Suma la estadística de unos clips (bien = anotada) */
export function sumarStat(st: StatVideo, estadistica: Estadistica | null | undefined, resultado: string | null) {
  const ok = resultado === "bien";
  if (estadistica === "t2") { st.t2a++; if (ok) { st.t2m++; st.pts += 2; } }
  else if (estadistica === "t3") { st.t3a++; if (ok) { st.t3m++; st.pts += 3; } }
  else if (estadistica === "tl") { st.tla++; if (ok) { st.tlm++; st.pts += 1; } }
  else if (estadistica === "perdida") st.perdidas++;
  return st;
}
export const pctTiro = (m: number, a: number) => (a ? `${Math.round((m * 100) / a)}%` : "–");
export type Clip = { id: string; video_id: string; categoria_id: string | null; inicio: number; fin: number; jugador_id: string | null; resultado: "bien" | "mal" | null; periodo: number | null; nota: string | null };
