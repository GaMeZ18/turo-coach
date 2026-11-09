// Avisos push en el navegador (móvil u ordenador), pensado para que funcione también en Safari:
// - iPhone/iPad: solo con la app instalada en la pantalla de inicio y iOS 16.4 o posterior.
// - Safari de Mac: desde Safari 16 (macOS 13).
// - El permiso se pide justo al tocar el botón (Safari lo exige) y se admite la forma antigua con callback.
import { guardarSuscripcion } from "@/app/(app)/notificaciones/actions";

export type EstadoPush = "activo" | "inactivo" | "denegado" | "instalar-ios" | "actualizar-ios" | "abrir-safari" | "no-soportado";

const b64 = (s: string) => {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function infoDispositivo() {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const m = ua.match(/OS (\d+)[_.](\d+)/);
  const versionIos = ios && m ? Number(m[1]) + Number(m[2]) / 100 : null;
  const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  // Navegadores dentro de otras apps (WhatsApp, Instagram…) o Chrome/Firefox en iPhone: no pueden instalar la app
  const otraApp = ios && /CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua);
  const soporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return { ios, versionIos, instalada, otraApp, soporta };
}

/** Nombre corto del dispositivo: «iPhone (app)», «Android · Chrome», «Mac · Safari»… */
export function nombreDispositivo() {
  const ua = navigator.userAgent;
  const d = infoDispositivo();
  const so = d.ios ? (/ipad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "iPad" : "iPhone")
    : /android/i.test(ua) ? "Android" : /mac os x/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : /linux/i.test(ua) ? "Linux" : "Otro";
  const nav = /edg\//i.test(ua) ? "Edge" : /firefox|fxios/i.test(ua) ? "Firefox" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Navegador";
  return d.instalada ? `${so} (app)` : `${so} · ${nav}`;
}

/** En qué situación está este dispositivo (instalada: también vale abrir la web instalada desde el icono) */
export async function estadoPush(): Promise<EstadoPush> {
  const d = infoDispositivo();
  if (d.ios && !d.instalada) return d.otraApp ? "abrir-safari" : d.versionIos !== null && d.versionIos < 16.4 ? "actualizar-ios" : "instalar-ios";
  if (!d.soporta) return d.ios && d.versionIos !== null && d.versionIos < 16.4 ? "actualizar-ios" : "no-soportado";
  if (Notification.permission === "denied") return "denegado";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (await reg?.pushManager.getSubscription()) return "activo";
  } catch {}
  return "inactivo";
}

/** Pide permiso (forma nueva con promesa o antigua con callback de Safari) */
function pedirPermiso(): Promise<NotificationPermission> {
  return new Promise((resolve) => {
    try {
      const r = Notification.requestPermission((p) => resolve(p));
      if (r && typeof r.then === "function") r.then(resolve, () => resolve(Notification.permission));
    } catch {
      resolve(Notification.permission);
    }
  });
}

async function registro() {
  const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  // Esperar a que esté activo (en Safari a veces tarda), sin quedarse colgado
  if (!reg.active) {
    await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 8000))]);
  }
  return (await navigator.serviceWorker.getRegistration("/")) ?? reg;
}

/** Suscribe este dispositivo. pedir=true solo al tocar el botón (Safari exige un toque para pedir permiso). */
type Guardar = (s: { endpoint: string; p256dh: string; auth: string; dispositivo?: string }) => Promise<{ error?: string } | undefined | void>;
export async function activarPush(clavePublica: string, pedir = true, guardar: Guardar = guardarSuscripcion): Promise<{ ok?: boolean; error?: string; estado?: EstadoPush }> {
  try {
    if (Notification.permission !== "granted") {
      if (!pedir) return { estado: "inactivo" };
      const permiso = await pedirPermiso(); // lo primero tras el toque
      if (permiso === "denied") return { estado: "denegado", error: "Has bloqueado los avisos. Permítelos en los ajustes del navegador." };
      if (permiso !== "granted") return { estado: "inactivo", error: "No se ha dado permiso. Vuelve a pulsar y elige «Permitir»." };
    }
    const reg = await registro();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(clavePublica) });
    const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return { error: "El navegador no ha dado los datos de la suscripción. Prueba otra vez." };
    const r = await guardar({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: nombreDispositivo() });
    if (r?.error) return { error: r.error };
    return { ok: true, estado: "activo" };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { error: `No se han podido activar (${m}). Cierra la app del todo, vuelve a abrirla y prueba otra vez.` };
  }
}

/** Texto de ayuda para cada situación (null si no hace falta) */
export function ayudaPush(e: EstadoPush): { titulo: string; texto: string } | null {
  switch (e) {
    case "instalar-ios":
      return { titulo: "Instala la app para recibir avisos", texto: "En iPhone los avisos solo llegan con la app instalada. En Safari, pulsa Compartir (el cuadrado con la flecha) → «Añadir a pantalla de inicio» → Añadir. Después ábrela desde el icono y activa los avisos." };
    case "abrir-safari":
      return { titulo: "Ábrela en Safari", texto: "Desde este navegador no se puede instalar. Copia la dirección, ábrela en Safari, pulsa Compartir → «Añadir a pantalla de inicio» y ábrela desde el icono." };
    case "actualizar-ios":
      return { titulo: "Actualiza el iPhone", texto: "Los avisos necesitan iOS 16.4 o posterior (Ajustes → General → Actualización de software)." };
    case "denegado":
      return { titulo: "Los avisos están bloqueados", texto: "En iPhone: Ajustes → Notificaciones → Coach Manager → Permitir. En Safari de Mac: Safari → Ajustes → Sitios web → Notificaciones → Permitir. En Chrome: el candado junto a la dirección → Notificaciones → Permitir." };
    case "no-soportado":
      return { titulo: "Este navegador no admite avisos", texto: "Usa Chrome, Edge, Firefox o Safari actualizados (en iPhone, con la app instalada)." };
    default:
      return null;
  }
}
