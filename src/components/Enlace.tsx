import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Link sin precarga automática (Next precarga cada enlace que sale en pantalla y eso son decenas de
 * peticiones al servidor por página: gastaba la CPU gratuita de Vercel). Se puede pedir con prefetch={true}.
 */
export default function Enlace(props: ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />;
}
