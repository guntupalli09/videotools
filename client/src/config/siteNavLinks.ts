import { CORE_AI_TOOLS_NAV } from './coreAiToolsNav'

export const CORE_AI_TOOLS = [...CORE_AI_TOOLS_NAV]

export const FREE_TOOLS_NAV = [
  { name: 'SRT → VTT Converter', path: '/tools/srt-to-vtt' },
  { name: 'VTT → SRT Converter', path: '/tools/vtt-to-srt' },
  { name: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing' },
  { name: 'Merge SRT Files', path: '/tools/merge-srt-files' },
  { name: 'Subtitle Validator', path: '/tools/subtitle-validator' },
  { name: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed' },
  { name: '→ All free tools', path: '/tools' },
] as const
