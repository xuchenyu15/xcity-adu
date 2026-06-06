import React, { useEffect, useRef, useState } from 'react';
import { Users, Map as MapIcon, List, LogOut, ShieldCheck, RefreshCw, ExternalLink, Home } from 'lucide-react';
import { AdminParcelIndex } from './AdminParcelIndex';

interface AdminViewProps { onSignOut: () => void; }

interface OwnerSubmission {
  id: string; email?: string; address?: string; zip?: string;
  goal?: string; financialPath?: string; rentEstimate?: number;
  feasible?: boolean | null; zoning?: string; lotArea?: string; existingUnits?: number; recommendedAdu?: string;
  lat?: number | null; lng?: number | null; createdAt: string;
}

// Optional Google Street View Static key (set VITE_STREETVIEW_KEY for street-level photos).
const SV_KEY = (import.meta as any).env?.VITE_STREETVIEW_KEY || '';
function streetViewImg(lat?: number | null, lng?: number | null) {
  if (!lat || !lng || !SV_KEY) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=96x72&location=${lat},${lng}&fov=80&key=${SV_KEY}`;
}
// Keyless free aerial thumbnail via Esri World Imagery (no API key required).
function aerialImg(lat?: number | null, lng?: number | null) {
  if (!lat || !lng) return null;
  const d = 0.0006; // ~65m box around the parcel
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=96,72&format=jpg&f=image`;
}
function streetViewLink(lat?: number | null, lng?: number | null) {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`;
}
function mapsLink(lat?: number | null, lng?: number | null) {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
const fmtMoney = (n?: number) => (n ? '$' + n.toLocaleString() : '—');

function Photo({ s }: { s: OwnerSubmission }) {
  const [mly, setMly] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!s.lat || !s.lng) return;
    let cancelled = false;
    const base = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
    fetch(`${base}/api/streetview?lat=${s.lat}&lng=${s.lng}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d?.url) setMly(d.url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [s.lat, s.lng]);

  const sv = streetViewImg(s.lat, s.lng);              // Google (if VITE key set)
  const aerial = aerialImg(s.lat, s.lng);              // keyless Esri aerial fallback
  const src = mly || sv || aerial;                     // Mapillary street view > Google > aerial
  const link = streetViewLink(s.lat, s.lng) || mapsLink(s.lat, s.lng);
  const isStreet = !!(mly || sv);
  if (src && link) return (
    <a href={link} target="_blank" rel="noopener noreferrer" title={isStreet ? 'Street-level view' : 'Aerial view'}>
      <img src={src} alt={isStreet ? 'street view' : 'aerial'} loading="lazy" className="w-16 h-12 object-cover rounded-md border border-slate-200" />
    </a>
  );
  return <div className="w-16 h-12 rounded-md border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300"><Home className="w-4 h-4" /></div>;
}

