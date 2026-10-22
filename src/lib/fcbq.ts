// Lectura del "Calendari Mensual Club" de basquetcatala.cat.
// Acepta el HTML de la página guardada (Ctrl+S) o el texto copiado (Ctrl+A, Ctrl+C).
// Se ejecuta en el navegador.

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
}

const RE_FECHA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const RE_HORA = /^\d{1,2}:\d{2}$/;
const aDia = (f: string) => {
  const m = f.trim().match(RE_FECHA);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const limpio = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

function crear(p: Omit<PartidoFCBQ, "clave">): PartidoFCBQ {
  return { ...p, clave: p.fcbqId ?? `${p.dia}|${p.nuestro}|${p.rival}`.toUpperCase() };
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
  const html = /<table[\s>]/i.test(entrada);
  const lista = html ? desdeHTML(entrada) : desdeTexto(entrada);
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
