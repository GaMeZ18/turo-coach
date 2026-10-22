// Lectura de páginas de basquetcatala.cat:
//  - "Calendari Mensual Club" (partidos de todos los equipos, sin resultados)
//  - "Resultats" de una competición (/competicions/resultats/<id>/<jornada>), con marcadores
// Acepta el HTML (guardado con Ctrl+S o enviado con el botón «Enviar a Turó Coach») o el texto copiado.
// Se ejecuta en el navegador.

import { aISO } from "./fechas";

export interface PartidoFCBQ {
  clave: string;            // fcbqId si existe; si no, fecha+equipo+rival
  fcbqId: string | null;    // número de partido en la FCBQ (llistatpartits/N)
  dia: string;              // YYYY-MM-DD
  hora: string;             // HH:MM
  nuestro: string;          // "CB TURÓ U25"
  nuestroId: string | null; // número de equipo en la FCBQ
  rival: string;
  local: boolean;
  categoria: string;
  lugar: string;
  jornada: number | null;
  pf: number | null;        // nuestros puntos (solo si ya se ha jugado)
  pc: number | null;        // puntos del rival
  statsId: string | null;   // id de /estadistica/partit/<id>
}

const RE_FECHA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const RE_HORA = /^\d{1,2}:\d{2}$/;
const aDia = (f: string) => {
  const m = f.trim().match(RE_FECHA);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const limpio = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

type Base = Omit<PartidoFCBQ, "clave" | "jornada" | "pf" | "pc" | "statsId"> & Partial<Pick<PartidoFCBQ, "jornada" | "pf" | "pc" | "statsId">>;
function crear(p: Base): PartidoFCBQ {
  return {
    jornada: null, pf: null, pc: null, statsId: null, ...p,
    clave: p.fcbqId ?? p.statsId ?? `${p.dia}|${p.nuestro}|${p.rival}`.toUpperCase(),
  };
}

const esTuro = (s: string) => /TURO/.test(s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase());

/** Página de resultados de una competición: cada partido tiene dos enlaces .teamNameLink,
 *  el marcador en un div "col-md-4 col-xs-4" ("78-65", o "-" si no se ha jugado), la fecha
 *  "dd-mm-aaaa hh:mm" y, si hay estadísticas, un enlace /estadistica/partit/<id>. */
function desdeResultats(html: string): PartidoFCBQ[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const enlaces = Array.from(doc.querySelectorAll("a.teamNameLink"));

  // Contenedor de cada partido: el ancestro más pequeño que tiene exactamente dos equipos
  const contenedores: Element[] = [];
  for (const a of enlaces) {
    let el: Element | null = a.parentElement;
    while (el && el.querySelectorAll("a.teamNameLink").length < 2) el = el.parentElement;
    if (el && el.querySelectorAll("a.teamNameLink").length === 2 && !contenedores.includes(el)) contenedores.push(el);
  }
  const set = new Set(contenedores);

  // Recorremos el documento en orden para saber la jornada y la última fecha vista antes de cada partido
  const res: PartidoFCBQ[] = [];
  let jornada: number | null = null;
  let ultimaFecha: { dia: string; hora: string } | null = null;
  const RE_F = /(\d{2})[-/](\d{2})[-/](\d{4})(?:\s+(\d{1,2}:\d{2}))?/;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n: Node | null = walker.currentNode; n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n.textContent ?? "";
      const j = t.match(/Jornada(?:\s|&nbsp;|\u00a0)+(\d+)/i);
      if (j) jornada = Number(j[1]);
      const f = t.match(RE_F);
      if (f) ultimaFecha = { dia: `${f[3]}-${f[2]}-${f[1]}`, hora: f[4]?.padStart(5, "0") ?? "12:00" };
      continue;
    }
    const el = n as Element;
    if (!set.has(el)) continue;

    const [a1, a2] = Array.from(el.querySelectorAll("a.teamNameLink"));
    const local = limpio(a1.textContent), visitante = limpio(a2.textContent);
    const f = (el.textContent ?? "").match(RE_F);
    const fecha: { dia: string; hora: string } | null = f ? { dia: `${f[3]}-${f[2]}-${f[1]}`, hora: f[4]?.padStart(5, "0") ?? "12:00" } : ultimaFecha;
    if (f) ultimaFecha = fecha;
    const somosLocal = esTuro(local), somosVisit = esTuro(visitante);
    if (!fecha || somosLocal === somosVisit) continue; // partidos de otros equipos de la liga

    // Marcador
    let marcador: [number, number] | null = null;
    for (const d of Array.from(el.querySelectorAll("div, span, td, strong"))) {
      if (d.children.length > 1) continue;
      const m = limpio(d.textContent).match(/^(\d{1,3})\s*-\s*(\d{1,3})$/);
      if (m) { marcador = [Number(m[1]), Number(m[2])]; break; }
    }
    if (marcador && marcador[0] === 0 && marcador[1] === 0) marcador = null;

    const stats = Array.from(el.querySelectorAll("a")).map((x) => x.getAttribute("href") ?? "")
      .map((h) => h.match(/estadistica\/partit\/([0-9a-fA-F-]{20,})/)?.[1]).find(Boolean) ?? null;
    const idEquipo = (a: Element) => a.getAttribute("href")?.match(/equip\/(\d+)/)?.[1] ?? null;

    res.push(crear({
      fcbqId: null, statsId: stats,
      dia: fecha.dia, hora: fecha.hora,
      nuestro: somosLocal ? local : visitante,
      nuestroId: idEquipo(somosLocal ? a1 : a2),
      rival: somosLocal ? visitante : local,
      local: somosLocal,
      categoria: "", // la categoría buena viene del calendario del club
      lugar: "",
      jornada,
      pf: marcador ? (somosLocal ? marcador[0] : marcador[1]) : null,
      pc: marcador ? (somosLocal ? marcador[1] : marcador[0]) : null,
    }));
  }
  return res;
}

