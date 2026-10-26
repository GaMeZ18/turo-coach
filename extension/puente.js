// Puente entre la página de Coach Manager CBTuró y la extensión.
// La página pide "actualizar" con window.postMessage; la extensión abre la FCBQ y devuelve las páginas.
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data) return;
  if (e.data.tipo === "turo-fcbq-ping") {
    // Recordar en qué dirección está la app (para la actualización automática de los lunes)
    try { chrome.runtime.sendMessage({ tipo: "origen", url: location.origin + (location.pathname.startsWith("/coach") ? "/coach" : "") }); } catch {}
    window.postMessage({ tipo: "turo-fcbq-pong", version: chrome.runtime.getManifest().version }, location.origin);
    return;
  }
  if (e.data.tipo === "turo-fcbq-terminado") { chrome.runtime.sendMessage({ tipo: "terminado", ok: !!e.data.ok }); return; }
  if (e.data.tipo !== "turo-fcbq-pedir" && e.data.tipo !== "turo-fcbq-pedir-stats") return;
  const puerto = chrome.runtime.connect({ name: "fcbq" });
  puerto.onMessage.addListener((m) => window.postMessage({ ...m, tipo: "turo-fcbq-" + m.tipo }, location.origin));
  puerto.onDisconnect.addListener(() => window.postMessage({ tipo: "turo-fcbq-fin" }, location.origin));
  puerto.postMessage(e.data.tipo === "turo-fcbq-pedir-stats" ? { stats: e.data.ids || [] } : { club: String(e.data.club || "3373") });
});
