"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasAccess, SessionProvider, useSubscription, useUser } from "@/lib/session";
import type { ProductId } from "@/lib/products";
import { Loading, NotConfigured } from "./ui";

/**
 * Porta de entrada de cada app: sem login, vai para /entrar; sem assinatura válida, vai para a tela de assinatura.
 * Quem garante de verdade são as regras do banco; isto aqui só leva a pessoa para a tela certa.
 */
export function AccessGate({ product, loginOnly, children }: { product: ProductId; loginOnly?: boolean; children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { loading, user, configured } = useUser();
  const { loading: subLoading, sub } = useSubscription(user?.uid, product);
  const allowed = loginOnly || hasAccess(sub);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/entrar/?volta=${encodeURIComponent(path)}`);
    else if (!subLoading && !allowed) router.replace(`/${product}/assinatura/`);
  }, [loading, user, subLoading, allowed, router, path, product]);

  if (!configured) return <NotConfigured app={product} />;
  if (loading || !user || subLoading || !allowed) return <Loading app={product} />;
  return <SessionProvider value={{ user, sub }}>{children}</SessionProvider>;
}
