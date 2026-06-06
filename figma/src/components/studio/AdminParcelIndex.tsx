import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ExternalLink, MapPin, Building2, List, Map as MapIcon, FileText } from 'lucide-react';
import {
  PARCEL_INDEX, googleMapsLink, streetViewLink, kingCountyLink, seattleGisLink, type ParcelRow,
} from './parcelIndex';

type SortKey = 'rank' | 'rent' | 'tier' | 'address';

const familyPill: Record<string, string> = {
  warm: 'bg-amber-100 text-amber-700',
  cool: 'bg-sky-100 text-sky-700',
  light: 'bg-slate-100 text-slate-600',
  dark: 'bg-slate-700 text-slate-100',
  uncertain: 'bg-slate-100 text-slate-400',
};

function LinkIcons({ p }: { p: ParcelRow }) {
  const L = (href: string, title: string, children: React.ReactNode) => (
    <a href={href} target="_blank" rel="noopener noreferrer" title={title} className="text-slate-400 hover:text-[#2B7FFF]">{children}</a>
  );
  return (
    <div className="flex items-center gap-2">
      {L(streetViewLink(p), 'Google Street View', <MapPin className="w-4 h-4" />)}
      {L(googleMapsLink(p), 'Google Maps', <ExternalLink className="w-4 h-4" />)}
      {L(kingCountyLink(p), 'King County Parcel Viewer', <Building2 className="w-4 h-4" />)}
      {L(seattleGisLink(p), 'Seattle SDCI / GIS', <FileText className="w-4 h-4" />)}
    </div>
  );
}

