import { LucideIcon, FileText, Captions, Languages, Wrench, Flame, Package, FolderSync } from 'lucide-react';

export interface ToolConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  href: string;
  emoji: string;
}

export const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'video-to-transcript': {
    id: 'video-to-transcript',
    name: 'Video → Transcript',
    title: 'Video → Transcript',
    description: 'Extract spoken text from any video in seconds',
    icon: FileText,
    iconColor: 'text-purple-600 dark:text-purple-400',
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-purple-600',
    href: '/tools/video-to-transcript',
    emoji: '📝'
  },
  'video-to-subtitles': {
    id: 'video-to-subtitles',
    name: 'Video → Subtitles',
    title: 'Video → Subtitles',
    description: 'Generate SRT and VTT subtitle files instantly',
    icon: Captions,
    iconColor: 'text-blue-600 dark:text-blue-400',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-600',
    href: '/tools/video-to-subtitles',
    emoji: '📺'
  },
  'translate-subtitles': {
    id: 'translate-subtitles',
    name: 'Translate Subtitles',
    title: 'Translate Subtitles',
    description: 'Convert subtitles to Arabic, Hindi, Spanish, and 50+ languages',
    icon: Languages,
    iconColor: 'text-pink-600 dark:text-pink-400',
    gradientFrom: 'from-pink-600',
    gradientTo: 'to-purple-600',
    href: '/tools/translate-subtitles',
    emoji: '🌍'
  },
  'fix-subtitles': {
    id: 'fix-subtitles',
    name: 'Fix Subtitles',
    title: 'Fix Subtitles',
    description: 'Auto-correct timing issues and formatting errors',
    icon: Wrench,
    iconColor: 'text-green-600 dark:text-green-400',
    gradientFrom: 'from-green-600',
    gradientTo: 'to-emerald-600',
    href: '/tools/fix-subtitles',
    emoji: '⚡'
  },
  'burn-subtitles': {
    id: 'burn-subtitles',
    name: 'Burn Subtitles',
    title: 'Burn Subtitles',
    description: 'Hardcode captions directly into your video',
    icon: Flame,
    iconColor: 'text-orange-600 dark:text-orange-400',
    gradientFrom: 'from-orange-600',
    gradientTo: 'to-red-600',
    href: '/tools/burn-subtitles',
    emoji: '🔥'
  },
  'compress-video': {
    id: 'compress-video',
    name: 'Compress Video',
    title: 'Compress Video',
    description: 'Reduce file size while keeping quality high',
    icon: Package,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    gradientFrom: 'from-cyan-600',
    gradientTo: 'to-blue-600',
    href: '/tools/compress-video',
    emoji: '📦'
  },
  'batch-processing': {
    id: 'batch-processing',
    name: 'Batch Processing',
    title: 'Batch Processing',
    description: 'Upload multiple videos and process them together',
    icon: FolderSync,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    gradientFrom: 'from-indigo-600',
    gradientTo: 'to-purple-600',
    href: '/tools/batch-processing',
    emoji: '📂'
  }
};

// Helper function to get tool config by ID
export function getToolConfig(toolId: string): ToolConfig | undefined {
  return TOOL_CONFIGS[toolId];
}

// Helper function to get tool config by href
export function getToolConfigByHref(href: string): ToolConfig | undefined {
  return Object.values(TOOL_CONFIGS).find(config => config.href === href);
}

// Export all tools as array
export const ALL_TOOLS = Object.values(TOOL_CONFIGS);
