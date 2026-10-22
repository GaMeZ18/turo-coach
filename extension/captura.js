// Se ejecuta en las páginas de estadísticas de basquetcatala.cat, antes que su propio código.
// Guarda las respuestas de su servicio de estadísticas (…/matches/<id>/stats) para que la
// extensión las lea, igual que las ve el navegador al mostrar la página.
(() => {
  const guardar = (url, texto) => {
    if (!/\/matches\/[^/?#]+\/stats\b/.test(url)) return;
    (window.__turoStats = window.__turoStats || {})[url] = texto;
  };
  const fetchOriginal = window.fetch;
  window.fetch = async function (...args) {
    const r = await fetchOriginal.apply(this, args);
    try {
      const url = r.url || String(args[0]?.url || args[0]);
      if (/\/matches\/[^/?#]+\/stats\b/.test(url)) r.clone().text().then((t) => guardar(url, t)).catch(() => {});
    } catch {}
    return r;
  };
  const abrir = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (metodo, url, ...resto) {
    this.addEventListener("load", () => { try { guardar(this.responseURL || String(url), this.responseText); } catch {} });
    return abrir.call(this, metodo, url, ...resto);
  };
})();
