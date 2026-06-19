import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  MapPin,
  Users,
  TrendingDown,
  Activity,
  ArrowRight,
  Zap,
  Shield,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import KpiCard from '../components/cards/KpiCard'
import { GlassCard, SeverityBadge, LoadingSpinner, ErrorState } from '../components/cards/SharedUI'
import { fetchOverview, fetchHotspots } from '../services/api'
import type { OverviewResponse, HotspotItem } from '../types'

export default function Dashboard() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [hotspots, setHotspots] = useState<HotspotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [ov, hs] = await Promise.all([
          fetchOverview(),
          fetchHotspots({ limit: 5, min_severity: 'Critical' }),
        ])
        setOverview(ov)
        setHotspots(hs.hotspots)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load dashboard data'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <LoadingSpinner message="Loading command center data..." />
  if (error) return <ErrorState message={error} />
  if (!overview) return null

  const kpis = [
    {
      label: 'Active Violations',
      value: overview.active_violations,
      icon: AlertTriangle,
      color: '#EF4444',
      subtitle: 'High + Critical severity',
      delay: 0,
    },
    {
      label: 'Critical Hotspots',
      value: overview.critical_hotspots,
      icon: MapPin,
      color: '#F97316',
      subtitle: 'Grid clusters at max alert',
      delay: 0.1,
    },
    {
      label: 'Officers Deployed',
      value: overview.officers_deployed,
      icon: Users,
      color: '#3B82F6',
      subtitle: 'Available + on active duty',
      delay: 0.2,
    },
    {
      label: 'Average PCI Score',
      value: overview.average_pci,
      icon: Activity,
      color: '#FACC15',
      format: 'decimal' as const,
      subtitle: 'Parking Congestion Index (0–100)',
      delay: 0.3,
    },
    {
      label: 'Congestion Reduction',
      value: overview.estimated_congestion_reduction_pct,
      icon: TrendingDown,
      color: '#22C55E',
      format: 'percent' as const,
      subtitle: 'If critical hotspots enforced',
      delay: 0.4,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-accent" />
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Enforcement Command Center
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Live intelligence from 298,450 violation records · GradientBoosting model (99.2% F1)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-low opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-low" />
          </span>
          <span className="text-low text-xs font-medium">Live</span>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top critical hotspots */}
        <GlassCard delay={0.3}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-critical" />
              <h2 className="text-sm font-semibold text-white">Top Critical Hotspots</h2>
            </div>
            <Link
              to="/map"
              className="text-accent text-xs flex items-center gap-1 hover:text-blue-300 transition-colors"
            >
              View map <ArrowRight size={12} />
            </Link>
          </div>
          {hotspots.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No critical hotspots found</p>
          ) : (
            <div className="space-y-2">
              {hotspots.map((h, i) => (
                <motion.div
                  key={h.hotspot_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-slate-600 font-mono text-xs w-5 flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium truncate max-w-44">
                        {h.location_label}
                      </p>
                      <p className="text-slate-500 text-xs truncate">{h.police_station}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-slate-400 font-mono text-xs">
                      {h.violation_count.toLocaleString('en-IN')}
                    </span>
                    <SeverityBadge severity={h.severity} size="sm" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* System status */}
        <GlassCard delay={0.35}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-accent" />
            <h2 className="text-sm font-semibold text-white">System Intelligence</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'ML Model',
                value: 'GradientBoosting',
                status: 'Loaded',
                statusColor: 'text-low',
              },
              {
                label: 'Violation Cache',
                value: '298,450 rows',
                status: 'Active',
                statusColor: 'text-low',
              },
              {
                label: 'Model F1 Score',
                value: '99.11%',
                status: 'Best',
                statusColor: 'text-accent',
              },
              {
                label: 'Hotspot Clusters',
                value: '~18,000',
                status: 'Indexed',
                statusColor: 'text-low',
              },
              {
                label: 'Police Stations',
                value: '55 stations',
                status: 'Bengaluru',
                statusColor: 'text-slate-400',
              },
              {
                label: 'Coverage Period',
                value: 'Nov 2023 – May 2024',
                status: '6 months',
                statusColor: 'text-slate-400',
              },
            ].map(({ label, value, status, statusColor }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-slate-500 text-xs">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-medium font-mono">{value}</span>
                  <span className={`text-xs ${statusColor}`}>· {status}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Enforcement action legend */}
      <GlassCard delay={0.45} className="!p-4">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            Enforcement Levels
          </span>
          {[
            { label: 'Low — Warning Only', color: '#22C55E' },
            { label: 'Medium — Send Notification', color: '#FACC15' },
            { label: 'High — Issue e-Challan', color: '#F97316' },
            { label: 'Critical — Tow + Deploy Officer', color: '#EF4444' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
              />
              <span className="text-slate-400 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
