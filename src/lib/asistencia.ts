// Respuestas de los jugadores desde el enlace de asistencia (voy / no voy y por qué)

export const MOTIVOS = {
  lesion: "Lesión o molestias",
  enfermo: "Enfermo",
  estudios: "Estudios o exámenes",
  viaje: "Viaje",
  otro: "Otro",
} as const;
export type MotivoTipo = keyof typeof MOTIVOS;
export const esMotivo = (x: unknown): x is MotivoTipo => typeof x === "string" && x in MOTIVOS;

export type Respuesta = { va: boolean; motivo_tipo: MotivoTipo | null; motivo: string | null };
export type NoDisponible = { hasta: string; motivo: string | null };

/** «No disponible hasta…»: motivos genéricos (sin datos médicos) */
export const MOTIVOS_NO_DISP = { lesion: "Lesión", viaje: "Viaje", otros: "Otros" } as const;

export const textoRespuesta = (r: Respuesta) =>
  r.va ? "Viene" : `No viene${r.motivo_tipo ? ` · ${MOTIVOS[r.motivo_tipo]}` : ""}${r.motivo ? `: ${r.motivo}` : ""}`;

/** Estado de asistencia que se propone al entrenador según lo que ha respondido el jugador */
export function propuesta(r: Respuesta | undefined, nd: NoDisponible | undefined): { estado: string; motivo: string | null } {
  if (nd) return { estado: nd.motivo === "lesion" ? "lesionado" : "justificado", motivo: `No disponible (${MOTIVOS_NO_DISP[nd.motivo as keyof typeof MOTIVOS_NO_DISP] ?? "otros"})` };
  if (!r) return { estado: "ausente", motivo: "Sin avisar" };
  if (r.va) return { estado: "presente", motivo: null };
  const motivo = `${r.motivo_tipo ? MOTIVOS[r.motivo_tipo] : "Avisó"}${r.motivo ? `: ${r.motivo}` : ""}`;
  return { estado: r.motivo_tipo === "lesion" ? "lesionado" : "justificado", motivo };
}

/** ¿El «no disponible» afecta a ese día? */
export const noDisponibleEn = (hasta: string | null | undefined, dia: string) => !!hasta && hasta >= dia;

/** «Marc Puig Soler» → «Marc P.» (en el enlace público no hace falta el apellido entero) */
export const nombrePublico = (nombre: string, apellidos: string | null) => {
  const a = (apellidos ?? "").trim();
  return a ? `${nombre.trim()} ${a[0].toUpperCase()}.` : nombre.trim();
};
