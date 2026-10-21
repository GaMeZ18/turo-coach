"use client";

import PizarraEditor from "@/components/pizarra";

// Página de prueba SIN datos del club: solo la pizarra, para depurar en cualquier navegador.
export default function PruebaPizarra() {
  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1 className="mb-3 text-xl">Prueba de pizarra</h1>
      <PizarraEditor />
    </main>
  );
}
