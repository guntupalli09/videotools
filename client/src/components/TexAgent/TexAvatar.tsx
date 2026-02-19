/**
 * Tex mascot avatar — gradient violet, soft glow, blink + breathing.
 * Scales via Tailwind (sm, md, lg). Responsive, no fixed pixel layout. Dark mode + a11y.
 */
import React from 'react'

const sizeClasses = {
  sm: 'w-8 h-8 min-w-[2rem] min-h-[2rem]',
  md: 'w-12 h-12 min-w-[3rem] min-h-[3rem]',
  lg: 'w-16 h-16 min-w-[4rem] min-h-[4rem]',
} as const

type Size = keyof typeof sizeClasses

interface TexAvatarProps {
  size?: Size
  className?: string
  pose?: 'default' | 'wave' | 'think'
  /** Use white fill (e.g. on violet FAB) */
  onDark?: boolean
  ariaHidden?: boolean
}

export default function TexAvatar({ size = 'md', className = '', pose = 'default', onDark = false, ariaHidden = true }: TexAvatarProps) {
  const sizeClass = sizeClasses[size]
  const isOnDark = onDark

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}
      aria-hidden={ariaHidden}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-full max-h-full tex-avatar-breathing"
        style={isOnDark ? undefined : { filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.35))' }}
      >
        <defs>
          <linearGradient id="tex-violet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
        </defs>

        {/* Soft glow behind (when not on dark FAB) */}
        {!isOnDark && (
          <ellipse cx="32" cy="32" rx="26" ry="26" fill="url(#tex-violet-grad)" fillOpacity="0.12" />
        )}

        {/* Body */}
        <ellipse
          cx="32"
          cy="38"
          rx="20"
          ry="18"
          fill={isOnDark ? 'currentColor' : 'url(#tex-violet-grad)'}
          className={isOnDark ? 'text-white' : ''}
        />
        {/* Head */}
        <circle
          cx="32"
          cy="22"
          r="16"
          fill={isOnDark ? 'currentColor' : 'url(#tex-violet-grad)'}
          className={isOnDark ? 'text-white' : ''}
        />

        {/* Eyes (blink) */}
        <g className="tex-avatar-blink">
          <ellipse cx="26" cy="20" rx="3" ry="4" fill="white" opacity={0.95} />
          <ellipse cx="38" cy="20" rx="3" ry="4" fill="white" opacity={0.95} />
          <circle cx="26" cy="21" r="1.5" fill={isOnDark ? '#fff' : '#4c1d95'} />
          <circle cx="38" cy="21" r="1.5" fill={isOnDark ? '#fff' : '#4c1d95'} />
        </g>

        {/* Smile */}
        <path
          d="M 24 28 Q 32 34 40 28"
          stroke="white"
          strokeOpacity={0.9}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {pose === 'wave' && (
          <path
            d="M 48 18 L 52 14 L 52 22 L 48 18"
            stroke={isOnDark ? 'currentColor' : 'url(#tex-violet-grad)'}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isOnDark ? 'text-white' : ''}
          />
        )}
      </svg>
    </span>
  )
}
