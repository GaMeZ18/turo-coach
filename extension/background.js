// Abre basquetcatala.cat en una pestaña (si sale la verificación de seguridad, la resuelve el usuario)
// y lee lo que pide Coach Manager CBTuró:
//  - { club }   → calendario del club, páginas de cada equipo, resultados y clasificaciones
//  - { stats }  → estadísticas (box score) de una lista de partidos
// Todo ocurre en el navegador del usuario, como si navegara él.

const FCBQ = "https://www.basquetcatala.cat";
const APP_POR_DEFECTO = "https://coach.cbturo.com";
const app = async () => (await chrome.storage.local.get("app")).app || APP_POR_DEFECTO;

// ---------- Actualización automática: cada lunes a las 6:00 ----------
// El ordenador tiene que estar encendido con el navegador abierto (y la sesión de Coach Manager CBTuró iniciada).
// Si a esa hora estaba apagado, se hace en cuanto se abra el navegador.
function proximoLunes6() {
  const d = new Date();
  d.setHours(6, 0, 0, 0);
  const faltan = (1 - d.getDay() + 7) % 7; // 1 = lunes
  d.setDate(d.getDate() + faltan);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 7);
  return d.getTime();
}
/** Campos sueltos de una jugada (texto y números, un nivel de profundidad) para saber quién la hace */
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

async function programar() {
  await chrome.alarms.clear("fcbq-semanal");
  chrome.alarms.create("fcbq-semanal", { when: proximoLunes6() });
}
async function lanzarAuto() {
  await chrome.storage.local.set({ ultimaAuto: Date.now() });
  const tab = await chrome.tabs.create({ url: `${await app()}/partidos/importar?auto=1`, active: false });
  await chrome.storage.local.set({ pestanaAuto: tab.id });
}
async function revisarPendiente() {
  const { ultimaAuto = 0 } = await chrome.storage.local.get("ultimaAuto");
  // Último lunes a las 6:00
  const ultimoLunes = proximoLunes6() - 7 * 864e5;
  if (ultimaAuto < ultimoLunes && Date.now() > ultimoLunes) await lanzarAuto();
}
chrome.runtime.onInstalled.addListener(() => { programar(); chrome.storage.local.set({ ultimaAuto: Date.now() }); });
chrome.runtime.onStartup.addListener(() => { programar(); revisarPendiente(); });
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "fcbq-semanal") return;
  await programar();
  await lanzarAuto();
});
// La página avisa cuando ha terminado: cerramos la pestaña que abrimos nosotros
chrome.runtime.onMessage.addListener(async (m, sender) => {
  if (m?.tipo === "origen" && typeof m.url === "string" && /^https:\/\//.test(m.url)) { await chrome.storage.local.set({ app: m.url }); return; }
  if (m?.tipo !== "terminado" || !sender.tab?.id) return;
  const { pestanaAuto } = await chrome.storage.local.get("pestanaAuto");
  if (pestanaAuto === sender.tab.id) {
    await chrome.storage.local.remove("pestanaAuto");
    if (m.ok) chrome.tabs.remove(sender.tab.id).catch(() => {});
  }
});
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Abre (o reutiliza) la pestaña y espera a que muestre la web de verdad y deje de recargarse */
async function abrirYEsperar(tabId, url, avisar, opciones = {}) {
  let tab;
  if (tabId) tab = await chrome.tabs.update(tabId, { url });
  else tab = await chrome.tabs.create({ url, active: true, ...opciones });
  let avisado = false, estable = 0, ultima = "";
  for (let i = 0; estable < 2; i++) {
    if (i > 240) throw new Error("La página de la FCBQ no ha terminado de cargar. Vuelve a probar.");
    await esperar(800);
    const t = await chrome.tabs.get(tab.id).catch(() => null);
    if (!t) throw new Error("Se ha cerrado la pestaña de la FCBQ.");
    const actual = t.url || t.pendingUrl || "";
    let verificando = /security-check/.test(actual);
    if (!verificando && t.status === "complete") {
      const titulo = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.title }).then((r) => r[0]?.result ?? "").catch(() => null);
      if (titulo === null) { estable = 0; continue; }
      verificando = /verificaci|seguretat|security/i.test(titulo);
    }
    if (verificando) {
      estable = 0;
      if (!avisado) { avisar("La FCBQ pide una verificación de seguridad: resuélvela en su pestaña."); avisado = true; }
      await chrome.tabs.update(tab.id, { active: true }).catch(() => {});
      continue;
    }
    estable = t.status === "complete" && actual === ultima ? estable + 1 : 0;
    ultima = actual;
  }
  return tab;
}

