"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/accounts/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
    >
      Sign out
    </button>
  );
}
