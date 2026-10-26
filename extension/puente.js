// Puente entre la página de Turó Coach y la extensión.
// La página pide "actualizar" con window.postMessage; la extensión abre la FCBQ y devuelve las páginas.
window.addEventListener("message", (e) => {
  if (e.source !== window || !e.data) return;
  if (e.data.tipo === "turo-fcbq-ping") {
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