chrome.runtime.onConnect.addListener((puerto) => {
  if (puerto.name !== "fcbq") return;
  puerto.onMessage.addListener(async (pedido) => {
    const avisar = (texto) => { try { puerto.postMessage({ tipo: "progreso", texto }); } catch {} };
    const pestanaApp = puerto.sender?.tab;
    const junto = pestanaApp ? { windowId: pestanaApp.windowId, index: pestanaApp.index + 1 } : {};
    let tab;
    try {
      if (Array.isArray(pedido.stats)) {
        // ---------- Estadísticas de partidos ----------
        const ids = pedido.stats.slice(0, 200);
        if (!ids.length) { puerto.postMessage({ tipo: "stats", stats: {} }); return; }
        avisar(`Estadísticas: abriendo el primer partido…`);
        tab = await abrirYEsperar(null, `${FCBQ}/estadistica/partit/${ids[0]}`, avisar, junto);
        const stats = await bajarEstadisticas(tab.id, ids, avisar);
        puerto.postMessage({ tipo: "stats", stats, pendientes: pedido.stats.length - ids.length });
      } else {
        // ---------- Calendario, resultados y clasificaciones ----------
        const club = String(pedido.club || "3373");
        avisar("Abriendo basquetcatala.cat…");
        tab = await abrirYEsperar(null, `${FCBQ}/partits/calendari_club_mensual/${club}`, avisar, junto);
        avisar("Leyendo calendario, resultados y clasificaciones (tarda un minuto)…");
        // Primero desde la extensión (no depende de que la pestaña siga quieta)…
        let result = await recolectar(club, FCBQ).catch((e) => ({ error: e.message }));
        // …y si la FCBQ no lo acepta, desde dentro de la pestaña, reintentando si la página se recarga
        for (let intento = 0; (!result || result.error || !result.paginas?.length) && intento < 3; intento++) {
          if (intento) await esperar(2000);
          result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: recolectar, args: [club, FCBQ] })
            .then((r) => r[0]?.result).catch((e) => ({ error: e.message }));
        }
        if (!result || result.error) throw new Error(/Frame|removed/i.test(result?.error ?? "") ? "La pestaña de la FCBQ se ha recargado mientras leía. Vuelve a pulsar Actualizar." : result?.error || "No se ha podido leer la FCBQ.");
        puerto.postMessage({ tipo: "datos", paginas: result.paginas, avisos: result.avisos });
      }
    } catch (e) {
      let texto = e?.message || String(e);
      if (/error page|Cannot access/i.test(texto)) texto = "No se ha podido abrir basquetcatala.cat. Comprueba la conexión y vuelve a probar.";
      try { puerto.postMessage({ tipo: "error", texto }); } catch {}
    } finally {
      if (tab) chrome.tabs.remove(tab.id).catch(() => {});
      if (pestanaApp?.id) chrome.tabs.update(pestanaApp.id, { active: true }).catch(() => {});
      try { puerto.disconnect(); } catch {}
    }
  });
});

/** Lee lo que ha capturado captura.js en la página de estadísticas abierta */
async function capturado(tabId, id, segundos = 15) {
  for (let i = 0; i < segundos * 2; i++) {
    const r = await chrome.scripting.executeScript({
      target: { tabId }, world: "MAIN",
      func: (id) => { const m = window.__turoStats || {}; const k = Object.keys(m).find((u) => u.includes(id)); return k ? { url: k, texto: m[k] } : null; },
      args: [id],
    }).then((x) => x[0]?.result).catch(() => null);
    if (r) return r;
    await esperar(500);
  }
  return null;
}

// Se ejecuta DENTRO de la pestaña: pide el JSON de estadísticas de cada partido a la misma dirección
// que usa la web (cambiando solo el id del partido)
async function pedirStats(plantilla, idBase, ids) {
  const res = {};
  for (const id of ids) {
    try {
      const r = await fetch(plantilla.split(idBase).join(id));
      if (!r.ok) { res[id] = { error: r.status }; continue; }
      const j = await r.json();
      res[id] = j;
    } catch (e) { res[id] = { error: String(e?.message || e) }; }
    await new Promise((r) => setTimeout(r, 150));
  }
  return res;
}

