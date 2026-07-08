import React, { useState, useEffect } from 'react';
import { Activity, Search, RefreshCw, Clock, User, FileText } from 'lucide-react';
import { SystemLog } from '../types';

interface LogsPanelProps {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  adminToken: string;
}

export default function LogsPanel({ addToast, adminToken }: LogsPanelProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logs', {
        headers: {
          'Authorization': adminToken
        }
      });
      if (!res.ok) {
        throw new Error('कृती नोंदी लोड करताना त्रुटी आली.');
      }
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'नोंदी मिळवताना अडचण आली.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [adminToken]);

  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      (log.action || '').toLowerCase().includes(query) ||
      (log.details || '').toLowerCase().includes(query) ||
      (log.userEmail || '').toLowerCase().includes(query)
    );
  });

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('mr-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="border-b border-rose-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Activity className="h-5 w-5 text-rose-500" />
            <span>संवेदनशील कृती नोंदी (Sensitive Action Logs)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            सुरक्षा आणि उत्तरदायित्वासाठी (Accountability) मुख्य व्यवस्थापक, लेखक आणि इतर प्रशासकीय युझर्सनी केलेल्या संवेदनशील कृतींची नोंद येथे ठेवली जाते.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>ताजे करा (Refresh)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </span>
        <input
          type="text"
          placeholder="नोंदी, कृती किंवा ईमेलद्वारे शोधा..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
        />
      </div>

      {loading ? (
        /* Skeleton loading lines */
        <div className="space-y-4">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-16 w-full bg-slate-50 rounded-xl animate-pulse flex items-center px-4 justify-between">
              <div className="space-y-2">
                <div className="h-4 w-48 bg-slate-200 rounded"></div>
                <div className="h-3 w-72 bg-slate-100 rounded"></div>
              </div>
              <div className="h-4 w-24 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
          <FileText className="h-12 w-12 text-slate-300" />
          <p className="text-sm font-semibold">कोणत्याही नोंदी आढळल्या नाहीत.</p>
          <p className="text-xs">शोध संज्ञा बदलून पुन्हा प्रयत्न करा.</p>
        </div>
      ) : (
        /* Log List */
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">वेळ (Timestamp)</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">वापरकर्ता (User Email)</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">कृती (Action)</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">तपशील (Details)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/30 transition">
                      <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-slate-600">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600">
                        <div className="flex items-center space-x-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">{log.userEmail}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md font-bold bg-rose-50 text-rose-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600 max-w-xs sm:max-w-md break-words">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
