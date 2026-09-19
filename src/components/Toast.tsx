import { useEffect, useRef, useState } from 'react'
import { registerToastListener } from '../lib/toast'

export default function Toast() {
  const [msg, setMsg] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    registerToastListener((m) => {
      setMsg(m)
      setShow(true)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setShow(false), 2200)
    })
    return () => registerToastListener(null)
  }, [])

  if (!msg) return null
  return (
    <div
      className="fixed left-1/2 z-[60] -translate-x-1/2 rounded-full px-[18px] py-[10px] text-[13px] font-semibold transition-all duration-200 pointer-events-none"
      style={{
        bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--ink)',
        color: 'var(--paper)',
        opacity: show ? 1 : 0,
        transform: `translateX(-50%) translateY(${show ? 0 : 10}px)`,
      }}
    >
      {msg}
    </div>
  )
}
