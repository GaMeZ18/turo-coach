// Eventos del club: inscripción de equipos, pago y pases QR (tipos y utilidades comunes)
import qrcode from "qrcode-generator";

export const URL_APP = "https://coach.cbturo.com";
export type Persona = { nombre: string; rol: "jugador" | "entrenador"; dorsal?: string | null; email?: string | null };
export type Evento = {
  id: string; nombre: string; slug: string; descripcion: string | null; fecha: string | null; fecha_fin: string | null; lugar: string | null;
  precio_jugador: number; precio_entrenador: number; min_jugadores: number; max_jugadores: number; max_equipos: number | null;
  fecha_limite: string | null; abierto: boolean; pago_transferencia: boolean; pago_tpv: boolean; iban: string | null; titular: string | null; torneo_id: string | null;
};
export const CAMPOS_EVENTO = "id, nombre, slug, descripcion, fecha, fecha_fin, lugar, precio_jugador, precio_entrenador, min_jugadores, max_jugadores, max_equipos, fecha_limite, abierto, pago_transferencia, pago_tpv, iban, titular, torneo_id";
export type Estado = "pendiente_pago" | "pendiente_validacion" | "aprobada" | "rechazada" | "cancelada";
export type Inscripcion = {
  id: string; evento_id: string; codigo: string; referencia: string; equipo: string; club: string | null; categoria: string | null;
  responsable: string; email: string; telefono: string | null; personas: Persona[]; importe: number; metodo: "transferencia" | "tpv" | null;
  estado: Estado; comprobante: string | null; motivo: string | null; notas: string | null; pagado_at: string | null; aprobada_at: string | null; created_at: string;
};
export const CAMPOS_INSCRIPCION = "id, evento_id, codigo, referencia, equipo, club, categoria, responsable, email, telefono, personas, importe, metodo, estado, comprobante, motivo, notas, pagado_at, aprobada_at, created_at";
export type Pase = { id: string; codigo: string; nombre: string; rol: string; dorsal: string | null; anulado: boolean; usado_at: string | null; inscripcion_id: string };

export const ESTADOS: Record<Estado, { t: string; c: string }> = {
  pendiente_pago: { t: "Pendiente de pago", c: "bg-amber-500/15 text-amber-700" },
  pendiente_validacion: { t: "Justificante por revisar", c: "bg-blue-500/15 text-blue-700" },
  aprobada: { t: "Aprobada", c: "bg-green-500/15 text-green-700" },
  rechazada: { t: "Rechazada", c: "bg-red-500/15 text-red-700" },
  cancelada: { t: "Cancelada", c: "bg-tinta/10 text-tinta/60" },
};

export const euros = (cent: number) => (cent / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: cent % 100 ? 2 : 0 });
export const importeDe = (ev: Pick<Evento, "precio_jugador" | "precio_entrenador">, personas: Persona[]) =>
  personas.reduce((s, p) => s + (p.rol === "entrenador" ? ev.precio_entrenador : ev.precio_jugador), 0);
export const urlPase = (codigo: string) => `${URL_APP}/pase/${codigo}`;
export const urlEstado = (codigo: string) => `${URL_APP}/inscripcion/estado/${codigo}`;
export const urlInscripcion = (slug: string) => `${URL_APP}/inscripcion/${slug}`;
/** IBAN en grupos de 4 */
export const ibanBonito = (iban: string | null) => (iban ?? "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

/** QR en SVG (para pantallas) */
export function qrSvg(texto: string, celda = 6) {
  const q = qrcode(0, "M"); q.addData(texto); q.make();
  return q.createSvgTag({ cellSize: celda, margin: 2, scalable: true });
}
/** QR en GIF base64 (para el email) */
export function qrGifBase64(texto: string, celda = 6) {
  const q = qrcode(0, "M"); q.addData(texto); q.make();
  return q.createDataURL(celda, 2).replace(/^data:image\/gif;base64,/, "");
}

/** ¿Se puede inscribir ahora? (abierto, antes del límite y con plazas) */
export function motivoCerrado(ev: Evento, ocupadas: number) {
  if (!ev.abierto) return "Las inscripciones no están abiertas.";
  if (ev.fecha_limite && new Date(ev.fecha_limite) < new Date()) return "El plazo de inscripción ha terminado.";
  if (ev.max_equipos && ocupadas >= ev.max_equipos) return "No quedan plazas: el evento está completo.";
  return null;
}
