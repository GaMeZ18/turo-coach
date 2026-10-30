// Vídeos que están en el ordenador del entrenador: el archivo elegido se recuerda mientras la app siga
// abierta (al navegar entre páginas). No se sube a ningún sitio; al volver otro día se pide de nuevo.
const archivos = new Map<string, File>();
export const recordarArchivo = (videoId: string, f: File) => { archivos.set(videoId, f); };
export const archivoDe = (videoId: string): File | null => archivos.get(videoId) ?? null;
export const tamanoGB = (bytes: number) => `${(bytes / 1e9).toFixed(bytes > 1e10 ? 0 : 1)} GB`;
