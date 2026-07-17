import Link from "next/link";
import type { ReactNode } from "react";

export function ComplianceShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link className="text-xl font-bold tracking-tight" href="/">
            STEDI Voice
          </Link>
          <nav className="flex gap-5 text-sm font-medium text-slate-600">
            <Link href="/sms-consent">SMS consent</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-700">
          STEDI Balance
        </p>
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          {description}
        </p>
        <div className="mt-10 space-y-8 leading-7 text-slate-700">
          {children}
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-5 px-6 py-8 text-sm text-slate-600">
          <span>© 2026 STEDI Balance</span>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms and Conditions</Link>
        </div>
      </footer>
    </div>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-2xl font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
