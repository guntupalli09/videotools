export interface SubtitleRow {
  index: number
  startTime: string
  endTime: string
  text: string
}

interface SubtitleEditorProps {
  entries: SubtitleRow[]
  editable: boolean
  onChange: (updated: SubtitleRow[]) => void
}

export default function SubtitleEditor({
  entries,
  editable,
  onChange,
}: SubtitleEditorProps) {
  const handleTextChange = (idx: number, value: string) => {
    const updated = entries.map((row, i) =>
      i === idx ? { ...row, text: value } : row
    )
    onChange(updated)
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Subtitle Editor</h3>
        {!editable && (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Read-only on free plan
          </span>
        )}
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto text-xs">
        {entries.map((row, idx) => (
          <div
            key={row.index}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <div className="mb-1 text-[11px] font-mono text-gray-500">
              {row.startTime} → {row.endTime}
            </div>
            <textarea
              value={row.text}
              onChange={(e) => handleTextChange(idx, e.target.value)}
              readOnly={!editable}
              className="h-16 w-full resize-none rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 disabled:bg-gray-100"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

