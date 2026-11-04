import Link from "next/link";
import type { ReactNode } from "react";
import type { ProductId } from "@/lib/products";

// Componentes compartilhados pelos dois apps. Só a cor de destaque muda (data-app).

export function AppShell({ app, children, tabs, sub, wide, back, title, right }: {
  app: ProductId;
  children: ReactNode;
  tabs?: ReactNode;
  /** Tela interna: o menu aparece só no computador. */
  sub?: boolean;
  wide?: boolean;
  back?: { href: string; label: string };
  title?: string;
  right?: ReactNode;
}) {
  return (
    <div className="app" data-app={app}>
      {(back || right) && (
        <header className="top">
          {back ? (
            <Link className="back" href={back.href}>
              <Icon name="chevron-left" size={18} /> {back.label}
            </Link>
          ) : <span />}
          {right}
        </header>
      )}
      <main className={`content ${tabs && !sub ? "" : "no-tabs"} ${wide ? "wide" : ""}`}>
        {title && <h1 className="page-title">{title}</h1>}
        {children}
      </main>
      {tabs}
    </div>
  );
}

export function TabBar({ brand, items, active }: { brand: { name: string; href: string }; items: { href: string; label: string; icon: IconName; key: string; badge?: number }[]; active?: string }) {
  return (
    <div className={active ? "tabs" : "tabs sub"}>
      <Link className="side-brand" href={brand.href}>{brand.name}</Link>
      <nav aria-label="Menu principal">
        {items.map((t) => (
          <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined}>
            <Icon name={t.icon} />
            {t.label}
            {t.badge ? <span className="badge" aria-label={`${t.badge} pendentes`}>{t.badge}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card empty">
      <span className="ico"><Icon name={icon} size={28} /></span>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Choice({ name, value, label, hint, defaultChecked, required }: { name: string; value: string; label: string; hint?: string; defaultChecked?: boolean; required?: boolean }) {
  return (
    <label className="choice">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} required={required} />
      <span>{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

export function Notice({ kind = "info", children }: { kind?: "ok" | "bad" | "warn" | "info"; children: ReactNode }) {
  return <div className={`alert ${kind}`} role={kind === "bad" ? "alert" : "status"}>{children}</div>;
}

export function Loading({ app }: { app: ProductId }) {
  return (
    <div className="app" data-app={app} aria-busy="true">
      <main className="content no-tabs" style={{ paddingTop: 40 }}>
        <div className="skeleton" style={{ width: 120, height: 14 }} />
        <div className="skeleton" style={{ width: 240, height: 44 }} />
        <div className="skeleton" style={{ height: 180, borderRadius: 28 }} />
        <span className="sr-only">Carregando…</span>
      </main>
    </div>
  );
}

export function NotConfigured({ app }: { app: ProductId }) {
  return (
    <div className="app" data-app={app}>
      <main className="content no-tabs" style={{ paddingTop: 48 }}>
        <h1 className="page-title">Falta configurar o site</h1>
        <p className="lead">Abra o arquivo <b>config.js</b> na pasta do site, cole o endereço e a chave do Supabase e publique de novo. O passo a passo está no README.</p>
      </main>
    </div>
  );
}

export function ErrorBox({ error }: { error: string | null | undefined }) {
  return error ? <div className="alert bad" role="alert">{error}</div> : null;
}

export type IconName =
  | "home" | "users" | "bell" | "settings" | "chevron-left" | "chevron-right" | "plus" | "whatsapp" | "check"
  | "box" | "tag" | "calendar" | "alert" | "copy" | "pause" | "cake";

const PATHS: Record<IconName, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.5 3 5.2" /></>,
  bell: <><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  whatsapp: <><path d="M20.5 11.7A8.5 8.5 0 0 1 8 19.2L3.5 20.5l1.3-4.4a8.5 8.5 0 1 1 15.7-4.4z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1-.4-2.4-1.8-2.8-2.8l.9-1-1-2z" /></>,
  check: <path d="M5 12.5 10 17l9-10" />,
  box: <><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></>,
  tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="8" cy="8" r="1.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  alert: <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.5" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h9" /></>,
  pause: <path d="M9 5v14M15 5v14" />,
  cake: <><path d="M4 21V13a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8z" /><path d="M4 16c2.7 1.5 5.3 1.5 8 0s5.3-1.5 8 0M12 11V7M12 4.5v.5" /></>,
};

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
