"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { CobData } from "./CobData";

export default function CobrancaLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isPayment = path.startsWith("/cobranca/assinatura");
  return (
    <AccessGate product="cobranca" loginOnly={isPayment}>
      {isPayment ? children : <CobData>{children}</CobData>}
    </AccessGate>
  );
}