export function AdminParcelIndex() {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<'all' | 'Tier A' | 'Tier B'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [view, setView] = useState<'list' | 'map'>('list');

  const rows = useMemo(() => {
    let r = PARCEL_INDEX.filter((p) => {
      if (tier !== 'all' && p.tier !== tier) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!p.address.toLowerCase().includes(s) && !p.apn.includes(s) && !p.zone.toLowerCase().includes(s)) return false;
      }
      return true;
    });
    r = [...r].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'rank') cmp = a.rank - b.rank;
      else if (sortKey === 'rent') cmp = a.rent - b.rent;
      else if (sortKey === 'tier') cmp = a.tier.localeCompare(b.tier);
      else cmp = a.address.localeCompare(b.address);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [q, tier, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'rent' ? 'desc' : 'asc'); }
  };
  const tierCount = (t: string) => PARCEL_INDEX.filter((p) => p.tier === t).length;
  const fmt = (n: number) => '$' + n.toLocaleString();
  const perUnit = (p: ParcelRow) => { const n = parseInt(p.recAdu, 10); return n > 1 && p.rent ? `${n} × ${fmt(Math.round(p.rent / n))}` : null; };

  const Th = ({ label, k }: { label: string; k?: SortKey }) => (
    <th onClick={k ? () => toggleSort(k) : undefined}
      className={`px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${k ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}>
      {label}{k && sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        {[['500', 'Candidate parcels'], [String(tierCount('Tier A')), 'Tier A · 2 DADU'], [String(tierCount('Tier B')), 'Tier B · 1 DADU'], ['HB 1337', 'Baseline compliance']].map(([v, l]) => (
          <div key={l} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200">
            <p className="text-[16px] font-bold text-slate-800 leading-none">{v}</p>
            <p className="text-[11px] text-slate-400 mt-1">{l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search address, APN, or zone…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-700" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'Tier A', 'Tier B'] as const).map((t) => (
            <button key={t} onClick={() => setTier(t)}
              className={`px-3 py-2 rounded-lg text-[12px] font-semibold border ${tier === t ? 'bg-[#2B7FFF] text-white border-[#2B7FFF]' : 'bg-white text-slate-500 border-slate-200'}`}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
        {/* List / Map toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button onClick={() => setView('list')} className={`px-3 py-2 text-[12px] font-semibold flex items-center gap-1.5 ${view === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}><List className="w-3.5 h-3.5" /> List</button>
          <button onClick={() => setView('map')} className={`px-3 py-2 text-[12px] font-semibold flex items-center gap-1.5 ${view === 'map' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}><MapIcon className="w-3.5 h-3.5" /> Map</button>
        </div>
        <span className="text-[12px] text-slate-400">{rows.length} of 500</span>
      </div>

      {view === 'map' ? (
        <ParcelMap rows={rows} fmt={fmt} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200">
                  <Th label="#" k="rank" /><Th label="Address" k="address" /><Th label="APN" /><Th label="Zone" />
                  <Th label="Tier" k="tier" /><Th label="House Color" /><Th label="Rec Finish" />
                  <Th label="Est. Rent" k="rent" /><Th label="DADUs" /><Th label="Lot sqft" /><Th label="Links" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.apn + p.rank} className="border-b border-slate-100 hover:bg-slate-50/60 align-top">
                    <td className="px-3 py-2.5 text-[12px] text-slate-400 tabular-nums">{p.rank}</td>
                    <td className="px-3 py-2.5 text-[13px] font-medium text-slate-700">{p.address}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500 tabular-nums">{p.apn}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{p.zone}</td>
                    <td className="px-3 py-2.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.tier === 'Tier A' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#2B7FFF]/8 text-[#2B7FFF]'}`}>{p.tier}</span></td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        {p.hex && <span className="w-3 h-3 rounded-sm border border-slate-200 shrink-0" style={{ background: p.hex }} />}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${familyPill[p.family] || 'bg-slate-100 text-slate-500'}`}>{p.family}</span>
                      </div>
                      {p.note && <p className="text-[10px] text-slate-400 mt-1 leading-snug line-clamp-2">{p.note}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-slate-600 border border-slate-200">
                        {p.finishHex && <span className="w-2.5 h-2.5 rounded-sm border border-slate-200" style={{ background: p.finishHex }} />}
                        {p.finish}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[13px] font-bold text-slate-700 tabular-nums">{fmt(p.rent)}<span className="text-[10px] text-slate-400 font-normal">/mo</span></span>
                      {perUnit(p) && <div className="text-[10px] text-slate-400 tabular-nums">{perUnit(p)}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500 text-center">{p.recAdu}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500 tabular-nums">{p.lotSqft}</td>
                    <td className="px-3 py-2.5"><LinkIcons p={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-400 mt-3">Top 500 by rank · links open Google Street View / Maps, King County Parcel Viewer, and Seattle SDCI/GIS in a new tab.</p>
    </div>
  );
}

// ── Interactive map (Leaflet loaded from CDN at runtime) ──────────────────────
function ParcelMap({ rows, fmt }: { rows: ParcelRow[]; fmt: (n: number) => string }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // load Leaflet once
  useEffect(() => {
    const w = window as any;
    if (w.L) { setReady(true); return; }
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      css.setAttribute('data-leaflet', '1'); document.head.appendChild(css);
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);

  // init map
  useEffect(() => {
    if (!ready || !elRef.current) return;
    const L = (window as any).L;
    if (!mapRef.current) {
      mapRef.current = L.map(elRef.current).setView([47.61, -122.33], 11);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '© OpenStreetMap, © CARTO' }).addTo(mapRef.current);
    }
  }, [ready]);

  // plot markers when rows change
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;
    if (layerRef.current) layerRef.current.remove();
    const layer = L.layerGroup();
    const pts: [number, number][] = [];
    rows.forEach((p) => {
      if (!p.lat || !p.lng) return;
      pts.push([p.lat, p.lng]);
      const color = p.tier === 'Tier A' ? '#10b981' : '#2B7FFF';
      const m = L.circleMarker([p.lat, p.lng], { radius: 6, color, weight: 1.5, fillColor: color, fillOpacity: 0.6 });
      m.bindPopup(
        `<div style="font:13px system-ui;min-width:180px">
          <strong>${p.address}</strong><br/>
          <span style="color:#64748b">${p.zone} · ${p.tier} · ${p.recAdu} DADU</span><br/>
          <span style="color:#0f172a;font-weight:700">${fmt(p.rent)}/mo</span><br/>
          <a href="${googleMapsLink(p)}" target="_blank">Maps</a> ·
          <a href="${kingCountyLink(p)}" target="_blank">King County</a> ·
          <a href="${seattleGisLink(p)}" target="_blank">SDCI</a>
        </div>`
      );
      layer.addLayer(m);
    });
    layer.addTo(mapRef.current);
    layerRef.current = layer;
    if (pts.length) { try { mapRef.current.fitBounds(pts, { padding: [30, 30], maxZoom: 14 }); } catch { /* noop */ } }
  }, [ready, rows, fmt]);

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      {!ready && <div className="h-[600px] flex items-center justify-center text-[13px] text-slate-400">Loading map…</div>}
      <div ref={elRef} style={{ height: 600, width: '100%', display: ready ? 'block' : 'none' }} />
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10b981' }} /> Tier A (2 DADU)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2B7FFF' }} /> Tier B (1 DADU)</span>
        <span className="ml-auto">{rows.length} parcels plotted</span>
      </div>
    </div>
  );
}
