import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: number
  unit?: string
  icon: LucideIcon
  color?: string
  format?: 'number' | 'decimal' | 'percent'
  delay?: number
  subtitle?: string
}

function AnimatedNumber({ value, format }: { value: number; format: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => {
    if (format === 'decimal') return v.toFixed(1)
    if (format === 'percent') return v.toFixed(1) + '%'
    return Math.round(v).toLocaleString('en-IN')
  })

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: 'easeOut' })
    return controls.stop
  }, [value, count])

  return <motion.span>{rounded}</motion.span>
}

export default function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  color = '#3B82F6',
  format = 'number',
  delay = 0,
  subtitle,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="glass p-5 group cursor-default"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div
          className="w-2 h-2 rounded-full mt-1"
          style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span
            className="kpi-value text-2xl"
            style={{ color }}
          >
            <AnimatedNumber value={value} format={format} />
          </span>
          {unit && (
            <span className="text-slate-500 text-xs">{unit}</span>
          )}
        </div>
        <p className="text-slate-300 text-sm font-medium">{label}</p>
        {subtitle && <p className="text-slate-600 text-xs">{subtitle}</p>}
      </div>
    </motion.div>
  )
}
