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

export type Estadistica = "t2" | "t3" | "tl" | "perdida" | "ro" | "rd" | "as" | "rob" | "tap" | "fc";
export type Categoria = { id: string; equipo_id: string | null; nombre: string; color: string; antes: number; despues: number; orden: number; tecla?: string | null; estadistica?: Estadistica | null };

export const NOMBRE_ESTADISTICA: Record<Estadistica, string> = {
  t2: "Tiro de 2", t3: "Tiro de 3", tl: "Tiro libre", perdida: "Pérdida", ro: "Rebote ofensivo", rd: "Rebote defensivo",
  as: "Asistencia", rob: "Robo", tap: "Tapón", fc: "Falta cometida",
};
/** Pregunta que sale al pulsar la etiqueta */
export const PREGUNTA_ESTADISTICA: Record<Estadistica, string> = {
  t2: "¿Quién tira?", t3: "¿Quién tira?", tl: "¿Quién tira?", perdida: "¿Quién la pierde?", ro: "¿Quién lo coge?", rd: "¿Quién lo coge?",
  as: "¿Quién da la asistencia?", rob: "¿Quién roba?", tap: "¿Quién pone el tapón?", fc: "¿Quién hace la falta?",
};
export const esTiro = (e: Estadistica | null | undefined) => e === "t2" || e === "t3" || e === "tl";
/** Acciones que restan (para el bien/mal del clip) */
export const esNegativa = (e: Estadistica | null | undefined) => e === "perdida" || e === "fc";

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

export type StatVideo = { t2m: number; t2a: number; t3m: number; t3a: number; tlm: number; tla: number; perdidas: number; pts: number; ro: number; rd: number; as: number; rob: number; tap: number; fc: number };
export const statVacia = (): StatVideo => ({ t2m: 0, t2a: 0, t3m: 0, t3a: 0, tlm: 0, tla: 0, perdidas: 0, pts: 0, ro: 0, rd: 0, as: 0, rob: 0, tap: 0, fc: 0 });

/** Suma la estadística de un clip (en los tiros, bien = anotada) */
export function sumarStat(st: StatVideo, estadistica: Estadistica | null | undefined, resultado: string | null) {
  const ok = resultado === "bien";
  switch (estadistica) {
    case "t2": st.t2a++; if (ok) { st.t2m++; st.pts += 2; } break;
    case "t3": st.t3a++; if (ok) { st.t3m++; st.pts += 3; } break;
    case "tl": st.tla++; if (ok) { st.tlm++; st.pts += 1; } break;
    case "perdida": st.perdidas++; break;
    case "ro": st.ro++; break;
    case "rd": st.rd++; break;
    case "as": st.as++; break;
    case "rob": st.rob++; break;
    case "tap": st.tap++; break;
    case "fc": st.fc++; break;
  }
  return st;
}
export const hayStat = (s: StatVideo) => s.t2a + s.t3a + s.tla + s.perdidas + s.ro + s.rd + s.as + s.rob + s.tap + s.fc > 0;
/** Valoración (como la de la FEB/ACB, sin faltas recibidas) */
export const valoracion = (s: StatVideo) =>
  s.pts + s.ro + s.rd + s.as + s.rob + s.tap - (s.t2a - s.t2m) - (s.t3a - s.t3m) - (s.tla - s.tlm) - s.perdidas - s.fc;
export const pctTiro = (m: number, a: number) => (a ? `${Math.round((m * 100) / a)}%` : "–");
export type Clip = { id: string; video_id: string; categoria_id: string | null; inicio: number; fin: number; jugador_id: string | null; resultado: "bien" | "mal" | null; periodo: number | null; nota: string | null; estado?: "pendiente" | null; confianza?: number | null };

// ---------- Pista: quinteto, cuartos y puntos del rival (minutos, +/- y quintetos) ----------
export type EventoVideo = { id: string; video_id: string; t: number; tipo: "quinteto" | "fin_periodo" | "rival"; periodo: number | null; jugadores: string[] | null; puntos: number | null };

/** Quinteto en pista en un segundo del vídeo (el último cambio anterior) */
export function enPista(eventos: EventoVideo[], t: number): string[] {
  let r: string[] = [];
  for (const e of eventos) { if (e.tipo !== "quinteto") continue; if (e.t <= t + 0.05) r = e.jugadores ?? []; else break; }
  return r;
}

