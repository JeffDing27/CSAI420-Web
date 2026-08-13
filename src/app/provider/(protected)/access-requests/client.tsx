"use client";

import { useState } from "react";
import { createAccessRequest } from "./actions";

export default function ProviderAccessRequestsPage({
  requests
}: {
  requests: any[]
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await createAccessRequest(email);
      if (res.error) {
        setMessage(`Error: ${res.error}`);
      } else {
        setMessage("Access request sent successfully.");
        setEmail("");
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="app-title">Access Requests</h1>
          <p className="app-subtitle mt-2">
            Request access to a new patient's records and track your pending requests.
          </p>
        </div>
      </div>

      <div className="app-panel p-6">
        <h3 className="text-xl font-extrabold text-slate-900">Request Access</h3>
        <form className="mt-4 sm:flex sm:items-center" onSubmit={handleRequest}>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="email" className="sr-only">Patient Email</label>
            <input
              type="email"
              name="email"
              id="email"
              className="app-input mt-0"
              placeholder="patient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full app-button-primary sm:mt-0 sm:ml-3 sm:w-auto"
          >
            {loading ? "Sending..." : "Request Access"}
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm font-semibold ${message.startsWith("Error") ? "text-rose-600" : "text-emerald-600"}`}>
            {message}
          </p>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-extrabold text-slate-900">Recent Requests</h3>
        <div className="mt-4 flex flex-col">
          <div className="app-panel p-2 md:p-3 overflow-x-auto">
            <div className="inline-block min-w-full py-2 align-middle">
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-extrabold text-slate-800 sm:pl-6">Patient Email</th>
                      <th className="px-3 py-3.5 text-left text-sm font-extrabold text-slate-800">Date</th>
                      <th className="px-3 py-3.5 text-left text-sm font-extrabold text-slate-800">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {requests?.length > 0 ? requests.map((req, idx) => (
                      <tr key={idx}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-slate-900 sm:pl-6">
                          {req.customerEmail}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {new Date(req.requestDate).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`px-2.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 
                            req.status === 'denied' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-sm text-gray-500">
                          No requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
