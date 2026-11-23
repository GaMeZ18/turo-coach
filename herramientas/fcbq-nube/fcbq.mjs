// Carga de la FCBQ «en la nube» (GitHub Actions), sin depender de ningún ordenador encendido.
// Abre un Chromium con la extensión de Coach Manager, entra con la cuenta de los secretos
// COACH_EMAIL / COACH_PASSWORD y lanza el mismo «Actualizar desde la FCBQ» que harías a mano.
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const APP = process.env.APP_URL || "https://coach.cbturo.com";
const forzar = process.env.FORZAR === "true";
const email = process.env.COACH_EMAIL, clave = process.env.COACH_PASSWORD;
if (!email || !clave) { console.log("::warning::Faltan los secretos COACH_EMAIL y COACH_PASSWORD en GitHub: no se carga nada."); process.exit(0); }

// ¿Hay algo que cargar? (partido terminado sin estadísticas). Si no, no se abre nada.
if (!forzar) {
  const r = await fetch(`${APP}/api/fcbq/pendiente`, { cache: "no-store" }).then((x) => x.json()).catch(() => ({ pendiente: false }));
  if (!r.pendiente) { console.log("Nada pendiente."); process.exit(0); }
  console.log(`Partidos pendientes: ${r.partidos}`);
}

const ext = resolve("../../extension");
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "fcbq-")), {
  headless: false, // con xvfb-run: las extensiones necesitan ventana
  viewport: { width: 1280, height: 900 },
  locale: "es-ES",
  timezoneId: "Europe/Madrid",
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
const page = ctx.pages()[0] ?? await ctx.newPage();
try {
  // 1) Entrar en Coach Manager
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", clave);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }), page.getByRole("button", { name: "Entrar" }).click()]);
  console.log("Sesión iniciada.");

  // 2) Lanzar la actualización (la página la empieza sola con ?auto=1 en cuanto ve la extensión)
  await page.goto(`${APP}/partidos/importar?auto=1`, { waitUntil: "domcontentloaded" });
  const fin = Date.now() + 9 * 60e3;
  let ultimo = "";
  while (Date.now() < fin) {
    await page.waitForTimeout(5000);
    const texto = (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ");
    const linea = texto.slice(0, 300);
    if (linea !== ultimo) { console.log("·", linea); ultimo = linea; }
    if (/Actualizado: \d+ partidos nuevos/.test(texto)) { console.log("Hecho:", texto.match(/Actualizado:[^.]*\./)?.[0]); break; }
    if (/Asigna|¿A qué equipo/i.test(texto) && /Guardar/.test(texto)) throw new Error("Hay equipos nuevos de la FCBQ por asignar: hazlo una vez a mano en Partidos → Importar.");
    if (/verificaci[oó]n de seguridad/i.test(texto)) console.log("La FCBQ pide verificación de seguridad: se espera por si se resuelve sola.");
    if (/Se ha cortado la conexión con la extensión\. (Vuelve|Actualízala)|No se ha podido (leer|abrir)/i.test(texto)) throw new Error(linea);
  }
  // Comprobación final: ¿sigue habiendo algo pendiente?
  const r = await fetch(`${APP}/api/fcbq/pendiente`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
  console.log("Después de cargar:", JSON.stringify(r));
} catch (e) {
  console.error("Error:", e?.message || e);
  process.exitCode = 1;
} finally {
  await ctx.close();
}
