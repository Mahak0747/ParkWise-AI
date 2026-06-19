import { motion } from 'framer-motion'
import type { Severity } from '../../types'
import { SEVERITY_BG } from '../../types'
import { Loader2 } from 'lucide-react'

// ─── GlassCard ────────────────────────────────────────────────────────────────

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

export function GlassCard({ children, className = '', hover = false, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`glass p-5 ${hover ? 'hover:border-white/12 hover:bg-surface-2/80 transition-all cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  )
}

// ─── SeverityBadge ────────────────────────────────────────────────────────────

interface SeverityBadgeProps {
  severity: string
  size?: 'sm' | 'md'
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const s = severity as Severity
  const cls = SEVERITY_BG[s] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className={`severity-badge border ${cls} ${sizeClass}`}>
      {severity}
    </span>
  )
}

// ─── LoadingSpinner ───────────────────────────────────────────────────────────

export function LoadingSpinner({ message = 'Loading data...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 size={28} className="text-accent animate-spin" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  )
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-full bg-critical/10 flex items-center justify-center">
        <span className="text-critical text-xl">⚠</span>
      </div>
      <p className="text-slate-400 text-sm text-center max-w-sm">{message}</p>
      <p className="text-slate-600 text-xs">Ensure the backend is running on port 8000</p>
    </div>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle, children }: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}

// ─── StatRow ──────────────────────────────────────────────────────────────────

export function StatRow({ label, value, mono = false }: {
  label: string
  value: string | number
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-white text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
