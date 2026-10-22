// Abre basquetcatala.cat en una pestaña (si sale la verificación de seguridad, la resuelve el usuario)
// y, desde esa misma pestaña, lee el calendario del club, las páginas de cada equipo y sus
// resultados y clasificaciones. Todo ocurre en el navegador del usuario, como si navegara él.

const FCBQ = "https://www.basquetcatala.cat";
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

chrome.runtime.onConnect.addListener((puerto) => {
  if (puerto.name !== "fcbq") return;
  puerto.onMessage.addListener(async ({ club }) => {
    const avisar = (texto) => { try { puerto.postMessage({ tipo: "progreso", texto }); } catch {} };
    const pestanaApp = puerto.sender?.tab;
    let tab;
    try {
      avisar("Abriendo basquetcatala.cat…");
      tab = await chrome.tabs.create({ url: `${FCBQ}/partits/calendari_club_mensual/${club}`, active: true, ...(pestanaApp ? { windowId: pestanaApp.windowId, index: pestanaApp.index + 1 } : {}) });

      // Esperar a que la pestaña muestre la web de verdad (no la verificación) y deje de recargarse
      let avisado = false, estable = 0, ultima = "";
      for (let i = 0; estable < 3; i++) {
        if (i > 240) throw new Error("La página de la FCBQ no ha terminado de cargar. Vuelve a probar.");
        await esperar(1000);
        const t = await chrome.tabs.get(tab.id).catch(() => null);
        if (!t) throw new Error("Se ha cerrado la pestaña de la FCBQ.");
        const url = t.url || t.pendingUrl || "";
        let verificando = /security-check/.test(url);
        if (!verificando && t.status === "complete") {
          const titulo = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.title }).then((r) => r[0]?.result ?? "").catch(() => null);
          if (titulo === null) { estable = 0; continue; } // estaba navegando
          verificando = /verificaci|seguretat|security/i.test(titulo);
        }
        if (verificando) {
          estable = 0;
          if (!avisado) { avisar("La FCBQ pide una verificación de seguridad: resuélvela en su pestaña."); avisado = true; }
          continue;
        }
        estable = t.status === "complete" && url === ultima ? estable + 1 : 0;
        ultima = url;
      }

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
      chrome.tabs.remove(tab.id).catch(() => {});
      if (pestanaApp?.id) chrome.tabs.update(pestanaApp.id, { active: true }).catch(() => {});
    } catch (e) {
      let texto = e?.message || String(e);
      if (/error page|Cannot access/i.test(texto)) texto = "No se ha podido abrir basquetcatala.cat. Comprueba la conexión y vuelve a probar.";
      try { puerto.postMessage({ tipo: "error", texto }); } catch {}
      if (pestanaApp?.id) chrome.tabs.update(pestanaApp.id, { active: true }).catch(() => {});
    } finally {
      try { puerto.disconnect(); } catch {}
    }
  });
});

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

    // 3) Resultados de cada competición. "/resultats/<id>/0" suele traer todas las jornadas;
    //    si solo trae una, recorremos las jornadas que enlace.
    const ids = new Set();
    for (const e of competiciones) { const m = e.match(/\/competicions\/resultats\/(\d+)/); if (m) ids.add(m[1]); }
    const clasif = new Set([...competiciones].filter((e) => /classifica/i.test(e)));
    for (const id of ids) {
      const h = await leer(`/competicions/resultats/${id}/0`);
      if (!h) continue;
      for (const e of enlaces(h, /classifica/i)) clasif.add(e);
      // Una sola jornada son pocos partidos; una temporada entera, muchos
      const partidos = (h.match(/teamNameLink/g) || []).length / 2;
      if (partidos < 12) {
        const otras = enlaces(h, new RegExp(`/competicions/resultats/${id}/\\d+`)).slice(0, 40);
        for (const e of otras) await leer(e);
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
