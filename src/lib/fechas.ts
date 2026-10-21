// El servidor (Vercel) corre en UTC: formateamos siempre en hora de Barcelona.
export const TZ = "Europe/Madrid";

/** Convierte "2026-10-21" + "18:30" (hora local de Barcelona) a ISO UTC. */
export function aISO(dia: string, hora: string) {
  const aprox = new Date(`${dia}T${hora}:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(aprox)
    .find((p) => p.type === "timeZoneName")?.value; // "GMT+02:00"
  const sufijo = offset && offset !== "GMT" ? offset.replace("GMT", "") : "+00:00";
  return new Date(`${dia}T${hora}:00${sufijo}`).toISOString();
}

export const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

export const hora = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** "YYYY-MM-DD" de hoy en Barcelona */
export const hoyLocal = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
