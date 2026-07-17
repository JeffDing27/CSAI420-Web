import Link from "next/link";

const cardClass =
  "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-950 to-slate-950 px-5 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="font-semibold tracking-wide text-cyan-300">STEDI Voice</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight">
          Hands-free balance and mobility support.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-blue-100">
          Create an account, connect your phone number, and access STEDI through
          the web or by calling (608) 200-4701.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/register" className="rounded-lg bg-cyan-300 px-6 py-3 font-bold text-blue-950">
            Create patient account
          </Link>
          <Link href="/account/login" className="rounded-lg border border-white/40 px-6 py-3 font-bold">
            Patient sign in
          </Link>
        </div>

        <section className="mt-16 grid gap-5 text-slate-950 md:grid-cols-3">
          <Link href="/register" className={cardClass}>
            <p className="text-sm font-bold text-blue-700">PATIENTS</p>
            <h2 className="mt-2 text-xl font-bold">Register for STEDI Voice</h2>
            <p className="mt-2 text-slate-600">Link your profile and phone number to the IVR.</p>
          </Link>
          <Link href="/provider/register" className={cardClass}>
            <p className="text-sm font-bold text-blue-700">CLINICIANS</p>
            <h2 className="mt-2 text-xl font-bold">Create provider account</h2>
            <p className="mt-2 text-slate-600">Access the clinician patient portal.</p>
          </Link>
          <Link href="/sms-consent" className={cardClass}>
            <p className="text-sm font-bold text-blue-700">MESSAGING</p>
            <h2 className="mt-2 text-xl font-bold">SMS enrollment</h2>
            <p className="mt-2 text-slate-600">Review disclosures and provide messaging consent.</p>
          </Link>
        </section>

        <footer className="mt-16 flex flex-wrap gap-6 text-sm text-blue-200">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/provider/login">Provider sign in</Link>
        </footer>
      </div>
    </main>
  );
}
