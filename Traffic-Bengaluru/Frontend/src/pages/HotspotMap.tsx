import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { X, Filter, MapPin, Shield, Target, Activity } from 'lucide-react'
import { fetchHotspots } from '../services/api'
import type { HotspotItem } from '../types'
import { SEVERITY_COLORS } from '../types'
import { SeverityBadge, LoadingSpinner, ErrorState } from '../components/cards/SharedUI'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946]

// Component to add markers imperatively
function HotspotMarkers({
  hotspots,
  onSelect,
}: {
  hotspots: HotspotItem[]
  onSelect: (h: HotspotItem) => void
}) {
  const map = useMap()
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }
    const layer = L.layerGroup().addTo(map)
    layerRef.current = layer

    hotspots.forEach((h) => {
      const color = SEVERITY_COLORS[h.severity] || '#64748B'
      const size = h.severity === 'Critical' ? 18 : h.severity === 'High' ? 15 : 12
      const icon = L.divIcon({
        className: '',
        html: `<div class="hotspot-marker" style="
          width:${size}px;height:${size}px;
          background:${color};
          box-shadow:0 0 0 2px rgba(255,255,255,0.2),0 0 ${size}px ${color}60;
          border-radius:50%;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      const marker = L.marker([h.latitude, h.longitude], { icon })
      marker.on('click', () => onSelect(h))
      marker.addTo(layer)
    })

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
      }
    }
  }, [hotspots, map, onSelect])

  return null
}

const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low']

export default function HotspotMap() {
  const [hotspots, setHotspots] = useState<HotspotItem[]>([])
  const [filtered, setFiltered] = useState<HotspotItem[]>([])
  const [selected, setSelected] = useState<HotspotItem | null>(null)
  const [severityFilter, setSeverityFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalClusters, setTotalClusters] = useState(0)

  useEffect(() => {
    fetchHotspots({ limit: 100 })
      .then((res) => {
        setHotspots(res.hotspots)
        setFiltered(res.hotspots)
        setTotalClusters(res.total_clusters)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (severityFilter === 'All') {
      setFiltered(hotspots)
    } else {
      setFiltered(hotspots.filter((h) => h.severity === severityFilter))
    }
  }, [severityFilter, hotspots])

  const top10 = [...hotspots]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 10)

  if (loading) return <LoadingSpinner message="Loading hotspot data from backend..." />
  if (error) return <ErrorState message={error} />

  return (
    <div className="min-h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <MapPin size={18} className="text-accent " />
            Illegal Parking Hotspot Map
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Showing {filtered.length} of {totalClusters.toLocaleString('en-IN')} clusters · Bengaluru, Karnataka
          </p>
        </div>
        {/* Severity filter */}
        <div className="hidden md:flex items-center gap-2">
          <Filter size={13} className="text-slate-500" />
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                severityFilter === s
                  ? 'bg-accent/20 text-accent border-accent/40'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
{/* Mobile Severity Filter */}
<div className="md:hidden glass p-3">
  <div className="flex items-center gap-2 mb-3">
    <Filter size={13} className="text-slate-500" />
    <span className="text-xs text-white font-semibold">
      Filter Severity
    </span>
  </div>

  <div className="flex flex-wrap gap-2">
    {SEVERITIES.map((s) => (
      <button
        key={s}
        onClick={() => setSeverityFilter(s)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
          severityFilter === s
            ? 'bg-accent/20 text-accent border-accent/40'
            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
        }`}
      >
        {s}
      </button>
    ))}
  </div>
</div>
      {/* Main layout: map + side panel */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Map */}
        <div className="w-full md:flex-1 h-[350px] md:h-auto rounded-xl overflow-hidden border border-white/8 relative">
          <MapContainer
            center={BENGALURU_CENTER}
            zoom={12}
            style={{ height: '100%', width: '100%', background: '#0B1120' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <HotspotMarkers hotspots={filtered} onSelect={setSelected} />
          </MapContainer>
          
          {/* Map overlay stats */}
          <div className="absolute top-3 left-3 glass p-3 z-[1000] space-y-1 text-xs">
            {(['Critical', 'High', 'Medium', 'Low'] as const).map((s) => {
              const count = filtered.filter((h) => h.severity === s).length
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: SEVERITY_COLORS[s] }}
                  />
                  <span className="text-slate-400">{s}</span>
                  <span className="text-white font-mono ml-auto pl-4">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Side panel: top hotspots */}
        <div className="w-full md:w-72 flex flex-col gap-3">
          <div className="glass p-3 flex-shrink-0">
            <p className="text-xs font-semibold text-white mb-1 flex items-center gap-2">
              <Target size={13} className="text-critical" />
              Top Priority Hotspots
            </p>
            <p className="text-slate-600 text-xs">By priority score · click to inspect</p>
          </div>
          {top10.map((h, i) => (
            <motion.div
              key={h.hotspot_id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(h)}
              className={`glass p-3 cursor-pointer hover:border-white/15 transition-all ${
                selected?.hotspot_id === h.hotspot_id ? 'border-accent/40 bg-accent/5' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-mono text-xs w-4">{i + 1}</span>
                  <SeverityBadge severity={h.severity} size="sm" />
                </div>
                <span className="text-slate-500 font-mono text-xs">
                  {h.priority_score.toFixed(0)}
                </span>
              </div>
              <p className="text-white text-xs font-medium truncate">{h.location_label}</p>
              <p className="text-slate-500 text-xs truncate">{h.police_station}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-slate-400 text-xs">
                  {h.violation_count.toLocaleString('en-IN')} violations
                </span>
                <span className="text-slate-500 text-xs">
                  {(h.confidence * 100).toFixed(0)}% conf.
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail popup */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-4 right-4 md:left-80 md:right-8 z-[9999] glass-strong p-5"
            style={{ maxWidth: '640px' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={selected.severity} />
                  <span className="text-slate-500 text-xs">· {selected.police_station}</span>
                </div>
                <h3 className="text-white font-semibold">{selected.location_label}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Violations', value: selected.violation_count.toLocaleString('en-IN') },
                { label: 'Confidence', value: `${(selected.confidence * 100).toFixed(1)}%` },
                { label: 'PCI Score', value: selected.pci_score.toFixed(1) },
                { label: 'Priority Score', value: selected.priority_score.toFixed(1) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-slate-500 text-xs">{label}</p>
                  <p className="text-white font-mono text-sm font-semibold mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/8">
              <Activity size={14} className="text-accent flex-shrink-0" />
              <div>
                <p className="text-white text-xs font-semibold">
                  {selected.recommendation.icon} {selected.recommendation.action}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{selected.recommendation.message}</p>
              </div>
              <div className="ml-auto flex gap-2 flex-shrink-0">
                {selected.recommendation.challan && (
                  <span className="text-xs px-2 py-0.5 rounded bg-high/20 text-high border border-high/30">Challan</span>
                )}
                {selected.recommendation.towing && (
                  <span className="text-xs px-2 py-0.5 rounded bg-critical/20 text-critical border border-critical/30">Tow</span>
                )}
                {selected.recommendation.officer && (
                  <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">Officer</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Shield size={12} className="text-slate-600" />
              <p className="text-slate-500 text-xs">
                Coordinates: {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                {' '}· ID: {selected.hotspot_id}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
