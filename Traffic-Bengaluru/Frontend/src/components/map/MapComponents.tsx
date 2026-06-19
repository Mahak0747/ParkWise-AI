import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import type { HotspotItem, Severity } from '../../types'
import { SEVERITY_COLORS } from '../../types'

// ─── Fix Leaflet default icon (must be called once) ───────────────────────────

let iconFixed = false
export function fixLeafletIcon() {
  if (iconFixed) return
  iconFixed = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// ─── Marker sizing by severity ────────────────────────────────────────────────

function markerSize(severity: Severity): number {
  return { Critical: 20, High: 16, Medium: 13, Low: 10 }[severity] ?? 12
}

function buildIcon(hotspot: HotspotItem): L.DivIcon {
  const color = SEVERITY_COLORS[hotspot.severity] ?? '#64748B'
  const size = markerSize(hotspot.severity)
  const glow = hotspot.severity === 'Critical' || hotspot.severity === 'High'

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:50%;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.18)${glow ? `,0 0 ${size + 4}px ${color}70` : ''};
      cursor:pointer;
      transition:transform .15s ease;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// ─── HotspotMarkerLayer ───────────────────────────────────────────────────────
// Renders Leaflet marker for each hotspot imperatively (avoids Leaflet/React
// reconciliation issues with large marker sets).

interface HotspotMarkerLayerProps {
  hotspots: HotspotItem[]
  onSelect: (h: HotspotItem) => void
  selectedId?: string | null
}

export function HotspotMarkerLayer({
  hotspots,
  onSelect,
  selectedId,
}: HotspotMarkerLayerProps) {
  const map = useMap()
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    // Clear previous layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    const layer = L.layerGroup()

    hotspots.forEach((h) => {
      const icon = buildIcon(h)
      const marker = L.marker([h.latitude, h.longitude], { icon })

      marker.on('click', () => onSelect(h))
      marker.on('mouseover', () => {
        const el = marker.getElement()
        if (el) el.querySelector('div')!.style.transform = 'scale(1.4)'
      })
      marker.on('mouseout', () => {
        const el = marker.getElement()
        if (el) el.querySelector('div')!.style.transform = 'scale(1)'
      })

      // Pulse ring for selected marker
      if (h.hotspot_id === selectedId) {
        const color = SEVERITY_COLORS[h.severity]
        const size = markerSize(h.severity) + 10
        const pulseIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:${size}px;height:${size}px;
            border-radius:50%;
            border:2px solid ${color};
            opacity:.6;
            animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })
        L.marker([h.latitude, h.longitude], { icon: pulseIcon, interactive: false }).addTo(layer)
      }

      marker.addTo(layer)
    })

    layer.addTo(map)
    layerRef.current = layer

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [hotspots, map, onSelect, selectedId])

  return null
}

// ─── MapOverlayStats ──────────────────────────────────────────────────────────
// Severity count overlay card — rendered as HTML over the Leaflet map.

interface MapOverlayStatsProps {
  hotspots: HotspotItem[]
}

export function MapOverlayStats({ hotspots }: MapOverlayStatsProps) {
  const severities: Severity[] = ['Critical', 'High', 'Medium', 'Low']

  return (
    <div
      className="absolute top-3 left-3 z-[1000] glass p-3 space-y-1.5"
      style={{ minWidth: '130px' }}
    >
      {severities.map((s) => {
        const count = hotspots.filter((h) => h.severity === s).length
        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: SEVERITY_COLORS[s],
                boxShadow: `0 0 5px ${SEVERITY_COLORS[s]}60`,
              }}
            />
            <span className="text-slate-400 text-xs">{s}</span>
            <span className="text-white font-mono text-xs ml-auto pl-3">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── BengaluruBounds ──────────────────────────────────────────────────────────
// Center: 12.9716, 77.5946 — used as default map center

export const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946]
export const BENGALURU_ZOOM = 12
