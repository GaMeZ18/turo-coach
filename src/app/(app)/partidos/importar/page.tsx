import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import Importador from "./Importador";
import ActualizarFCBQ from "./ActualizarFCBQ";

export default async function ImportarPage() {
  const { supabase } = await requireUser();
  const { data: temporada } = await supabase.from("temporadas").select("id, nombre").eq("actual", true).maybeSingle();
  const { data: equipos } = await supabase
    .from("equipos")
    .select("id, nombre, fcbq_nombre")
    .eq("temporada_id", temporada?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("nombre");
  const ids = (equipos ?? []).map((e) => e.id);
  const { data: existentes } = await supabase
    .from("partidos")
    .select("id, equipo_id, fecha, rival, local, lugar, competicion, jornada, puntos_favor, puntos_contra, estado, fcbq_id")
    .in("equipo_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  return (
    <div>
      <Link href="/partidos" className="text-sm text-tinta/60 hover:underline">← Partidos</Link>
      <h1 className="mt-1 text-2xl font-semibold">Importar de la FCBQ</h1>
      <p className="mt-1 max-w-3xl text-sm text-tinta/70">
        Trae a Turó Coach los partidos y los <strong>resultados</strong> de basquetcatala.cat. Puedes repetirlo cuando quieras:
        lo que ya esté se actualiza (hora, pista, marcador…) y no se duplica.
      </p>
      <div className="mt-5">
        <ActualizarFCBQ equipos={equipos ?? []} />
      </div>

      <section id="extension" className="tarjeta mt-6 max-w-3xl scroll-mt-24 p-4 text-sm text-tinta/80">
        <h2 className="text-base font-semibold text-tinta">Instalar el botón (una sola vez por ordenador)</h2>
        <p className="mt-1 text-tinta/60">
          La FCBQ no deja que un servidor lea su web (pide verificación de seguridad), así que la lectura la hace una pequeña extensión
          en tu navegador. Funciona en Chrome, Brave y Edge de ordenador.
        </p>
        <ol className="mt-3 list-inside list-decimal space-y-1.5">
          <li><a href="/extension/turo-coach-fcbq.zip" download className="font-medium text-azul underline">Descarga la extensión</a> y descomprime el .zip (clic derecho → Extraer todo).</li>
          <li>
            Abre la página de extensiones: escribe en la barra de direcciones{" "}
            <code className="rounded bg-suave px-1">chrome://extensions</code> (Brave: <code className="rounded bg-suave px-1">brave://extensions</code>, Edge: <code className="rounded bg-suave px-1">edge://extensions</code>).
          </li>
          <li>Activa <strong>Modo de desarrollador</strong> (arriba a la derecha).</li>
          <li>Pulsa <strong>Cargar descomprimida</strong> y elige la carpeta que has descomprimido.</li>
          <li>Recarga esta página: el botón <strong>Actualizar desde la FCBQ</strong> ya funcionará.</li>
        </ol>
        <p className="mt-3 rounded-lg bg-oro/15 p-2 text-xs text-tinta/70">
          <strong>Automático:</strong> desde la versión 1.3, la extensión actualiza sola <strong>cada lunes a las 6:00</strong> si el ordenador está encendido con el navegador abierto
          y la sesión de Turó Coach iniciada. Si a esa hora estaba apagado, lo hace al abrir el navegador. Si la FCBQ pide verificación, la pestaña se queda esperando a que la resuelvas.
        </p>
        <p className="mt-3 text-xs text-tinta/50">
          Al pulsarlo se abre una pestaña de basquetcatala.cat; si sale la verificación, resuélvela y la extensión sigue sola. Lee el calendario del club de toda la temporada,
          los resultados y las clasificaciones de cada equipo, lo guarda aquí y cierra la pestaña.
        </p>
      </section>

      <details className="mt-6 max-w-3xl">
        <summary className="cursor-pointer text-sm font-medium text-tinta/60">Importación manual (sin extensión: móvil, otro navegador…)</summary>
        <div className="mt-3">
          <Importador equipos={equipos ?? []} existentes={existentes ?? []} temporada={temporada?.nombre ?? null} />
        </div>
      </details>
    </div>
  );
}
