// Coach Manager CBTuró · Actualizar desde la FCBQ con el móvil (iPhone / Android, sin extensión)
// Se lanza con un marcador estando en www.basquetcatala.cat. Lee la FCBQ desde el propio navegador
// (como la extensión), y luego abre Coach Manager, que guarda los datos.
// ARCHIVO GENERADO: se edita herramientas/fcbq-movil/plantilla.js y se ejecuta generar.mjs
(() => {
  const APP = "https://coach.cbturo.com";
  const FCBQ = "https://www.basquetcatala.cat";
  const CLUB = "3373";
  if (location.origin !== FCBQ) {
    alert("Primero abre basquetcatala.cat (te la abro ahora) y, cuando se vea la web, vuelve a pulsar el marcador.");
    location.href = `${FCBQ}/partits/calendari_club_mensual/${CLUB}`;
    return;
  }
  if (window.__turoMovil) { window.__turoMovil.mostrar(); return; }

  function datosJugada(e) {
  const out = {};
  const meter = (pref, o) => {
    for (const [k, v] of Object.entries(o || {})) {
      if (Object.keys(out).length > 30) return;
      if (v === null || v === undefined) continue;
      if (typeof v === "object" && !Array.isArray(v) && !pref) meter(k + ".", v);
      else if (["string", "number", "boolean"].includes(typeof v) && String(v).length < 60) out[pref + k] = v;
    }
  };
  meter("", e);
  return out;
}

async function apiStats(ids, plantillaPbp, idBase, cabWeb) {
  const res = {};
  const txt = await fetch("/jwt.php", { credentials: "include", cache: "no-store" }).then((r) => r.text()).catch(() => "");
  const token = (txt.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/) || [])[0];
  if (!token && !cabWeb) return { error: "sin token" };
  // Mismas cabeceras que usa la propia web (su credencial); si no las tenemos, las nuestras
  const cab = cabWeb && Object.keys(cabWeb).length ? { Accept: "application/json, text/plain, */*", ...cabWeb }
    : { Authorization: `Bearer ${token}`, federation: "fcbq", Accept: "application/json, text/plain, */*" };
  for (const id of ids) {
    try {
      const r = await fetch(`https://msstats.optimalwayconsulting.com/v1/fcbq/matches/${id}/stats?currentSeason=true`, {
        headers: cab,
      });
      if (!r.ok) { res[id] = { error: r.status }; continue; }
      const j = await r.json();
      // La jugada a jugada suele venir ya dentro de las estadísticas («playByPlay»), a veces separada por
      // cuartos: se aplana a una lista de jugadas, con el número de cuarto si viene del contenedor
      const aplanar = (x, periodo, out = []) => {
        if (Array.isArray(x)) {
          x.forEach((it, i) => {
            if (it && typeof it === "object" && !Array.isArray(it)) {
              const hijos = Object.entries(it).filter(([, v]) => Array.isArray(v) && v.some((o) => o && typeof o === "object"));
              const pareceJugada = Object.keys(it).some((k) => /score|minute|second|time|type|code|actor|player/i.test(k));
              if (hijos.length && !pareceJugada) {
                const p = it.period ?? it.periodNumber ?? it.quarter ?? it.number ?? i + 1;
                for (const [, v] of hijos) aplanar(v, p, out);
              } else out.push(periodo !== undefined && it.period === undefined && it.p === undefined ? { ...it, period: periodo } : it);
            }
          });
        } else if (x && typeof x === "object") {
          for (const [k, v] of Object.entries(x)) if (Array.isArray(v)) aplanar(v, /^\d+$/.test(k) ? Number(k) : periodo, out);
        }
        return out;
      };
      const pbpIncluida = aplanar(j.playByPlay);
      // (se deja también la original: la app sabe leerla si los nombres de los campos no son los esperados)
      // Jugada a jugada (marcador en cada momento): para quintetos, parejas, on/off y el vídeo
      try {
        // Primero la que viene con las estadísticas; si no, /pbp o /moves (a veces viene vacía)
        let q = pbpIncluida.length ? { ok: true, status: "incluida" } : null, pj = pbpIncluida.length ? pbpIncluida : null, ev = pbpIncluida;
        const rutas = [
          ...(plantillaPbp && idBase ? [plantillaPbp.split(idBase).join(id)] : []), // la que usa la propia web
          ...["pbp?currentSeason=true", "moves?currentSeason=true", "pbp"].map((r) => `https://msstats.optimalwayconsulting.com/v1/fcbq/matches/${id}/${r}`),
        ];
        for (const url of ev.length ? [] : rutas.flatMap((u) => [[u, "include"], [u, "omit"]])) {
          q = await fetch(url[0], { headers: cab, credentials: url[1], mode: "cors" }).catch(() => null);
          if (!q || !q.ok) continue;
          pj = await q.json().catch(() => null);
          ev = aplanar(!pj ? [] : Array.isArray(pj) ? pj : pj.playByPlay ?? pj.events ?? pj.data ?? pj.moves ?? pj);
          if (ev.length) break;
        }
        if (q && q.ok && pj) {
          const num = (...xs) => { for (const x of xs) { if (x !== undefined && x !== null && x !== "" && !isNaN(Number(x))) return Number(x); } return undefined; };
          // Nombres de la FCBQ: eventTypeCode, period, minute, second, localScore, visitorScore (con alternativas)
          j.pbp = ev.map((e) => {
            const reloj = typeof (e.time ?? e.clock) === "string" ? String(e.time ?? e.clock).split(":") : null;
            return {
              c: e.c ?? e.eventTypeCode ?? e.type ?? e.code,
              p: num(e.p, e.period, e.periodNumber, e.quarter, e.per),
              m: num(e.m, e.minute, e.min, reloj?.[0]),
              s: num(e.s, e.second, e.sec, reloj?.[1]),
              l: num(e.l, e.localScore, e.scoreLocal, e.homeScore, e.score?.local),
              v: num(e.v, e.visitorScore, e.scoreVisitor, e.awayScore, e.score?.visitor),
              // Quién hace la jugada (para el vídeo): dorsal, nombre y equipo, con los nombres que use la FCBQ
              x: datosJugada(e),
            };
          });
          // Muestra para diagnosticar si la FCBQ cambia el formato
          if (!res.__muestra || (!res.__muestra.eventos && ev.length)) res.__muestra = {
            estado: q.status, claves: Object.keys(Array.isArray(pj) ? {} : pj), eventos: ev.length,
            primeros: ev.filter((e) => e.localScore !== undefined || e.visitorScore !== undefined).slice(0, 4),
            crudo: JSON.stringify(pj).slice(0, 200),
            tiros: Array.isArray(j.shotChart) ? { n: j.shotChart.length, primeros: j.shotChart.slice(0, 3) } : j.shotChart ? { claves: Object.keys(j.shotChart), muestra: JSON.stringify(j.shotChart).slice(0, 600) } : null,
            jugador: (j.boxscore?.[0]?.local?.players || [])[0] ? Object.keys(j.boxscore[0].local.players[0]) : null,
          };
          if (ev.length) res.__muestraOk = res.__muestraOk ?? { eventos: ev.length, primeros: ev.slice(0, 4) };
        } else if (!res.__muestra) {
          res.__muestra = { estado: q?.status ?? "sin respuesta" };
        }
      } catch {}
      res[id] = j;
    } catch (e) { res[id] = { error: String(e?.message || e) }; }
    await new Promise((r) => setTimeout(r, 120));
  }
  return res;
}

async function recolectar(club, base) {
  const paginas = [], avisos = [], vistas = new Set();
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
  const limpiar = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<!--(?!\s*saved)[\s\S]*?-->/gi, "");
  const leer = async (url) => {
    const abs = new URL(url, base).href.replace(/#.*$/, "");
    if (vistas.has(abs)) return null;
    vistas.add(abs);
    await pausa(250);
    const r = await fetch(abs, { credentials: "include" });
    if (/security-check/.test(r.url)) throw new Error("La FCBQ ha vuelto a pedir la verificación de seguridad. Vuelve a pulsar Actualizar.");
    if (!r.ok) { avisos.push(`${abs}: ${r.status}`); return null; }
    const html = limpiar(await r.text());
    paginas.push({ url: abs, html });
    return html;
  };
  const enlaces = (html, re) => [...new Set([...html.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]).filter((h) => re.test(h)))];

  try {
    // 1) Calendario mensual del club: de septiembre a junio
    const equipos = new Set();
    for (const mes of ["09", "10", "11", "12", "01", "02", "03", "04", "05", "06"]) {
      const h = await leer(`/partits/calendari_club_mensual/${club}/${mes}`);
      // Solo los equipos del club (los rivales también tienen enlace)
      if (h) for (const m of h.matchAll(/<a[^>]*href="[^"]*\/equip\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g)) if (/TUR[OÓ]/i.test(m[2])) equipos.add(m[1]);
    }

    // 2) Página de cada equipo → sus competiciones
    const competiciones = new Set();
    for (const id of equipos) {
      const h = await leer(`/equip/${id}`);
      if (h) for (const e of enlaces(h, /\/competicions\/|classifica/i)) competiciones.add(e);
    }

    // 3) Resultados de cada grupo. "/resultats/<grupo>/0" es el resumen (última jornada y clasificación);
    //    el desplegable trae "Jornada N (dd-mm-aaaa)" y cada jornada está en "/resultats/<grupo>/N".
    const ids = new Set();
    for (const e of competiciones) { const m = e.match(/\/competicions\/resultats\/(\d+)/); if (m) ids.add(m[1]); }
    const clasif = new Set([...competiciones].filter((e) => /classifica/i.test(e)));
    const hoy = new Date();
    for (const id of ids) {
      const h = await leer(`/competicions/resultats/${id}/0`);
      if (!h) continue;
      for (const e of enlaces(h, /classifica/i)) clasif.add(e);
      const jornadas = [...h.matchAll(/Jornada\s+(\d+)\s*\((\d{2})-(\d{2})-(\d{4})\)/g)]
        .map((m) => ({ n: Number(m[1]), fecha: new Date(`${m[4]}-${m[3]}-${m[2]}T00:00:00`) }));
      const vistas = new Set();
      let siguiente = false;
      for (const j of jornadas.sort((x, y) => x.n - y.n)) {
        if (vistas.has(j.n)) continue;
        vistas.add(j.n);
        // Las ya jugadas y la próxima (para tener su horario)
        if (j.fecha > hoy) { if (siguiente) continue; siguiente = true; }
        await leer(`/competicions/resultats/${id}/${j.n}`);
      }
      if (!jornadas.length) {
        // Sin desplegable: probamos los enlaces de jornada que tenga
        for (const e of enlaces(h, new RegExp(`/competicions/resultats/${id}/\\d+`)).slice(0, 40)) await leer(e);
      }
    }
    // 4) Clasificaciones
    for (const e of [...clasif].slice(0, 40)) await leer(e);
    if (!ids.size) avisos.push("No he encontrado páginas de resultados en las páginas de los equipos.");
    return { paginas, avisos };
  } catch (e) {
    return paginas.length ? { paginas, avisos: [...avisos, e.message] } : { error: e.message };
  }
}

  // ---------- Pantalla ----------
  const caja = document.createElement("div");
  caja.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(13,27,62,.96);color:#fff;font:16px/1.45 -apple-system,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;gap:14px";
  caja.innerHTML = `<div style="font-size:13px;letter-spacing:.08em;color:#e7b53c;font-weight:700">COACH MANAGER CBTURÓ</div>
    <div id="turo-t" style="font-size:20px;font-weight:600;max-width:420px">Leyendo la FCBQ…</div>
    <div id="turo-s" style="font-size:14px;opacity:.75;max-width:420px"></div>
    <button id="turo-b" style="display:none;background:#e7b53c;color:#0d1b3e;border:0;border-radius:12px;padding:14px 22px;font-size:17px;font-weight:700">Guardar en Coach Manager</button>
    <button id="turo-x" style="background:none;border:0;color:#fff;opacity:.6;font-size:14px;text-decoration:underline">Cerrar</button>`;
  document.body.appendChild(caja);
  const $ = (id) => caja.querySelector("#" + id);
  const poner = (t, s = "") => { $("turo-t").textContent = t; $("turo-s").textContent = s; };
  $("turo-x").onclick = () => { caja.style.display = "none"; };
  window.__turoMovil = { mostrar: () => { caja.style.display = "flex"; } };

  let datos = null;
  const stats = {};

  /** Estadísticas de una lista de partidos (con el token de la web), de 20 en 20 */
  async function bajar(ids, aviso) {
    for (let i = 0; i < ids.length; i += 20) {
      aviso?.(Math.min(i + 20, ids.length), ids.length);
      const r = await apiStats(ids.slice(i, i + 20), null, null, null).catch(() => ({}));
      if (r.error) break;
      delete r.__muestra; delete r.__muestraOk;
      for (const [id, j] of Object.entries(r)) if (j && !j.error) stats[id] = j;
    }
  }

  // ---------- Conversación con Coach Manager (la pestaña que abrimos) ----------
  // Habla igual que la extensión: ping/pong, pedir → datos, pedir-stats → stats
  window.addEventListener("message", async (e) => {
    if (e.origin !== APP || !e.data || typeof e.data.tipo !== "string") return;
    const responder = (m) => { try { e.source.postMessage({ ...m, tipo: "turo-fcbq-" + m.tipo }, APP); } catch {} };
    const t = e.data.tipo;
    if (t === "turo-fcbq-ping") responder({ tipo: "pong", version: "móvil" });
    else if (t === "turo-fcbq-pedir") {
      if (datos) responder({ tipo: "datos", paginas: datos.paginas, avisos: datos.avisos });
      else responder({ tipo: "error", texto: "Aún no se han leído los datos de la FCBQ: vuelve a la pestaña de basquetcatala.cat." });
    } else if (t === "turo-fcbq-pedir-stats") {
      const ids = (e.data.ids || []).map(String).slice(0, 200);
      const faltan = ids.filter((id) => !stats[id]);
      if (faltan.length) {
        responder({ tipo: "progreso", texto: `Estadísticas: descargando ${faltan.length} partidos…` });
        await bajar(faltan);
      }
      const res = {};
      for (const id of ids) if (stats[id]) res[id] = stats[id];
      responder({ tipo: "stats", stats: res, pendientes: (e.data.ids || []).length - ids.length });
    } else if (t === "turo-fcbq-terminado") {
      caja.style.display = "flex";
      $("turo-b").style.display = "none";
      poner(e.data.ok ? "✅ Coach Manager actualizado" : "⚠️ No se ha podido guardar todo", e.data.ok ? "Resultados, estadísticas y puntos del Fantasy al día. Ya puedes cerrar esta pestaña." : "Mira el detalle en la pestaña de Coach Manager y vuelve a probar.");
    }
  });

  $("turo-b").onclick = () => {
    // Misma pestaña cada vez (si hay que iniciar sesión, al volver a pulsar se reutiliza)
    window.open(`${APP}/partidos/importar?auto=1&movil=1`, "turo-coach-fcbq");
    poner("Guardando en Coach Manager…", "Se ha abierto Coach Manager en otra pestaña. Si te pide iniciar sesión, entra y vuelve aquí a pulsar el botón otra vez.");
  };

  // ---------- Lectura ----------
  (async () => {
    if (/verificaci|seguretat|security/i.test(document.title) || /security-check/.test(location.href)) {
      poner("La FCBQ pide la verificación de seguridad", "Ciérrame, resuélvela y, cuando se vea la web normal, vuelve a pulsar el marcador.");
      window.__turoMovil = null;
      return;
    }
    poner("Leyendo la FCBQ…", "Calendario, resultados y clasificaciones. Tarda un minuto: no cambies de pestaña.");
    const r = await recolectar(CLUB, FCBQ).catch((e) => ({ error: e.message }));
    if (!r || r.error || !r.paginas?.length) {
      poner("No se ha podido leer la FCBQ", (r && r.error) || "Vuelve a pulsar el marcador.");
      window.__turoMovil = null;
      return;
    }
    datos = r;
    // Estadísticas que le faltan a Coach Manager (se bajan ya, con esta pestaña delante)
    const ids = [...new Set(r.paginas.filter((p) => /resultats/.test(p.url)).flatMap((p) => [...p.html.matchAll(/estadistica\/partit\/([0-9a-fA-F-]{20,})/g)].map((m) => m[1])))];
    let faltan = [];
    try {
      const j = await fetch(`${APP}/api/fcbq/stats-faltan`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ ids }) }).then((x) => x.json());
      faltan = Array.isArray(j.ids) ? j.ids.slice(0, 200) : [];
    } catch {}
    if (faltan.length) await bajar(faltan, (n, total) => poner("Descargando estadísticas…", `${n} de ${total} partidos`));
    poner("✅ FCBQ leída", `${r.paginas.length} páginas${faltan.length ? ` y ${Object.keys(stats).length} estadísticas` : ""}. Pulsa para guardarlo en Coach Manager.`);
    $("turo-b").style.display = "block";
  })();
})();