// Se ejecuta DENTRO de la pestaña de basquetcatala.cat: pide un token a /jwt.php (como hace la web)
// y descarga las estadísticas del servicio de la FCBQ
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
        for (const url of ev.length ? [] : rutas) {
          q = await fetch(url, {
            headers: cab,
          }).catch(() => null);
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

/**
 * Abre la pestaña de jugadas de la página de estadísticas (si la hay), espera y devuelve todas las
 * peticiones de datos que ha hecho la página. Entre ellas está la de la jugada a jugada.
 */
async function descubrirPbp(tabId, avisar) {
  avisar("Buscando la jugada a jugada en la web de la FCBQ…");
  const leer = () => chrome.scripting.executeScript({
    target: { tabId, allFrames: true }, world: "MAIN",
    func: () => ({
      marco: location.href.slice(0, 160),
      cabeceras: window.__turoCabeceras || null,
      peticiones: window.__turoPeticiones || [],
      iframes: [...document.querySelectorAll("iframe")].map((f) => (f.src || "(sin src)").slice(0, 160)),
      // Textos cortos de pestañas/botones de la zona de estadísticas (no el menú de la federación)
      pestanas: [...new Set([...document.querySelectorAll("main button, main [role=tab], main .nav-link, main li, app-root button, app-root [role=tab], app-root a, [class*=tab] a, [class*=tab] button, [class*=Tab]")]
        .map((e) => (e.textContent || "").trim().replace(/\s+/g, " ")).filter((t) => t && t.length < 30))].slice(0, 40),
    }),
  }).then((x) => x.map((r) => r.result).filter(Boolean)).catch(() => []);
  // 1) Lo que ya ha pedido la página de estadísticas al cargarse
  await esperar(2500);
  const antes = await leer();
  // 2) Pulsar solo la pestaña de jugadas (sin seguir enlaces que cambien de página)
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true }, world: "MAIN",
    func: () => {
      const objetivo = /jugada a jugada|play.?by.?play|moviments|cronolog|minut a minut|joc a joc|pas a pas/i;
      for (const e of document.querySelectorAll("button, [role=tab], .nav-link, li, a, span")) {
        const t = (e.textContent || "").trim();
        if (t.length > 40 || !objetivo.test(t) || /jugador/i.test(t)) continue;
        const a = e.closest("a");
        const href = a?.getAttribute("href") || "";
        if (a && href && !href.startsWith("#") && !href.startsWith("javascript")) continue; // enlace a otra página
        try { e.click(); } catch {}
      }
    },
  }).catch(() => {});
  await esperar(3500);
  const despues = await leer();
  const marcos = despues.length ? despues : antes;
  const vistas = new Set();
  const peticiones = [...antes, ...despues].flatMap((m) => m.peticiones).filter((p) => !vistas.has(p.url) && vistas.add(p.url));
  // La de la jugada a jugada: una lista larga de jugadas con marcador / minuto / periodo
  const buena = peticiones.find((p) => p.estado === 200 && p.resumen?.lista?.n >= 10 && !/\/stats\b/.test(p.url) &&
    p.resumen.lista.campos.some((c) => /score|minute|time|period|marcador/i.test(c)));
  const cabeceras = [...antes, ...despues].map((m) => m.cabeceras).find(Boolean) || null;
  return {
    peticiones, cabeceras,
    pestanas: marcos.map((m) => ({ marco: m.marco, iframes: m.iframes, pestanas: m.pestanas, peticiones: m.peticiones.length })),
    plantilla: buena?.url || null,
  };
}