/** Segundo del vídeo en el que se pulsó la etiqueta del clip */
export const momentoClip = (c: Clip, cat: Categoria | null) => c.fin - (cat?.despues ?? 0);

export type FilaPista = { seg: number; min: number; pf: number; pc: number };
export function analisisPista(eventosDesordenados: EventoVideo[], clips: Clip[], categorias: Categoria[], minutosPeriodo: number) {
  const eventos = [...eventosDesordenados].sort((a, b) => a.t - b.t);
  const quintetos = eventos.filter((e) => e.tipo === "quinteto");
  const cat = (id: string | null) => categorias.find((c) => c.id === id) ?? null;
  const jug = new Map<string, FilaPista>();
  const qui = new Map<string, { ids: string[]; seg: number; min: number; pf: number; pc: number }>();
  const fila = (id: string) => jug.get(id) ?? (jug.set(id, { seg: 0, min: 0, pf: 0, pc: 0 }), jug.get(id)!);
  const claveQ = (ids: string[]) => [...ids].sort().join(",");
  const filaQ = (ids: string[]) => { const k = claveQ(ids); return qui.get(k) ?? (qui.set(k, { ids: [...ids], seg: 0, min: 0, pf: 0, pc: 0 }), qui.get(k)!); };

  // Minutos: tiempo en pista dentro de cada cuarto, en proporción a la duración del cuarto
  const periodos = [...new Set(quintetos.map((q) => q.periodo ?? 1))].sort((a, b) => a - b);
  const momentos = (p: number) => [
    ...clips.filter((c) => c.periodo === p).map((c) => momentoClip(c, cat(c.categoria_id))),
    ...eventos.filter((e) => e.periodo === p).map((e) => e.t),
  ];
  for (const [i, p] of periodos.entries()) {
    const ini = Math.min(...quintetos.filter((q) => (q.periodo ?? 1) === p).map((q) => q.t));
    const finEv = eventos.find((e) => e.tipo === "fin_periodo" && (e.periodo ?? 1) === p && e.t > ini);
    const sig = periodos[i + 1] !== undefined ? Math.min(...quintetos.filter((q) => (q.periodo ?? 1) === periodos[i + 1]).map((q) => q.t)) : null;
    const fin = finEv?.t ?? sig ?? Math.max(ini, ...momentos(p));
    const total = fin - ini;
    if (total <= 0) continue;
    const cortes = [ini, ...quintetos.filter((q) => q.t > ini && q.t < fin).map((q) => q.t), fin];
    for (let k = 0; k + 1 < cortes.length; k++) {
      const [a, b] = [cortes[k], cortes[k + 1]];
      const ids = enPista(eventos, a);
      if (!ids.length) continue;
      const minutos = ((b - a) / total) * minutosPeriodo;
      for (const id of ids) { const f = fila(id); f.seg += b - a; f.min += minutos; }
      const q = filaQ(ids); q.seg += b - a; q.min += minutos;
    }
  }

  // +/-: nuestras canastas (clips de tiro anotado) y los puntos del rival
  let nos = 0, rival = 0;
  const puntos: { t: number; pf: number; pc: number }[] = [];
  for (const c of clips) {
    const k = cat(c.categoria_id);
    if (c.resultado !== "bien" || !k?.estadistica) continue;
    const p = k.estadistica === "t2" ? 2 : k.estadistica === "t3" ? 3 : k.estadistica === "tl" ? 1 : 0;
    if (p) { puntos.push({ t: momentoClip(c, k), pf: p, pc: 0 }); nos += p; }
  }
  for (const e of eventos) if (e.tipo === "rival" && e.puntos) { puntos.push({ t: e.t, pf: 0, pc: e.puntos }); rival += e.puntos; }
  for (const x of puntos) {
    const ids = enPista(eventos, x.t);
    if (!ids.length) continue;
    for (const id of ids) { const f = fila(id); f.pf += x.pf; f.pc += x.pc; }
    const q = filaQ(ids); q.pf += x.pf; q.pc += x.pc;
  }
  return {
    hay: quintetos.length > 0,
    jugadores: jug,
    quintetos: [...qui.values()].filter((q) => q.ids.length).sort((a, b) => b.min - a.min),
    marcador: { nos, rival },
  };
}
