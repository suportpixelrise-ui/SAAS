import { Landings } from "./Landing";
import type { ProductId } from "@/lib/products";

// Cada site do Netlify mostra só o seu app (NEXT_PUBLIC_APP); no computador aparecem os dois.
const ONLY = process.env.NEXT_PUBLIC_APP as ProductId | undefined;

export default function Home() {
  return <Landings ids={ONLY ? [ONLY] : ["cobranca", "sobra"]} />;
}
