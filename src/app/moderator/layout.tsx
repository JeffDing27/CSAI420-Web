import { ReactNode } from 'react';

export default function ModeratorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <header className="w-full bg-indigo-600 shadow-md py-4 px-6 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">STEDI Moderator Dashboard</h1>
      </header>
      <main className="w-full max-w-6xl p-6">
        {children}
      </main>
    </div>
  );
}
