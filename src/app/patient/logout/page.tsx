"use client";

import { useEffect } from "react";
import { logoutPatient } from "../login/actions";

export default function PatientLogoutPage() {
  useEffect(() => {
    logoutPatient()
      .catch((error) => {
        console.error("[Patient Logout] Failed to fully revoke session:", error);
      })
      .finally(() => {
        window.location.href = "/patient/login";
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <p className="text-sm text-slate-500">Logging out...</p>
    </div>
  );
}
