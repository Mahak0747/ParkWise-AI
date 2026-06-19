import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, Search, AlertCircle, Info } from 'lucide-react'
import { GlassCard, SeverityBadge } from '../components/cards/SharedUI'

// No /api/offenders endpoint exists in Phase 2 backend.
// Using realistic mock data derived from real vehicle number patterns and station names from the dataset.
const MOCK_VEHICLES = [
  {
    vehicle_number: 'FKN00GL1947',
    violation_count: 7,
    risk_category: 'High-Risk Offender',
    last_station: 'Upparpet',
    severity: 'Critical',
    last_location: 'Safina Plaza Junction, MG Road',
    violations: ['WRONG PARKING', 'NO PARKING', 'DOUBLE PARKING', 'PARKING IN A MAIN ROAD'],
    recommendation: 'Immediate towing. 4th+ offense — escalate to high-risk registry.',
  },
  {
    vehicle_number: 'FKN00GL3821',
    violation_count: 3,
    risk_category: 'Tow Recommendation',
    last_station: 'Shivajinagar',
    severity: 'High',
    last_location: 'KR Market Junction',
    violations: ['NO PARKING', 'PARKING ON FOOTPATH', 'WRONG PARKING'],
    recommendation: 'Issue e-Challan and recommend towing. 3rd offense.',
  },
  {
    vehicle_number: 'FKN00GL5509',
    violation_count: 2,
    risk_category: 'Challan',
    last_station: 'Malleshwaram',
    severity: 'Medium',
    last_location: 'Elite Junction, Malleswaram Circle',
    violations: ['PARKING NEAR BUSTOP', 'NO PARKING'],
    recommendation: 'Issue e-Challan. 2nd offense on record.',
  },
  {
    vehicle_number: 'FKN00GL7744',
    violation_count: 1,
    risk_category: 'Warning',
    last_station: 'HAL Old Airport',
    severity: 'Low',
    last_location: 'HAL Airport Road, Domlur',
    violations: ['WRONG PARKING'],
    recommendation: 'Issue warning notification. First-time offender.',
  },
  {
    vehicle_number: 'FKN00GL0293',
    violation_count: 5,
    risk_category: 'High-Risk Offender',
    last_station: 'City Market',
    severity: 'Critical',
    last_location: 'Sagar Theatre Junction, Gandhinagar',
    violations: ['PARKING IN A MAIN ROAD', 'DOUBLE PARKING', 'NO PARKING'],
    recommendation: 'Mandatory towing + officer deployment. Repeat critical offender.',
  },
]

const RISK_COLORS: Record<string, string> = {
  Warning: '#22C55E',
  Challan: '#FACC15',
  'Tow Recommendation': '#F97316',
  'High-Risk Offender': '#EF4444',
}

export default function VehicleSearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<typeof MOCK_VEHICLES[0] | null>(null)
  const [notFound, setNotFound] = useState(false)

  const handleSearch = () => {
    const q = query.trim().toUpperCase()
    if (!q) return
    const found = MOCK_VEHICLES.find((v) => v.vehicle_number.includes(q) || q.includes(v.vehicle_number))
    if (found) {
      setResult(found)
      setNotFound(false)
    } else {
      setResult(null)
      setNotFound(true)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Car size={18} className="text-accent" />
          Vehicle Violation Search
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Look up violation history and risk category by vehicle number
        </p>
      </motion.div>

      {/* Note: no backend endpoint */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
        <Info size={14} className="text-accent mt-0.5 flex-shrink-0" />
        <p className="text-slate-400 text-xs">
          <strong className="text-accent">Note:</strong> The Phase 2 backend does not include a{' '}
          <code className="font-mono bg-white/10 px-1 rounded">/api/offenders</code> endpoint.
          This page uses realistic mock data derived from the real Bengaluru dataset vehicle number
          patterns and station names. A live endpoint is planned for Phase 3.
        </p>
      </div>

      {/* Search */}
      <GlassCard delay={0.1}>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter vehicle number (e.g. FKN00GL1947)"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/50 font-mono transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 rounded-lg bg-accent hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Search
          </button>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          <span className="text-slate-600 text-xs">Try:</span>
          {MOCK_VEHICLES.map((v) => (
            <button
              key={v.vehicle_number}
              onClick={() => {
                setQuery(v.vehicle_number)
                setResult(v)
                setNotFound(false)
              }}
              className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 font-mono transition-colors"
            >
              {v.vehicle_number}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Results */}
      <AnimatePresence mode="wait">
        {notFound && (
          <motion.div
            key="notfound"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-critical/5 border border-critical/20"
          >
            <AlertCircle size={16} className="text-critical" />
            <p className="text-slate-400 text-sm">No records found for "{query}".</p>
          </motion.div>
        )}

        {result && (
          <motion.div
            key={result.vehicle_number}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Vehicle header */}
            <div className="glass p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xl font-bold text-white">
                      {result.vehicle_number}
                    </span>
                    <SeverityBadge severity={result.severity} />
                  </div>
                  <p className="text-slate-500 text-sm">{result.last_location}</p>
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: `${RISK_COLORS[result.risk_category]}15`,
                    color: RISK_COLORS[result.risk_category],
                    border: `1px solid ${RISK_COLORS[result.risk_category]}30`,
                  }}
                >
                  {result.risk_category}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-slate-500 text-xs">Violation Count</p>
                  <p className="text-white font-mono text-2xl font-bold mt-0.5">
                    {result.violation_count}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Last Station</p>
                  <p className="text-white text-sm font-medium mt-0.5">{result.last_station}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Risk Level</p>
                  <p
                    className="text-sm font-semibold mt-0.5"
                    style={{ color: RISK_COLORS[result.risk_category] }}
                  >
                    {result.risk_category}
                  </p>
                </div>
              </div>
            </div>

            {/* Violations + recommendation */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Recorded Violations
                </h3>
                <div className="space-y-2">
                  {result.violations.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-critical" />
                      <span className="text-white text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Recommended Action
                </h3>
                <div
                  className="p-3 rounded-lg text-xs"
                  style={{
                    background: `${RISK_COLORS[result.risk_category]}10`,
                    border: `1px solid ${RISK_COLORS[result.risk_category]}20`,
                  }}
                >
                  <p className="text-white leading-relaxed">{result.recommendation}</p>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
