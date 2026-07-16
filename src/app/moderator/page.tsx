"use client";

import { useEffect, useState } from 'react';

interface Escalation {
  escalationId: string;
  userId: string;
  phoneNumber?: string;
  question: string;
  priority: string;
  category: string;
  status: string;
  escalationTimestamp: string;
  responsePreference: string;
}

export default function ModeratorPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEscalations = async () => {
    try {
      const res = await fetch('/api/escalations', {
        headers: {
          'suresteps.session.token': 'mock-mod-token'
        }
      });
      if (!res.ok) throw new Error("Failed to fetch escalations");
      const data = await res.json();
      setEscalations(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/escalations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'suresteps.session.token': 'mock-mod-token'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchEscalations();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading escalations...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Active Escalations</h2>
      
      {escalations.length === 0 ? (
        <p className="text-gray-500">No active escalations.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {escalations.map(esc => (
                <tr key={esc.escalationId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(esc.escalationTimestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      esc.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {esc.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{esc.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={esc.question}>{esc.question}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {esc.phoneNumber} ({esc.responsePreference})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{esc.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <select 
                      className="border rounded p-1 text-sm text-gray-700"
                      value={esc.status}
                      onChange={(e) => handleStatusChange(esc.escalationId, e.target.value)}
                    >
                      <option value="escalated">Escalated</option>
                      <option value="assigned">Assigned</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
