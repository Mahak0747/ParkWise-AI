import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import { Brain, CheckCircle, Award, Cpu, ArrowRight } from 'lucide-react'
import { fetchAnalytics } from '../services/api'
import type { AnalyticsResponse } from '../types'
import { GlassCard, LoadingSpinner, ErrorState, StatRow } from '../components/cards/SharedUI'

// Static from model_metrics.csv — no endpoint for this, using real uploaded CSV values
const MODEL_METRICS = [
  { Model: 'RandomForest', Accuracy: 0.9852, Precision: 0.9869, Recall: 0.9852, F1_Score: 0.9857 },
  { Model: 'GradientBoosting', Accuracy: 0.9922, Precision: 0.9912, Recall: 0.9922, F1_Score: 0.9911 },
  { Model: 'ExtraTrees', Accuracy: 0.9779, Precision: 0.9817, Recall: 0.9779, F1_Score: 0.9789 },
]

const SELECTED_MODEL = MODEL_METRICS.find((m) => m.Model === 'GradientBoosting')!

const SEVERITY_RULES = [
  {
    severity: 'Low',
    color: '#22C55E',
    action: 'Warning Only',
    desc: 'Issue a digital warning via system. No challan or towing.',
    icon: '⚠️',
  },
  {
    severity: 'Medium',
    color: '#FACC15',
    action: 'Send Notification',
    desc: 'Push alert to vehicle owner. Notification triggered.',
    icon: '📲',
  },
  {
    severity: 'High',
    color: '#F97316',
    action: 'Issue e-Challan',
    desc: 'Generate challan via VAHAN portal. Mandatory follow-up.',
    icon: '📋',
  },
  {
    severity: 'Critical',
    color: '#EF4444',
    action: 'Tow + Deploy Officer',
    desc: 'Immediate towing + officer deployment to location.',
    icon: '🚨',
  },
]

