import React, { useMemo, useState } from 'react';
import { Search, ExternalLink, MapPin, Building2, FileText } from 'lucide-react';
import { PARCEL_INDEX, googleMapsLink, kingCountyLink, seattleGisLink, type ParcelRow } from './parcelIndex';

type SortKey = 'rank' | 'rent' | 'tier' | 'address';

// Low-key internal reference: our scraped Seattle seed list of feasible parcels.
// Not a product feature — the product flow is owner-submitted addresses.
export function AdminParcelIndex() {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<'all' | 'Tier A' | 'Tier B'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const rows = useMemo(() => {
    let r = PARCEL_INDEX.filter((p) => {
      if (tier !== 'all' && p.tier !== tier) return false;
      if (q) { const s = q.toLowerCase(); if (!p.address.toLowerCase().includes(s) && !p.apn.includes(s) && !p.zone.toLowerCase().includes(s)) return false; }
      return true;
    });
    return [...r].sort((a, b) => {
      let cmp = sortKey === 'rank' ? a.rank - b.rank : sortKey === 'rent' ? a.rent - b.rent : sortKey === 'tier' ? a.tier.localeCompare(b.tier) : a.address.localeCompare(b.address);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [q, tier, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir(k === 'rent' ? 'desc' : 'asc'); } };
  const fmt = (n: number) => '$' + n.toLocaleString();
  const Th = ({ label, k }: { label: string; k?: SortKey }) => (
    <th onClick={k ? () => toggleSort(k) : undefined} className={`px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${k ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}>
      {label}{k && sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search address, APN, or zone…" className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-700" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'Tier A', 'Tier B'] as const).map((t) => (
            <button key={t} onClick={() => setTier(t)} className={`px-3 py-2 rounded-lg text-[12px] font-semibold border ${tier === t ? 'bg-[#2B7FFF] text-white border-[#2B7FFF]' : 'bg-white text-slate-500 border-slate-200'}`}>{t === 'all' ? 'All' : t}</button>
          ))}
        </div>
        <span className="text-[12px] text-slate-400">{rows.length} of 500</span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200">
                <Th label="#" k="rank" /><Th label="Address" k="address" /><Th label="APN" /><Th label="Zone" />
                <Th label="Tier" k="tier" /><Th label="Est. Rent" k="rent" /><Th label="Lot sqft" /><Th label="Links" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.apn + p.rank} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 text-[12px] text-slate-400 tabular-nums">{p.rank}</td>
                  <td className="px-3 py-2.5 text-[13px] font-medium text-slate-700">{p.address}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500 tabular-nums">{p.apn}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500">{p.zone}</td>
                  <td className="px-3 py-2.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.tier === 'Tier A' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#2B7FFF]/8 text-[#2B7FFF]'}`}>{p.tier}</span></td>
                  <td className="px-3 py-2.5 text-[13px] font-bold text-slate-700 tabular-nums">{fmt(p.rent)}<span className="text-[10px] text-slate-400 font-normal">/mo</span></td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500 tabular-nums">{p.lotSqft}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <a href={googleMapsLink(p)} target="_blank" rel="noopener noreferrer" title="Google Maps" className="text-slate-400 hover:text-[#2B7FFF]"><MapPin className="w-4 h-4" /></a>
                      <a href={kingCountyLink(p)} target="_blank" rel="noopener noreferrer" title="King County" className="text-slate-400 hover:text-[#2B7FFF]"><Building2 className="w-4 h-4" /></a>
                      <a href={seattleGisLink(p)} target="_blank" rel="noopener noreferrer" title="Seattle SDCI/GIS" className="text-slate-400 hover:text-[#2B7FFF]"><FileText className="w-4 h-4" /></a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-3">Internal seed list — our scraped Seattle parcels that pass the geometric fit test. The product flow uses owner-submitted addresses (see Owner Submissions).</p>
    </div>
  );
}
