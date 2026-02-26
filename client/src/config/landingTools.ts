import type { LucideIcon } from 'lucide-react';
import { FileText, MessageSquare, Languages, Wrench, Flame, Package, FolderSync } from 'lucide-react';

export interface LandingToolConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  href: string;
}

export const LANDING_TOOLS: LandingToolConfig[] = [
  {
    id: 'video-to-transcript',
    name: 'Video → Transcript',
    description: 'Extract spoken text from any video in seconds',
    icon: FileText,
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-purple-600',
    href: '/video-to-transcript',
  },
  {
    id: 'video-to-subtitles',
    name: 'Video → Subtitles',
    description: 'Generate SRT and VTT subtitle files instantly',
    icon: MessageSquare,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-600',
    href: '/video-to-subtitles',
  },
  {
    id: 'translate-subtitles',
    name: 'Translate Subtitles',
    description: 'Convert subtitles to Arabic, Hindi, Spanish, and 50+ languages',
    icon: Languages,
    gradientFrom: 'from-pink-600',
    gradientTo: 'to-purple-600',
    href: '/translate-subtitles',
  },
  {
    id: 'fix-subtitles',
    name: 'Fix Subtitles',
    description: 'Auto-correct timing issues and formatting errors',
    icon: Wrench,
    gradientFrom: 'from-green-600',
    gradientTo: 'to-emerald-600',
    href: '/fix-subtitles',
  },
  {
    id: 'burn-subtitles',
    name: 'Burn Subtitles',
    description: 'Hardcode captions directly into your video',
    icon: Flame,
    gradientFrom: 'from-orange-600',
    gradientTo: 'to-red-600',
    href: '/burn-subtitles',
  },
  {
    id: 'compress-video',
    name: 'Compress Video',
    description: 'Reduce file size while keeping quality high',
    icon: Package,
    gradientFrom: 'from-cyan-600',
    gradientTo: 'to-blue-600',
    href: '/compress-video',
  },
  {
    id: 'batch-process',
    name: 'Batch Processing',
    description: 'Upload multiple videos and process them together',
    icon: FolderSync,
    gradientFrom: 'from-indigo-600',
    gradientTo: 'to-purple-600',
    href: '/batch-process',
  },
];
