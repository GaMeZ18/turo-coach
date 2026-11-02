// Se ejecuta en las páginas de estadísticas de basquetcatala.cat, antes que su propio código.
// Guarda las respuestas de su servicio de estadísticas (…/matches/<id>/stats) para que la
// extensión las lea, igual que las ve el navegador al mostrar la página. Además apunta todas las
// peticiones de datos que hace la página (con un resumen de su forma) para descubrir de dónde saca
// la jugada a jugada.
(() => {
  const guardar = (url, texto) => {
    if (!/\/matches\/[^/?#]+\/stats\b/.test(url)) return;
    (window.__turoStats = window.__turoStats || {})[url] = texto;
  };
  /** Forma de una respuesta JSON: la lista más larga que contiene y los campos de sus elementos */
  const resumir = (texto) => {
    try {
      const j = JSON.parse(texto);
      let mejor = { ruta: "", n: 0, campos: [] };
      const mirar = (x, ruta, prof) => {
        if (prof > 4 || !x || typeof x !== "object") return;
        if (Array.isArray(x)) {
          const objs = x.filter((o) => o && typeof o === "object" && !Array.isArray(o));
          if (objs.length > mejor.n) mejor = { ruta, n: objs.length, campos: Object.keys(objs[0]).slice(0, 25) };
          x.slice(0, 3).forEach((o, i) => mirar(o, `${ruta}[${i}]`, prof + 1));
        } else for (const [k, v] of Object.entries(x)) mirar(v, ruta ? `${ruta}.${k}` : k, prof + 1);
      };
      mirar(j, "", 0);
      return { claves: Array.isArray(j) ? ["(lista)"] : Object.keys(j).slice(0, 20), lista: mejor };
    } catch { return null; }
  };
  const apuntar = (url, estado, texto) => {
    if (!/^https?:/.test(url) || /\.(js|css|png|jpe?g|gif|svg|woff2?)(\?|$)/i.test(url)) return;
    const l = (window.__turoPeticiones = window.__turoPeticiones || []);
    if (l.length < 60) l.push({ url, estado, resumen: texto ? resumir(texto) : null });
  };
  // Cabeceras con las que la propia web pide los datos (su credencial): la extensión las reutiliza
  const cabeceras = (url, h) => {
    if (!/optimalwayconsulting|\/v1\/fcbq\//.test(url) || !h) return;
    const o = {};
    try {
      if (typeof Headers !== "undefined" && h instanceof Headers) h.forEach((v, k) => { o[k] = v; });
      else if (Array.isArray(h)) h.forEach(([k, v]) => { o[k] = v; });
      else Object.assign(o, h);
    } catch {}
    if (Object.keys(o).length) window.__turoCabeceras = o;
  };
  const fetchOriginal = window.fetch;
  window.fetch = async function (...args) {
    try {
      const u = String(args[0]?.url || args[0]);
      cabeceras(u, args[1]?.headers || args[0]?.headers);
    } catch {}
    const r = await fetchOriginal.apply(this, args);
    try {
      const url = r.url || String(args[0]?.url || args[0]);
      r.clone().text().then((t) => { guardar(url, t); apuntar(url, r.status, t); }).catch(() => {});
    } catch {}
    return r;
  };
  const ponerCab = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    try { (this.__cab = this.__cab || {})[k] = v; if (this.__url) cabeceras(this.__url, this.__cab); } catch {}
    return ponerCab.call(this, k, v);
  };
  const abrir = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (metodo, url, ...resto) {
    this.__url = String(url);
    this.addEventListener("load", () => {
      try {
        const u = this.responseURL || String(url);
        const t = typeof this.responseText === "string" ? this.responseText : "";
        guardar(u, t); apuntar(u, this.status, t);
      } catch {}
    });
    return abrir.call(this, metodo, url, ...resto);
  };
})();
