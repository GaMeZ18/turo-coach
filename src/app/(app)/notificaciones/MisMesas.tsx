"use client";

import { useState, useTransition } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { vincularMesas } from "./actions";

/** «¿Haces mesas?»: vincula tu teléfono de mesas a tu cuenta para recibir esos avisos aquí */
export default function MisMesas({ telefono }: { telefono: string | null }) {
  const [res, setRes] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, start] = useTransition();
  const enviar = (fd: FormData) => start(async () => setRes(await vincularMesas(fd)));
  return (
    <div className="tarjeta p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold"><ClipboardCheck size={16} className="text-azul" /> ¿También haces mesas?</p>
      {telefono ? (
        <form action={enviar} className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-tinta/70">Tus avisos de mesa (confirmación y 1 hora antes) te llegan aquí. Teléfono: <strong>{telefono}</strong></p>
          <input type="hidden" name="quitar" value="1" />
          <button className="text-xs text-tinta/60 underline">Desvincular</button>
        </form>
      ) : (
        <>
          <p className="mt-1 text-tinta/70">Pon el teléfono con el que te apuntas a las mesas y te llegarán aquí y al móvil los avisos cuando te confirmen y 1 hora antes del partido.</p>
          <form action={enviar} className="mt-2 flex flex-wrap gap-2">
            <input name="telefono" inputMode="tel" placeholder="600 000 000" className="campo !w-40" />
            <button disabled={pendiente} className="btn-primario !py-1.5">{pendiente && <Loader2 size={15} className="animate-spin" />} Vincular</button>
          </form>
        </>
      )}
      {res && <p className={`mt-1 text-xs ${res.ok ? "text-green-700" : "text-red-700"}`}>{res.ok ?? res.error}</p>}
    </div>
  );
}