/** Desde el HTML guardado: tablas "Partits com a LOCAL" y "Partits com a VISITANT" */
function desdeHTML(html: string): PartidoFCBQ[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const res: PartidoFCBQ[] = [];
  const tablas = Array.from(doc.querySelectorAll("table")).filter((t) => /Equip\s+Local/i.test(t.querySelector("thead")?.textContent ?? ""));
  tablas.forEach((tabla, i) => {
    // ¿Es la tabla de local o la de visitante? Miramos el título que la precede
    let anterior: Element | null = tabla.previousElementSibling;
    let titulo = "";
    while (anterior && !titulo) { titulo = /VISITANT/i.test(anterior.textContent ?? "") ? "V" : /LOCAL/i.test(anterior.textContent ?? "") ? "L" : ""; anterior = anterior.previousElementSibling; }
    const somosLocal = titulo ? titulo === "L" : i === 0;
    for (const tr of Array.from(tabla.querySelectorAll("tbody tr"))) {
      const td = Array.from(tr.querySelectorAll("td"));
      if (td.length < 6) continue;
      const dia = aDia(td[0].textContent ?? "");
      if (!dia) continue;
      const hora = limpio(td[1].textContent).match(/\d{1,2}:\d{2}/)?.[0] ?? "12:00";
      const enlaceLocal = td[2].querySelector("a")?.getAttribute("href") ?? "";
      const enlaceVisit = td[3].querySelector("a")?.getAttribute("href") ?? "";
      const local = limpio(td[2].textContent), visitante = limpio(td[3].textContent);
      const lugar = Array.from(td[5].childNodes).map((n) => limpio(n.textContent)).filter(Boolean).join(", ");
      const partido = Array.from(tr.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "").find((h) => /llistatpartits\/\d+/.test(h));
      const idEquipo = (h: string) => h.match(/equip\/(\d+)/)?.[1] ?? null;
      res.push(crear({
        fcbqId: partido?.match(/llistatpartits\/(\d+)/)?.[1] ?? null,
        dia, hora,
        nuestro: somosLocal ? local : visitante,
        nuestroId: idEquipo(somosLocal ? enlaceLocal : enlaceVisit),
        rival: somosLocal ? visitante : local,
        local: somosLocal,
        categoria: limpio(td[4].textContent),
        lugar,
      }));
    }
  });
  return res;
}

/** Desde el texto copiado de la página (Ctrl+A, Ctrl+C).
 *  Al copiar, el navegador mezcla tabuladores y saltos de línea: lo tratamos todo como "una celda por línea". */
