import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { BarChart3, TrendingUp, PieChart as PieIcon, Building2 } from 'lucide-react'
import { fetchAnalytics } from '../services/api'
import type { AnalyticsResponse } from '../types'
import { SEVERITY_COLORS } from '../types'
import { GlassCard, LoadingSpinner, ErrorState } from '../components/cards/SharedUI'

const CHART_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#FACC15', '#A78BFA']

const tooltipStyle = {
  labelStyle: {
    color: '#94A3B8',
    fontSize: '12px',
    fontWeight: 500,
  },
  itemStyle: {
    color: '#3B82F6',
    fontSize: '12px',
  },
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner message="Loading analytics data..." />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  // Prepare pie data for severity
  const pieData = Object.entries(data.severity_distribution).map(([name, value]) => ({
    name,
    value,
    color: SEVERITY_COLORS[name as keyof typeof SEVERITY_COLORS] || '#64748B',
  }))

  // Top 10 stations for bar chart
  const topStations = [...data.violations_by_station]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Format hour labels
  const hourData = data.violations_by_hour.map((h) => ({
    ...h,
    label:
      h.hour === 0
        ? '12am'
        : h.hour < 12
          ? `${h.hour}am`
          : h.hour === 12
            ? '12pm'
            : `${h.hour - 12}pm`,
  }))

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <BarChart3 size={18} className="text-accent flex-shrink-0" />
          Violation Analytics
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Aggregated from {data.total_violations.toLocaleString('en-IN')} violations across 55 Bengaluru police stations
        </p>
      </motion.div>

      {/* Row 1: Violations by hour + Severity distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2" delay={0.1}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-white">Violations by Hour of Day</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [v.toLocaleString('en-IN'), 'Violations']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard delay={0.15}>
          <div className="flex items-center gap-2 mb-4">
            <PieIcon size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-white">Severity Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [v.toLocaleString('en-IN'), 'Violations']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-slate-400 text-xs">{name}</span>
                </div>
                <span className="text-white font-mono text-xs">
                  {value.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Row 2: Violations by station (horizontal bar) */}
      <GlassCard delay={0.2}>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={14} className="text-accent" />
          <h2 className="text-sm font-semibold text-white">Top 10 Police Stations by Violations</h2>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={topStations}
            layout="vertical"
            margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fill: '#64748B', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="station"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number) => [v.toLocaleString('en-IN'), 'Violations']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {topStations.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Row 3: Violations by day of week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard delay={0.25}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-white">Violations by Day of Week</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.violations_by_day} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [v.toLocaleString('en-IN'), 'Violations']}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Feature importance */}
        <GlassCard delay={0.3}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-white">Model Feature Importance</h2>
          </div>
          <div className="space-y-2">
            {data.feature_importance.slice(0, 8).map((f, i) => (
              <div key={f.feature} className="flex items-center gap-3">
                <span className="text-slate-500 font-mono text-xs w-4">{i + 1}</span>
                <span className="text-slate-300 text-xs w-44 truncate">{f.feature}</span>
                <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(f.importance / data.feature_importance[0].importance) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                </div>
                <span className="text-slate-400 font-mono text-xs w-12 text-right">
                  {(f.importance * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
