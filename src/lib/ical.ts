// Calendario en formato iCalendar (.ics) para suscribirse desde iPhone, Android (Google Calendar) u Outlook.
import { diaInput, horaInput } from "./fechas";

export type EventoICS = {
  uid: string;
  inicio: string;          // ISO
  minutos: number;         // duración
  titulo: string;
  lugar?: string | null;
  descripcion?: string | null;
  url?: string | null;
  cancelado?: boolean;
};

const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Corta las líneas a 75 bytes como pide el estándar (sin partir caracteres) */
function plegar(linea: string) {
  const enc = new TextEncoder();
  if (enc.encode(linea).length <= 75) return linea;
  const partes: string[] = [];
  let actual = "";
  for (const ch of linea) {
    const limite = partes.length ? 74 : 75;
    if (enc.encode(actual + ch).length > limite) { partes.push(actual); actual = ch; } else actual += ch;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

export function generarICS(nombre: string, eventos: EventoICS[]) {
  const ahora = utc(new Date());
  const l: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CB Turo de la Peira//Coach Manager//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(nombre)}`, "X-WR-TIMEZONE:Europe/Madrid",
    "REFRESH-INTERVAL;VALUE=DURATION:PT3H", "X-PUBLISHED-TTL:PT3H",
  ];
  for (const e of eventos) {
    const ini = new Date(e.inicio);
    const todoElDia = horaInput(e.inicio) === "00:00";
    l.push("BEGIN:VEVENT", `UID:${e.uid}@coach.cbturo.com`, `DTSTAMP:${ahora}`);
    if (todoElDia) {
      const d = diaInput(e.inicio).replace(/-/g, "");
      const sig = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8) + 1)).toISOString().slice(0, 10).replace(/-/g, "");
      l.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${sig}`);
    } else {
      l.push(`DTSTART:${utc(ini)}`, `DTEND:${utc(new Date(ini.getTime() + Math.max(15, e.minutos) * 60000))}`);
    }
    l.push(`SUMMARY:${esc(e.titulo)}`);
    if (e.lugar) l.push(`LOCATION:${esc(e.lugar)}`);
    if (e.descripcion) l.push(`DESCRIPTION:${esc(e.descripcion)}`);
    if (e.url) l.push(`URL:${e.url}`);
    if (e.cancelado) l.push("STATUS:CANCELLED");
    l.push("END:VEVENT");
  }
  l.push("END:VCALENDAR");
  return l.map(plegar).join("\r\n") + "\r\n";
}
