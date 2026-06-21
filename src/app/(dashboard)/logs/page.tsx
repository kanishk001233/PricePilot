'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Clock, 
  Shield, 
  User, 
  Sliders, 
  HelpCircle, 
  Package,
  Activity,
  CheckCircle2
} from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState<string>('Viewer');

  const fetchLogs = async () => {
    try {
      // Fetch session
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setUserRole(meData.user.role);
      }

      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('LOGIN')) return 'bg-emerald-950/40 text-emerald-400 border-emerald-900/20';
    if (action.includes('APPROVE')) return 'bg-indigo-950/40 text-indigo-400 border-indigo-900/20';
    if (action.includes('REJECT')) return 'bg-rose-950/40 text-rose-400 border-rose-900/20';
    if (action.includes('RULE')) return 'bg-violet-950/40 text-violet-400 border-violet-900/20';
    if (action.includes('PRODUCT')) return 'bg-amber-950/40 text-amber-400 border-amber-900/20';
    return 'bg-slate-800 text-slate-400 border-slate-700/50';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return <User className="w-3.5 h-3.5" />;
    if (action.includes('RULE')) return <Sliders className="w-3.5 h-3.5" />;
    if (action.includes('PRODUCT')) return <Package className="w-3.5 h-3.5" />;
    if (action.includes('RECOMMENDATION')) return <Activity className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.userEmail.toLowerCase().includes(search.toLowerCase()) || 
                          log.action.toLowerCase().includes(search.toLowerCase()) ||
                          log.details.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });
 
  const approvedCount = logs.filter(log => log.action.includes('APPROVE')).length;
  const rejectedCount = logs.filter(log => log.action.includes('REJECT')).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">System Audit Trail</h1>
          <p className="text-slate-400 text-sm mt-0.5">Chronological ledger of security sessions, rule modifications, and price overrides.</p>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 flex items-center gap-4 text-left">
          <div className="p-2.5 rounded-lg audit-stats-icon-approved border border-emerald-900/30 dark:border-emerald-900/30 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Approved Recommendations</span>
            <span className="text-xl font-black audit-stats-count">{approvedCount}</span>
          </div>
        </div>
        
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 flex items-center gap-4 text-left">
          <div className="p-2.5 rounded-lg audit-stats-icon-rejected border border-rose-900/30 dark:border-rose-900/30 text-rose-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Rejected Recommendations</span>
            <span className="text-xl font-black audit-stats-count">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter search bar */}
      <div className="relative p-3.5 rounded-2xl border border-slate-800 bg-slate-900/20">
        <Search className="absolute left-7 top-6 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter logs by user email, action name, or details query..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:border-indigo-600 focus:outline-none transition-all"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-slate-500 text-xs">Querying audit logs ledgers...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-700 animate-pulse" />
            <p className="text-xs font-semibold">No logs match search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">User Identity</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                  <th className="px-6 py-4 font-semibold">Operation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/10 transition-colors">
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 flex items-center gap-2 mt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </td>

                    {/* User */}
                    <td className="px-6 py-4 font-medium text-slate-200">{log.userEmail}</td>

                    {/* Action */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[9px] font-bold tracking-wide ${getActionBadgeColor(log.action)}`}>
                        {getActionIcon(log.action)}
                        {log.action}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="px-6 py-4 text-slate-300 font-medium leading-relaxed text-left">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
