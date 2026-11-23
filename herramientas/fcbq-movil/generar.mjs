// Genera public/fcbq-movil.js copiando de la extensión las funciones que leen la FCBQ
// (así el marcador del iPhone y la extensión leen exactamente igual). Uso: node herramientas/fcbq-movil/generar.mjs
import { readFileSync, writeFileSync } from "node:fs";
const raiz = new URL("../../", import.meta.url);
const ext = readFileSync(new URL("extension/background.js", raiz), "utf8");
const funcion = (nombre) => {
  const i = ext.search(new RegExp(`(async )?function ${nombre}\\(`));
  if (i < 0) throw new Error("No encuentro " + nombre);
  const fin = ext.indexOf("\n}\n", i);
  return ext.slice(i, fin + 2);
};
const plantilla = readFileSync(new URL("herramientas/fcbq-movil/plantilla.js", raiz), "utf8");
const salida = plantilla.replace("/*FUNCIONES*/", ["datosJugada", "apiStats", "recolectar"].map(funcion).join("\n\n"));
writeFileSync(new URL("public/fcbq-movil.js", raiz), salida);
console.log("public/fcbq-movil.js:", salida.length, "bytes");
