import type { ReactNode } from "react";

export default function ModeratorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell flex flex-col items-center px-4 py-6 md:px-6">
      <header className="app-panel w-full max-w-7xl px-6 py-4 md:px-8 md:py-5 flex justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operations</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            STEDI Moderator Dashboard
          </h1>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
          Live Queue
        </span>
      </header>
      <main className="w-full max-w-7xl pt-6 pb-10">{children}</main>
    </div>
  );
}
