"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { SobData } from "./SobData";

export default function SobraLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isPayment = path.startsWith("/sobra/assinatura");
  return (
    <AccessGate product="sobra" loginOnly={isPayment}>
      {isPayment ? children : <SobData>{children}</SobData>}
    </AccessGate>
  );
}
