import React, { useEffect, useState } from 'react';
import { Users, Map, LogOut, ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import { AdminParcelIndex } from './AdminParcelIndex';

interface AdminViewProps { onSignOut: () => void; }

interface OwnerSubmission {
  id: string; email?: string; address?: string; zip?: string;
  goal?: string; financialPath?: string; rentEstimate?: number;
  feasible?: boolean | null; zoning?: string; lotArea?: string; existingUnits?: number; recommendedAdu?: string;
  createdAt: string;
}

export function AdminView({ onSignOut }: AdminViewProps) {
  const [tab, setTab] = useState<'submissions' | 'parcels'>('submissions');
  const [subs, setSubs] = useState<OwnerSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    const base = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
    fetch(`${base}/api/submissions`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d) => setSubs(Array.isArray(d?.submissions) ? d.submissions : []))
      .catch(() => setError('Could not load submissions'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (tab === 'submissions') load(); }, [tab]);

  const fmtDate = (s: string) => { try { return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return s; } };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white"><ShieldCheck className="w-4 h-4" /></div>
          <span className="text-[15px] font-bold text-slate-900">XBuild Admin</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold">@xhomes.us</span>
        </div>
        <nav className="flex items-center gap-1 ml-4">
          <button onClick={() => setTab('submissions')} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 ${tab === 'submissions' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users className="w-3.5 h-3.5" /> Owner Submissions
          </button>
          <button onClick={() => setTab('parcels')} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 ${tab === 'parcels' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Map className="w-3.5 h-3.5" /> Parcel Index
          </button>
        </nav>
        <button onClick={onSignOut} className="ml-auto px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {tab === 'submissions' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div>
                <h1 className="text-[24px] font-bold text-slate-900">Owner Submissions</h1>
                <p className="text-[13px] text-slate-400 mt-1">Property owners who entered an address and started a project. Builders work from these via admin.</p>
              </div>
              <button onClick={load} className="ml-auto px-3 py-2 rounded-lg text-[13px] font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {error && <p className="text-[13px] text-red-500 mb-4">{error}</p>}

            {subs.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                <p className="text-[14px] font-medium text-slate-600">No submissions yet.</p>
                <p className="text-[12px] text-slate-400 mt-1">When an owner enters their address and starts a project, it appears here.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      {['Submitted', 'Owner email', 'Address', 'Feasible', 'Zoning', 'Lot area', 'Path', 'Links'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-[12px] text-slate-400">{fmtDate(s.createdAt)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{s.email || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-700">{s.address || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3">
                          {s.feasible === true ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">Feasible</span>
                          ) : s.feasible === false ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500">Not feasible</span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-slate-500">{s.zoning || '—'}</td>
                        <td className="px-4 py-3 text-[12px] text-slate-500 tabular-nums">{s.lotArea ? `${s.lotArea} sqft` : '—'}</td>
                        <td className="px-4 py-3">
                          {s.financialPath && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.financialPath === 'freeBuild' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#2B7FFF]/8 text-[#2B7FFF]'}`}>
                              {s.financialPath === 'freeBuild' ? 'Free Build' : 'Self-Funded'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.address && (
                            <a href={`https://gismaps.kingcounty.gov/parcelviewer2/?address=${encodeURIComponent(s.address)}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#2B7FFF]" title="King County GIS"><ExternalLink className="w-4 h-4" /></a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'parcels' && (
          <>
            <div className="mb-6">
              <h1 className="text-[24px] font-bold text-slate-900">Seattle DADU Master Parcel Index</h1>
              <p className="text-[13px] text-slate-400 mt-1">Reference list · top 500 candidate parcels by rank · HB 1337 baseline.</p>
            </div>
            <AdminParcelIndex />
          </>
        )}
      </main>
    </div>
  );
}
