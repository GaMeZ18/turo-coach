"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { bienvenidaVista } from "@/app/(app)/inicio-acciones";

const PASOS = [
  { emoji: "👋", titulo: "Bienvenido a Coach Manager", texto: "La app de los entrenadores del CB Turó. Arriba eliges el equipo con el que trabajas: todo lo que ves (entrenos, jugadores, partidos) es de ese equipo." },
  { emoji: "📋", titulo: "Entrenamientos", texto: "Monta la sesión con ejercicios de la biblioteca, usa «Empezar entreno» para el cronómetro en pista y pasa lista. Con el «Enlace de asistencia» los jugadores te dicen por WhatsApp si vienen." },
  { emoji: "✏️", titulo: "Ejercicios, pizarra y playbook", texto: "Más de mil ejercicios del club, una pizarra para dibujar y animar jugadas, y el playbook del equipo para compartir con los jugadores en PDF, vídeo o enlace." },
  { emoji: "🏀", titulo: "Partidos", texto: "Convocatoria con imagen para el grupo, previa con el scouting del rival y, al acabar, el informe automático con las estadísticas de la Federació." },
  { emoji: "🔔", titulo: "Avisos", texto: "Activa las notificaciones para que te recuerde pasar lista, montar el entreno o el partido de mañana. Y no te pierdas el Fantasy Turó 🏆." },
];

/** Guía de 5 pantallas la primera vez que entra un entrenador */
export default function Bienvenida({ abrir }: { abrir: boolean }) {
  const [abierto, setAbierto] = useState(abrir);
  const [i, setI] = useState(0);
  if (!abierto) return null;
  const cerrar = () => { setAbierto(false); void bienvenidaVista(); };
  const p = PASOS[i];
  const ultimo = i === PASOS.length - 1;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={cerrar}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-azul px-6 pb-6 pt-8 text-center text-white">
          <button type="button" onClick={cerrar} className="absolute right-3 top-3 rounded-full p-1.5 text-white/70 hover:bg-white/10" aria-label="Cerrar"><X size={20} /></button>
          <div className="text-6xl">{p.emoji}</div>
          <h2 className="mt-3 font-[family-name:var(--font-titulo)] text-2xl font-bold uppercase !text-white">{p.titulo}</h2>
        </div>
        <div className="filete" />
        <p className="min-h-28 px-6 py-5 text-sm leading-relaxed text-tinta/80">{p.texto}</p>
        <div className="flex items-center justify-between gap-2 px-6 pb-6">
          <button type="button" onClick={() => setI(i - 1)} disabled={i === 0} className="btn-secundario !px-2.5 disabled:invisible" aria-label="Anterior"><ChevronLeft size={18} /></button>
          <div className="flex gap-1.5">{PASOS.map((_, k) => <span key={k} className={`h-2 rounded-full transition-all ${k === i ? "w-5 bg-rojo" : "w-2 bg-linea"}`} />)}</div>
          {ultimo
            ? <button type="button" onClick={cerrar} className="btn-primario">¡Empezar!</button>
            : <button type="button" onClick={() => setI(i + 1)} className="btn-primario !px-2.5" aria-label="Siguiente"><ChevronRight size={18} /></button>}
        </div>
      </div>
    </div>
  );
}
