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

  /*FUNCIONES*/

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