async function bajarEstadisticas(tabId, ids, avisar) {
  const stats = {};
  // 0) De dónde saca la página la jugada a jugada: la pestaña ya está abierta en el primer partido;
  //    si ahí no aparece, se prueba con los dos siguientes
  let descubierto = { peticiones: [], pestanas: [], plantilla: null, cabeceras: null };
  let enPagina = ids[0];
  for (let k = 0; k < Math.min(3, ids.length) && !descubierto.plantilla; k++) {
    if (k) { await abrirYEsperar(tabId, `${FCBQ}/estadistica/partit/${ids[k]}`, avisar).catch(() => {}); enPagina = ids[k]; }
    const d = await descubrirPbp(tabId, avisar).catch(() => null);
    if (d) descubierto = { peticiones: [...descubierto.peticiones, ...d.peticiones], pestanas: d.pestanas, plantilla: d.plantilla ? { url: d.plantilla, id: ids[k] } : null, cabeceras: d.cabeceras || descubierto.cabeceras };
  }
  const diagnostico = () => {
    stats.__muestra = {
      version: chrome.runtime.getManifest().version,
      descubierta: descubierto.plantilla?.url ?? null,
      conCabecerasDeLaWeb: !!descubierto.cabeceras,
      cabecerasWeb: descubierto.cabeceras ? Object.keys(descubierto.cabeceras) : [],
      pestanas: descubierto.pestanas,
      ...(stats.__muestra || {}),
      peticiones: descubierto.peticiones.map((p) => ({ url: p.url.slice(0, 160), estado: p.estado, lista: p.resumen?.lista, claves: p.resumen?.claves })),
    };
    return stats;
  };
  // 1) Servicio de estadísticas de la FCBQ con el token de la web (lo más rápido)
  for (let i = 0; i < ids.length; i += 20) {
    avisar(`Estadísticas: ${Math.min(i + 20, ids.length)} de ${ids.length} partidos…`);
    const r = await chrome.scripting.executeScript({ target: { tabId }, func: apiStats, args: [ids.slice(i, i + 20), descubierto.plantilla?.url ?? null, descubierto.plantilla?.id ?? null, descubierto.cabeceras] })
      .then((x) => x[0]?.result || {}).catch(() => ({}));
    if (r.error) break;
    if (r.__muestra) stats.__muestra = stats.__muestra ?? r.__muestra;
    delete r.__muestra; delete r.__muestraOk;
    for (const [id, j] of Object.entries(r)) if (!j.error) stats[id] = j;
    if (i === 0 && !Object.keys(stats).filter((k) => k !== "__muestra").length) break;
  }
  if (ids.every((id) => stats[id])) return diagnostico();

  // 2) Si no, lo que carga la propia página de estadísticas
  ids = ids.filter((id) => !stats[id]);
  if (enPagina !== ids[0]) await abrirYEsperar(tabId, `${FCBQ}/estadistica/partit/${ids[0]}`, avisar).catch(() => {});
  const primero = await capturado(tabId, ids[0]);
  if (!primero) {
    if (Object.keys(stats).length) return diagnostico();
    throw new Error("No he podido leer las estadísticas de la FCBQ (la página no las ha cargado).");
  }
  try { const j = JSON.parse(primero.texto); stats[ids[0]] = j; } catch {}
  const resto = ids.slice(1);

  // Rápido: misma dirección cambiando el id
  for (let i = 0; i < resto.length; i += 15) {
    avisar(`Estadísticas: ${Math.min(i + 15, resto.length) + 1} de ${ids.length} partidos…`);
    const lote = resto.slice(i, i + 15);
    const r = await chrome.scripting.executeScript({ target: { tabId }, func: pedirStats, args: [primero.url, ids[0], lote] })
      .then((x) => x[0]?.result || {}).catch(() => ({}));
    Object.assign(stats, r);
    // Si la web no deja pedirlas así, vamos partido a partido (más lento)
    if (i === 0 && lote.every((id) => !r[id] || r[id].error)) break;
  }

  // Lento: abrir la página de cada partido que falte
  const faltan = ids.filter((id) => !stats[id] || stats[id].error).slice(0, 60);
  for (let k = 0; k < faltan.length; k++) {
    avisar(`Estadísticas (una a una): ${k + 1} de ${faltan.length}…`);
    await abrirYEsperar(tabId, `${FCBQ}/estadistica/partit/${faltan[k]}`, avisar);
    const c = await capturado(tabId, faltan[k], 10);
    if (c) { try { const j = JSON.parse(c.texto); stats[faltan[k]] = j; } catch {} }
  }
  for (const id of Object.keys(stats)) if (stats[id]?.error) delete stats[id];
  return diagnostico();
}

// Se ejecuta en la extensión o DENTRO de la pestaña de basquetcatala.cat (con su sesión).
// Solo usa fetch y expresiones regulares para funcionar en los dos sitios.
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
