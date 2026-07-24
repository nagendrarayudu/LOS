import type { ReactNode } from 'react'

const ICONS: Record<string, ReactNode> = {
  gold: (
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  ),
  personal: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
  msme: <><path d="M4 8l1-4h14l1 4" /><path d="M4 8v12h16V8" /><path d="M9 20v-6h6v6" /></>,
  housing: <path d="M4 11l8-7 8 7v9H4z" />,
  lap: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  vehicle: (
    <>
      <path d="M5 16l2-6h10l2 6" />
      <circle cx="8" cy="17" r="1.5" />
      <circle cx="16" cy="17" r="1.5" />
      <path d="M4 16h16v2H4z" />
    </>
  ),
}

export function SchemeIcon({ schemeKey, size = 16, color = '#0a6e4d' }: { schemeKey: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[schemeKey] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  )
}
