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
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Access Requests</h1>
          <p className="mt-2 text-sm text-gray-700">
            Request access to a new patient's records and track your pending requests.
          </p>
        </div>
      </div>

      <div className="mt-8 bg-white shadow sm:rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900">Request Access</h3>
        <form className="mt-4 sm:flex sm:items-center" onSubmit={handleRequest}>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="email" className="sr-only">Patient Email</label>
            <input
              type="email"
              name="email"
              id="email"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              placeholder="patient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            {loading ? "Sending..." : "Request Access"}
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm ${message.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900">Recent Requests</h3>
        <div className="mt-4 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Patient Email</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {requests?.length > 0 ? requests.map((req, idx) => (
                      <tr key={idx}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {req.customerEmail}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(req.requestDate).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            req.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            req.status === 'denied' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
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
