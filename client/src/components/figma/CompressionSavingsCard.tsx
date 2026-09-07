import { formatFileSize } from '../../lib/utils'

export type CompressionLevel = 'light' | 'medium' | 'heavy'
export type CompressProfile = 'web' | 'mobile' | 'archive'

type Variant = 'estimate' | 'inline' | 'result'

interface CompressionSavingsCardProps {
  originalBytes: number
  compressedBytes: number
  variant?: Variant
  showQualityNote?: boolean
}

export function estimateCompressedSize(
  originalBytes: number,
  compressionLevel: CompressionLevel,
  compressProfile?: CompressProfile | '',
): number {
  const profileReduction: Record<CompressProfile, number> = {
    web: 0.45,
    mobile: 0.55,
    archive: 0.35,
  }
  const levelReduction: Record<CompressionLevel, number> = {
    light: 0.3,
    medium: 0.5,
    heavy: 0.7,
  }
  const reduction =
    compressProfile && compressProfile in profileReduction
      ? profileReduction[compressProfile]
      : levelReduction[compressionLevel]
  return originalBytes * (1 - reduction)
}

function savingsPercent(originalBytes: number, compressedBytes: number): number {
  if (originalBytes <= 0) return 0
  return Math.round((1 - compressedBytes / originalBytes) * 100)
}

export function CompressionSavingsCard({
  originalBytes,
  compressedBytes,
  variant = 'result',
  showQualityNote = false,
}: CompressionSavingsCardProps) {
  const saved = savingsPercent(originalBytes, compressedBytes)

  if (variant === 'estimate') {
    return (
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Your <span className="font-medium">{formatFileSize(originalBytes)}</span> file → approximately{' '}
          <span className="font-medium">{formatFileSize(compressedBytes)}</span>
          {saved > 0 && <> (~{saved}% smaller)</>}
        </p>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span>Original: {formatFileSize(originalBytes)}</span>
        <span className="text-gray-400">→</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          Compressed: {formatFileSize(compressedBytes)}
        </span>
        {saved > 0 && <span className="text-xs text-gray-500">({saved}% saved)</span>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-component dark:border-green-900/40 dark:bg-green-950/20">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Original</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{formatFileSize(originalBytes)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Compressed</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">{formatFileSize(compressedBytes)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Saved</p>
          <p className="text-lg font-semibold text-green-700 dark:text-green-300">{saved}%</p>
        </div>
      </div>
      {showQualityNote && (
        <div className="mt-4 border-t border-green-200 pt-4 dark:border-green-900/40">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Quality preserved ✓</p>
        </div>
      )}
    </div>
  )
}
