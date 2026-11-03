"use client";

import { Suspense, type ComponentType } from "react";

/** Páginas que leem ?id= e outros parâmetros precisam do Suspense no site estático. */
export function withSuspense<P extends object>(C: ComponentType<P>) {
  return function Wrapped(props: P) {
    return <Suspense fallback={null}><C {...props} /></Suspense>;
  };
}
