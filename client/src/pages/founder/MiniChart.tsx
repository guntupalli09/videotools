/**
 * Lightweight SVG chart primitives for the founder command centre.
 * No external charting library required.
 */

interface DataPoint {
  label: string
  value: number
}

interface LineChartProps {
  data: DataPoint[]
  color?: string
  height?: number
  formatY?: (v: number) => string
  className?: string
}

export function LineChart({ data, color = '#7c3aed', height = 120, formatY, className = '' }: LineChartProps) {
  if (data.length === 0) return <EmptyChart height={height} className={className} />

  const W = 500
  const H = height
  const PAD = { left: 44, right: 8, top: 12, bottom: 28 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values, 1)
  const range = max - min || 1

  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW
  const toY = (v: number) => PAD.top + innerH - ((v - min) / range) * innerH

  const pts = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ')
  const pathD = `M ${pts.split(' ').join(' L ')}`

  // Area fill
  const firstX = toX(0)
  const lastX = toX(data.length - 1)
  const bottom = PAD.top + innerH
  const areaD = `M ${firstX},${bottom} L ${pathD.slice(2)} L ${lastX},${bottom} Z`

  // Y axis labels
  const yTicks = [min, (min + max) / 2, max]

  // X axis labels — show first, middle, last only
  const xIndexes = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i
  )

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full h-auto ${className}`}
      preserveAspectRatio="none"
      style={{ height }}
    >
      {/* Y grid lines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1"
          />
          <text x={PAD.left - 4} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.4)">
            {formatY ? formatY(v) : v.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Area */}
      <path d={areaD} fill={color} opacity={0.12} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots on line */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.value)} r="2.5" fill={color} />
      ))}

      {/* X axis labels */}
      {xIndexes.map((i) => (
        <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">
          {data[i].label}
        </text>
      ))}
    </svg>
  )
}

interface BarChartProps {
  data: DataPoint[]
  color?: string
  height?: number
  formatY?: (v: number) => string
  className?: string
}

export function BarChart({ data, color = '#7c3aed', height = 120, formatY, className = '' }: BarChartProps) {
  if (data.length === 0) return <EmptyChart height={height} className={className} />

  const W = 500
  const H = height
  const PAD = { left: 44, right: 8, top: 12, bottom: 28 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const values = data.map((d) => d.value)
  const max = Math.max(...values, 1)

  const barW = Math.max(2, innerW / data.length - 2)
  const toX = (i: number) => PAD.left + (i / data.length) * innerW + (innerW / data.length - barW) / 2
  const toH = (v: number) => (v / max) * innerH
  const toY = (v: number) => PAD.top + innerH - toH(v)

  const xIndexes = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i
  )

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full h-auto ${className}`}
      preserveAspectRatio="none"
      style={{ height }}
    >
      {/* Bars */}
      {data.map((d, i) => (
        <rect
          key={i}
          x={toX(i)}
          y={toY(d.value)}
          width={barW}
          height={toH(d.value)}
          fill={color}
          opacity={0.8}
          rx="1"
        />
      ))}

      {/* X axis labels */}
      {xIndexes.map((i) => (
        <text key={i} x={toX(i) + barW / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">
          {data[i].label}
        </text>
      ))}

      {/* Y max label */}
      <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.4)">
        {formatY ? formatY(max) : max.toFixed(0)}
      </text>
    </svg>
  )
}

function EmptyChart({ height, className = '' }: { height: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center text-xs text-zinc-600 ${className}`}
      style={{ height }}
    >
      No data
    </div>
  )
}