export default function ModelInsights() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

    function setData(d: AnalyticsResponse) {
      setAnalytics(d)
    }
  }, [])

  if (loading) return <LoadingSpinner message="Loading model insights..." />
  if (error) return <ErrorState message={error} />

  const radarData = [
    { metric: 'Accuracy', value: SELECTED_MODEL.Accuracy * 100 },
    { metric: 'Precision', value: SELECTED_MODEL.Precision * 100 },
    { metric: 'Recall', value: SELECTED_MODEL.Recall * 100 },
    { metric: 'F1 Score', value: SELECTED_MODEL.F1_Score * 100 },
  ]

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Brain size={18} className="text-accent" />
          Model Intelligence Insights
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          GradientBoostingClassifier · Trained on 298,450 Bengaluru violation records
        </p>
      </motion.div>

      {/* Model comparison */}
      <div className="grid grid-cols-3 gap-4">
        {MODEL_METRICS.map((m, i) => {
          const isSelected = m.Model === 'GradientBoosting'
          return (
            <GlassCard key={m.Model} delay={i * 0.1} className={isSelected ? '!border-accent/30 !bg-accent/5' : ''}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className={isSelected ? 'text-accent' : 'text-slate-500'} />
                  <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {m.Model}
                  </span>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1.5">
                    <Award size={12} className="text-accent" />
                    <span className="text-accent text-xs font-medium">Selected</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {(['Accuracy', 'Precision', 'Recall', 'F1_Score'] as const).map((key) => (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500 text-xs">{key.replace('_', ' ')}</span>
                      <span className={`font-mono text-xs font-semibold ${isSelected ? 'text-accent' : 'text-white'}`}>
                        {(m[key] * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-full h-1 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${m[key] * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                        className="h-full rounded-full"
                        style={{ background: isSelected ? '#3B82F6' : '#475569' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Row 2: Radar + Feature importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard delay={0.2}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-white">Performance Radar — GradientBoosting</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
              />
              <Radar
                name="Model"
                dataKey="value"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <StatRow label="Accuracy" value={`${(SELECTED_MODEL.Accuracy * 100).toFixed(2)}%`} mono />
            <StatRow label="Precision" value={`${(SELECTED_MODEL.Precision * 100).toFixed(2)}%`} mono />
            <StatRow label="Recall" value={`${(SELECTED_MODEL.Recall * 100).toFixed(2)}%`} mono />
            <StatRow label="F1 Score" value={`${(SELECTED_MODEL.F1_Score * 100).toFixed(2)}%`} mono />
          </div>
        </GlassCard>

        {/* Feature importance from API */}
        <GlassCard delay={0.25}>
          <div className="flex items-center gap-2 mb-4">
            <Brain size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-white">Feature Importance (Live from Model)</h2>
          </div>
          {analytics ? (
            <div className="space-y-2.5">
              {analytics.feature_importance.slice(0, 10).map((f, i) => (
                <div key={f.feature} className="flex items-center gap-3">
                  <span className="text-slate-600 font-mono text-xs w-5 text-right">{i + 1}</span>
                  <span className="text-slate-300 text-xs truncate" style={{ width: '150px' }}>
                    {f.feature}
                  </span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(f.importance / analytics.feature_importance[0].importance) * 100}%` }}
                      transition={{ delay: 0.4 + i * 0.06, duration: 0.7 }}
                      className="h-full bg-accent rounded-full"
                    />
                  </div>
                  <span className="text-accent font-mono text-xs w-14 text-right">
                    {(f.importance * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Feature importance unavailable</p>
          )}
        </GlassCard>
      </div>

      {/* Severity → Recommendation explanation */}
      <GlassCard delay={0.35}>
        <div className="flex items-center gap-2 mb-4">
          <ArrowRight size={14} className="text-accent" />
          <h2 className="text-sm font-semibold text-white">Severity → Enforcement Action Pipeline</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {SEVERITY_RULES.map((rule, i) => (
            <motion.div
              key={rule.severity}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="p-4 rounded-xl border"
              style={{
                background: `${rule.color}08`,
                borderColor: `${rule.color}25`,
              }}
            >
              <div className="text-2xl mb-2">{rule.icon}</div>
              <div
                className="text-xs font-bold mb-1 px-2 py-0.5 rounded inline-block"
                style={{ color: rule.color, background: `${rule.color}18` }}
              >
                {rule.severity}
              </div>
              <p className="text-white text-xs font-semibold mt-2">{rule.action}</p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">{rule.desc}</p>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Model workflow card */}
      <GlassCard delay={0.45}>
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={14} className="text-accent" />
          <h2 className="text-sm font-semibold text-white">Model Inference Workflow</h2>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { step: 'Raw Violation Data', color: '#475569' },
            { step: 'Feature Engineering (16 cols)', color: '#3B82F6' },
            { step: 'GradientBoosting Inference', color: '#8B5CF6' },
            { step: 'PCI Score Computation', color: '#F97316' },
            { step: 'Severity Classification', color: '#EF4444' },
            { step: 'Enforcement Recommendation', color: '#22C55E' },
          ].map(({ step, color }, i, arr) => (
            <div key={step} className="flex items-center gap-2 flex-shrink-0">
              <div
                className="px-3 py-2 rounded-lg text-xs font-medium text-white"
                style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
              >
                {step}
              </div>
              {i < arr.length - 1 && (
                <ArrowRight size={12} className="text-slate-600 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
          <StatRow label="Training Data" value="298,450 rows" />
          <StatRow label="Feature Columns" value="16" mono />
          <StatRow label="Label Classes" value="Low / Medium / High / Critical" />
          <StatRow label="Algorithm" value="GradientBoostingClassifier" />
          <StatRow label="Coverage Period" value="Nov 2023 – May 2024" />
          <StatRow label="Sklearn Version" value="1.5.2" mono />
        </div>
      </GlassCard>
    </div>
  )
}