function desdeTexto(texto: string): PartidoFCBQ[] {
  const lineas = texto.replace(/\u00a0/g, " ").split(/[\t\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const res: PartidoFCBQ[] = [];
  let somosLocal = true;
  const corta = (l: string) => !!aDia(l) || /Partits com a|^Data$|Aquest web|^\[\+\]$/i.test(l);

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (/Partits com a/i.test(l)) { somosLocal = !/VISITANT/i.test(l + " " + (lineas[i + 1] ?? "")); continue; }
    const dia = aDia(l);
    if (!dia || !RE_HORA.test(lineas[i + 1] ?? "")) continue;
    const hora = lineas[i + 1];
    const campos: string[] = [];
    let j = i + 2;
    while (j < lineas.length && !corta(lineas[j]) && campos.length < 5) campos.push(lineas[j++]);
    i = j - 1;
    if (campos.length < 3) continue;
    const [local, visitante, categoria, ...resto] = campos;
    res.push(crear({
      fcbqId: null, dia, hora,
      nuestro: somosLocal ? local : visitante,
      nuestroId: null,
      rival: somosLocal ? visitante : local,
      local: somosLocal,
      categoria,
      lugar: resto.join(", "),
    }));
  }
  return res;
}

export function leerCalendarioFCBQ(entrada: string): PartidoFCBQ[] {
  const lista = /teamNameLink/.test(entrada) ? desdeResultats(entrada)
    : /<table[\s>]/i.test(entrada) ? desdeHTML(entrada) : desdeTexto(entrada);
  // Sin repetidos
  const vistos = new Set<string>();
  return lista.filter((p) => (vistos.has(p.clave) ? false : (vistos.add(p.clave), true)));
}

/** Propuesta de equipo de Turó Coach para un nombre FCBQ (p. ej. "CB TURÓ U18 A" → "U18 A") */
export function sugerirEquipo(nombreFCBQ: string, equipos: { id: string; nombre: string; fcbq_nombre: string | null }[]) {
  const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
  const exacto = equipos.find((e) => e.fcbq_nombre && n(e.fcbq_nombre) === n(nombreFCBQ));
  if (exacto) return exacto.id;
  const sufijo = n(nombreFCBQ).replace(/^(C\.?B\.?|CLUB DE BASQUET|CLUB BASQUET)\s*TURO( DE LA PEIRA)?\s*/, "");
  if (!sufijo) return null;
  const tokens = sufijo.split(" ");
  const candidato = equipos.find((e) => tokens.every((t) => n(e.nombre).split(" ").includes(t)));
  return candidato?.id ?? null;
}

/** Campos de la tabla "partidos" que aporta un partido de la FCBQ (solo los que trae la página) */
export function datosFCBQ(p: PartidoFCBQ) {
  const d: Record<string, string | number | boolean | null> = { fecha: aISO(p.dia, p.hora), rival: p.rival, local: p.local };
  if (p.lugar) d.lugar = p.lugar;
  if (p.categoria) d.competicion = p.categoria;
  if (p.jornada !== null) d.jornada = p.jornada;
  if (p.fcbqId) d.fcbq_id = p.fcbqId;
  if (p.pf !== null && p.pc !== null) { d.puntos_favor = p.pf; d.puntos_contra = p.pc; d.estado = "jugado"; }
  return d;
}

/** Lo que cambiaría en un partido existente (vacío = sin cambios) */
export function cambiosFCBQ(ya: Record<string, unknown>, p: PartidoFCBQ) {
  const d = datosFCBQ(p);
  const cambios: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    const actual = ya[k];
    const igual = k === "fecha" ? new Date(String(actual)).getTime() === new Date(String(v)).getTime() : (actual ?? null) === v;
    if (!igual) cambios[k] = v;
  }
  // Un partido sin hora en la página de resultados (12:00 por defecto) no pisa la hora buena del calendario
  if (cambios.fecha && p.hora === "12:00" && typeof ya.fecha === "string" &&
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(ya.fecha)) === p.dia) delete cambios.fecha;
  return cambios;
}

/** Busca el partido ya guardado: por número FCBQ; si no, mismo equipo y día (y rival si hay varios) */
export function buscarExistente<T extends { equipo_id: string; fecha: string; rival: string; fcbq_id: string | null }>(lista: T[], equipoId: string, p: PartidoFCBQ) {
  const n = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
  if (p.fcbqId) { const x = lista.find((e) => e.fcbq_id === p.fcbqId); if (x) return x; }
  const dia = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));
  const mismoDia = lista.filter((e) => e.equipo_id === equipoId && dia(e.fecha) === p.dia);
  return mismoDia.find((e) => n(e.rival) === n(p.rival)) ?? (mismoDia.length === 1 ? mismoDia[0] : undefined);
}
