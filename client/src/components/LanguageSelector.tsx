const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'it', label: 'Italian' },
  { code: 'ru', label: 'Russian' },
]

interface LanguageSelectorProps {
  primaryLanguage: string
  selected: string[]
  onChange: (languages: string[]) => void
  maxAdditional: number
  disabled?: boolean
}

export default function LanguageSelector({
  primaryLanguage,
  selected,
  onChange,
  maxAdditional,
  disabled,
}: LanguageSelectorProps) {
  const toggleLanguage = (code: string) => {
    if (disabled) return
    if (code === primaryLanguage) return

    const exists = selected.includes(code)
    if (exists) {
      onChange(selected.filter((c) => c !== code))
    } else {
      if (selected.length >= maxAdditional) return
      onChange([...selected, code])
    }
  }

  const primaryLabel =
    LANGUAGES.find((l) => l.code === primaryLanguage)?.label || 'Primary'

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          Additional languages
        </h3>
        <span className="text-xs text-gray-500">
          Primary: <strong>{primaryLabel}</strong>
        </span>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Each extra language uses 0.5× the video minutes. You can add up to{' '}
        {maxAdditional} more based on your plan.
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {LANGUAGES.map((lang) => {
          const isPrimary = lang.code === primaryLanguage
          const isSelected = selected.includes(lang.code)
          const isDisabled =
            disabled || (selected.length >= maxAdditional && !isSelected) || isPrimary

          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => toggleLanguage(lang.code)}
              disabled={isDisabled}
              className={`rounded-lg border px-2 py-1 text-left ${
                isPrimary
                  ? 'border-gray-300 bg-gray-50 text-gray-500'
                  : isSelected
                  ? 'border-violet-500 bg-violet-50 text-violet-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <div className="font-medium">{lang.label}</div>
              <div className="text-[10px] text-gray-500">{lang.code}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