export function AdminView({ onSignOut }: AdminViewProps) {
  const [tab, setTab] = useState<'submissions' | 'parcels'>('submissions');
  const [subView, setSubView] = useState<'list' | 'map'>('list');
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
  const feasBadge = (f?: boolean | null) => f === true
    ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">Feasible</span>
    : f === false ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500">Not feasible</span>
    : <span className="text-slate-300">—</span>;
  const pathBadge = (p?: string) => p
    ? <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${p === 'freeBuild' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#2B7FFF]/8 text-[#2B7FFF]'}`}>{p === 'freeBuild' ? 'Free Build' : 'Self-Funded'}</span>
    : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white"><ShieldCheck className="w-4 h-4" /></div>
          <span className="text-[15px] font-bold text-slate-900">XBuild Admin</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold">@xhomes.us</span>
        </div>
        <nav className="flex items-center gap-1 ml-4">
          <button onClick={() => setTab('submissions')} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 ${tab === 'submissions' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><Users className="w-3.5 h-3.5" /> Owner Submissions</button>
          <button onClick={() => setTab('parcels')} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 ${tab === 'parcels' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><MapIcon className="w-3.5 h-3.5" /> Parcel Index</button>
        </nav>
        <button onClick={onSignOut} className="ml-auto px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Sign out</button>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {tab === 'submissions' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div>
                <h1 className="text-[24px] font-bold text-slate-900">Owner Submissions</h1>
                <p className="text-[13px] text-slate-400 mt-1">Property owners who entered an address and started a project. Builders work from these via admin.</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  <button onClick={() => setSubView('list')} className={`px-3 py-2 text-[12px] font-semibold flex items-center gap-1.5 ${subView === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}><List className="w-3.5 h-3.5" /> List</button>
                  <button onClick={() => setSubView('map')} className={`px-3 py-2 text-[12px] font-semibold flex items-center gap-1.5 ${subView === 'map' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}><MapIcon className="w-3.5 h-3.5" /> Map</button>
                </div>
                <button onClick={load} className="px-3 py-2 rounded-lg text-[13px] font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
              </div>
            </div>

            {error && <p className="text-[13px] text-red-500 mb-4">{error}</p>}

            {subs.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                <p className="text-[14px] font-medium text-slate-600">No submissions yet.</p>
                <p className="text-[12px] text-slate-400 mt-1">When an owner enters their address and starts a project, it appears here.</p>
              </div>
            ) : subView === 'map' ? (
              <SubmissionsMap subs={subs} fmtMoney={fmtMoney} />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        {['Submitted', 'Photo', 'Owner email', 'Address', 'ADU type', 'Est. rent', 'Feasible', 'Zoning', 'Lot area', 'Path', 'Links'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subs.map((s) => (
                        <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-[12px] text-slate-400 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                          <td className="px-4 py-3"><Photo s={s} /></td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{s.email || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 text-[13px] font-medium text-slate-700">{s.address || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 text-[12px] text-slate-600">{s.recommendedAdu || 'Detached ADU'}</td>
                          <td className="px-4 py-3 text-[13px] font-bold text-slate-700 tabular-nums">{fmtMoney(s.rentEstimate)}{s.rentEstimate ? <span className="text-[10px] text-slate-400 font-normal">/mo</span> : null}</td>
                          <td className="px-4 py-3">{feasBadge(s.feasible)}</td>
                          <td className="px-4 py-3 text-[12px] text-slate-500">{s.zoning || '—'}</td>
                          <td className="px-4 py-3 text-[12px] text-slate-500 tabular-nums">{s.lotArea ? `${s.lotArea} sqft` : '—'}</td>
                          <td className="px-4 py-3">{pathBadge(s.financialPath)}</td>
                          <td className="px-4 py-3">
                            {s.address && <a href={`https://gismaps.kingcounty.gov/parcelviewer2/?address=${encodeURIComponent(s.address)}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#2B7FFF]" title="King County GIS"><ExternalLink className="w-4 h-4" /></a>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'parcels' && (
          <>
            <div className="mb-6">
              <h1 className="text-[24px] font-bold text-slate-900">Seattle DADU Parcel Index</h1>
              <p className="text-[13px] text-slate-400 mt-1">Internal seed reference · top 500 candidate parcels by rank.</p>
            </div>
            <AdminParcelIndex />
          </>
        )}
      </main>
    </div>
  );
}

// ── Submissions map (Leaflet via CDN) ─────────────────────────────────────────
function SubmissionsMap({ subs, fmtMoney }: { subs: OwnerSubmission[]; fmtMoney: (n?: number) => string }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as any;
    if (w.L) { setReady(true); return; }
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      css.setAttribute('data-leaflet', '1'); document.head.appendChild(css);
    }
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    sc.onload = () => setReady(true); document.body.appendChild(sc);
  }, []);

  useEffect(() => {
    if (!ready || !elRef.current) return;
    const L = (window as any).L;
    if (!mapRef.current) {
      mapRef.current = L.map(elRef.current).setView([47.61, -122.33], 11);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '© OpenStreetMap, © CARTO' }).addTo(mapRef.current);
    }
  }, [ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;
    if (layerRef.current) layerRef.current.remove();
    const layer = L.layerGroup();
    const pts: [number, number][] = [];
    subs.forEach((s) => {
      if (!s.lat || !s.lng) return;
      pts.push([s.lat, s.lng]);
      const color = s.feasible === false ? '#ef4444' : '#10b981';
      const m = L.circleMarker([s.lat, s.lng], { radius: 7, color, weight: 1.5, fillColor: color, fillOpacity: 0.6 });
      m.bindPopup(`<div style="font:13px system-ui;min-width:180px"><strong>${s.address || ''}</strong><br/><span style="color:#64748b">${s.email || ''}</span><br/><span style="color:#0f172a;font-weight:700">${fmtMoney(s.rentEstimate)}/mo</span> · ${s.recommendedAdu || 'Detached ADU'}<br/>${s.feasible === false ? 'Not feasible' : 'Feasible'} · ${s.zoning || ''}</div>`);
      layer.addLayer(m);
    });
    layer.addTo(mapRef.current);
    layerRef.current = layer;
    if (pts.length) { try { mapRef.current.fitBounds(pts, { padding: [40, 40], maxZoom: 13 }); } catch { /* noop */ } }
  }, [ready, subs, fmtMoney]);

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      {!ready && <div className="h-[560px] flex items-center justify-center text-[13px] text-slate-400">Loading map…</div>}
      <div ref={elRef} style={{ height: 560, width: '100%', display: ready ? 'block' : 'none' }} />
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10b981' }} /> Feasible</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }} /> Not feasible</span>
        <span className="ml-auto">{subs.filter((s) => s.lat && s.lng).length} of {subs.length} mapped</span>
      </div>
    </div>
  );
}
