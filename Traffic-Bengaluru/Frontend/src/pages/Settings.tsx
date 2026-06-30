import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Server, Database, Cpu, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { fetchHealth, fetchOverview, fetchAnalytics } from '../services/api'
import type { HealthResponse, OverviewResponse, AnalyticsResponse } from '../types'
import { GlassCard, LoadingSpinner, StatRow } from '../components/cards/SharedUI'

export default function Settings() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const [h, o, a] = await Promise.all([
        fetchHealth(),
        fetchOverview(),
        fetchAnalytics(),
      ])
      setHealth(h)
      setOverview(o)
      setAnalytics(a)
    } catch {
      // backend might not be running
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const refresh = () => {
    setRefreshing(true)
    load()
  }

  if (loading) return <LoadingSpinner message="Checking backend status..." />

  const backendOnline = health?.status === 'ok'

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <SettingsIcon size={18} className="text-accent" />
            System Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Backend configuration and live system status</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </motion.div>

      {/* Backend status */}
      <GlassCard delay={0.1} className={backendOnline ? '!border-low/25' : '!border-critical/25'}>
        <div className="flex items-center gap-3 mb-4">
          <Server size={15} className={backendOnline ? 'text-low' : 'text-critical'} />
          <h2 className="text-sm font-semibold text-white">Backend Status</h2>
          <div className={`ml-auto flex items-center gap-2 ${backendOnline ? 'text-low' : 'text-critical'}`}>
            {backendOnline ? <CheckCircle size={14} /> : <XCircle size={14} />}
            <span className="text-sm font-medium">{backendOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div className="space-y-0">
          <StatRow label="Status" value={health?.status ?? 'Unreachable'} />
          <StatRow label="Host" value="localhost:8000" mono />
          <StatRow label="API Base" value="/api/*" mono />
          <StatRow label="Framework" value="FastAPI + Uvicorn" />
          <StatRow label="CORS" value="Enabled (all origins)" />
        </div>
      </GlassCard>

      {/* ML model status */}
      <GlassCard delay={0.15}>
        <div className="flex items-center gap-3 mb-4">
          <Cpu size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-white">ML Model Status</h2>
        </div>
        <div className="space-y-0">
          <StatRow
            label="Model Loaded"
            value={health?.model_loaded ? '✓ Yes' : '✗ No'}
          />
          <StatRow label="Model Name" value="GradientBoostingClassifier" />
          <StatRow label="Model File" value="model.pkl" mono />
          <StatRow label="Scikit-learn Version" value="1.5.2" mono />
          <StatRow label="Feature Columns" value="16" mono />
          <StatRow label="Label Classes" value="Low · Medium · High · Critical" />
          <StatRow label="Best F1 Score" value="99.11%" mono />
        </div>
      </GlassCard>

      {/* Cache status */}
      <GlassCard delay={0.2}>
        <div className="flex items-center gap-3 mb-4">
          <Database size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-white">Data Cache Status</h2>
        </div>
        <div className="space-y-0">
          <StatRow
            label="Cache Loaded"
            value={health?.cache_loaded ? '✓ Active' : '✗ Not loaded'}
          />
          <StatRow
            label="Dataset Rows"
            value={analytics ? analytics.total_violations.toLocaleString('en-IN') : '298,450'}
          />
          <StatRow label="Cache File" value="processed_violations.parquet" mono />
          <StatRow label="Cache Size" value="~16 MB" />
          <StatRow label="Build Time (first run)" value="~17 minutes" />
          <StatRow label="Load Time (cached)" value="~25 seconds" />
          <StatRow
            label="Hotspot Clusters"
            value={overview ? `~18,000 total · top 75 served` : '~18,000'}
          />
          <StatRow label="Police Stations" value="55 stations" />
          <StatRow label="Date Range" value="Nov 2023 – May 2024" />
        </div>
      </GlassCard>

      {/* API endpoints reference */}
      <GlassCard delay={0.25}>
        <div className="flex items-center gap-3 mb-4">
          <Server size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-white">Available API Endpoints</h2>
        </div>
        <div className="space-y-2">
          {[
            { method: 'GET', path: '/health', desc: 'Backend health check' },
            { method: 'GET', path: '/api/overview', desc: 'Command center KPIs' },
            { method: 'GET', path: '/api/hotspots', desc: 'Top priority hotspot clusters (max 100)' },
            { method: 'GET', path: '/api/analytics', desc: 'Aggregated violation analytics' },
            { method: 'POST', path: '/api/predict', desc: 'Real-time single inference' },
          ].map(({ method, path, desc }) => (
            <div key={path} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${method === 'POST'
                    ? 'bg-high/20 text-high'
                    : 'bg-low/20 text-low'
                  }`}
              >
                {method}
              </span>
              <span className="font-mono text-slate-300 text-xs">{path}</span>
              <span className="text-slate-500 text-xs ml-auto text-right">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs mt-3">
          Interactive docs: <code className="font-mono bg-white/5 px-1 rounded">http://localhost:8000/docs</code>
        </p>
      </GlassCard>
    </div>
  )
}
