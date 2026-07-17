"use client";

import { useEffect } from "react";
import { logoutClinician } from "../login/actions";

export default function LogoutPage() {
  useEffect(() => {
    logoutClinician().then(() => {
      window.location.href = "/provider/login";
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Logging out...</p>
    </div>
  );
}
