import type { ReactNode } from 'react'
import type { QType } from '../lib/types'
import { SRS_MASTER_BOX } from '../lib/srs'

export function Card({ children, className = '', style = {} }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`flex flex-col gap-[14px] rounded-[20px] p-[18px] ${className}`}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', ...style }}
    >
      {children}
    </div>
  )
}

export function TypeTag({ type, subtype }: { type: QType; subtype?: string }) {
  const color = type === 'speaking' ? 'var(--speaking)' : 'var(--listening)'
  return (
    <div className="flex flex-wrap gap-[6px]">
      <span
        className="rounded-full px-[9px] py-[4px] text-[11px] font-extrabold uppercase tracking-wide"
        style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
      >
        {type === 'speaking' ? 'Speaking' : 'Listening'}
      </span>
      {subtype ? (
        <span
          className="rounded-full px-[9px] py-[4px] text-[11px] font-bold"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}
        >
          {subtype}
        </span>
      ) : null}
    </div>
  )
}

export function Pill({ tone, children }: { tone: 'good' | 'critical' | 'warning' | 'muted'; children: ReactNode }) {
  const map: Record<string, [string, string]> = {
    good: ['var(--good-soft)', 'var(--good)'],
    critical: ['var(--critical-soft)', 'var(--critical)'],
    warning: ['var(--warning-soft)', 'var(--warning)'],
    muted: ['var(--surface-2)', 'var(--ink-muted)'],
  }
  const [bg, fg] = map[tone]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-[10px] py-[4px] text-[12px] font-bold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  )
}

export function ChipBtn({
  active,
  children,
  onClick,
  small,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full font-bold ${small ? 'px-[10px] py-[5px] text-[11px]' : 'px-[12px] py-[7px] text-[12px]'}`}
      style={active ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : { background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}
    >
      {children}
    </button>
  )
}

export function Btn({
  tone = 'ghost',
  children,
  onClick,
  block,
  type = 'button',
  disabled,
}: {
  tone?: 'primary' | 'ghost' | 'good' | 'critical' | 'warning'
  children: ReactNode
  onClick?: () => void
  block?: boolean
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const map: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: 'var(--accent-ink)' },
    ghost: { background: 'var(--surface-2)', color: 'var(--ink-secondary)' },
    good: { background: 'var(--good-soft)', color: 'var(--good)' },
    critical: { background: 'var(--critical-soft)', color: 'var(--critical)' },
    warning: { background: 'var(--warning-soft)', color: 'var(--warning)' },
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-[6px] rounded-[13px] px-[10px] py-[12px] text-[13px] font-bold disabled:opacity-60 ${block ? 'w-full' : ''}`}
      style={map[tone]}
    >
      {children}
    </button>
  )
}

export function SrsBadge({ box }: { box: number }) {
  if (box >= SRS_MASTER_BOX) return <Pill tone="good">✅ 已掌握</Pill>
  if (box <= 1)
    return (
      <span className="whitespace-nowrap rounded-full px-[10px] py-[5px] text-[11px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
        🌱 新词
      </span>
    )
  return (
    <span className="whitespace-nowrap rounded-full px-[10px] py-[5px] text-[11px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
      📚 复习中
    </span>
  )
}

export function EmptyState({ emoji, text, children }: { emoji: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-[10px] px-4 py-12 text-center" style={{ color: 'var(--ink-muted)' }}>
      <div className="text-[40px]">{emoji}</div>
      <p className="text-[14px]" style={{ color: 'var(--ink-secondary)' }}>
        {text}
      </p>
      {children}
    </div>
  )
}
