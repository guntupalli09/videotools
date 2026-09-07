import type { LucideIcon } from 'lucide-react';
import { FileText, MessageSquare, Languages, Wrench, Flame, Package, FolderSync, Mic } from 'lucide-react';

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
    id: 'voice-recorder',
    name: 'Voice → Text',
    description: 'Record in your browser — no file, no upload. Transcript in seconds.',
    icon: Mic,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-700',
    href: '/voice-recorder',
  },
  {
    id: 'video-to-transcript',
    name: 'Video → Transcript',
    description: 'Extract spoken text from any video in seconds',
    icon: FileText,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-700',
    href: '/video-to-transcript',
  },
  {
    id: 'video-to-subtitles',
    name: 'Video → Subtitles',
    description: 'Generate SRT and VTT subtitle files instantly',
    icon: MessageSquare,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-700',
    href: '/video-to-subtitles',
  },
  {
    id: 'translate-subtitles',
    name: 'Translate',
    description: 'Translate subtitles, DOCX, TXT, and JSON into 70+ languages',
    icon: Languages,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-700',
    href: '/translate-subtitles',
  },
  {
    id: 'fix-subtitles',
    name: 'Fix Subtitles',
    description: 'Auto-correct timing issues and formatting errors',
    icon: Wrench,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-700',
    href: '/fix-subtitles',
  },
  {
    id: 'burn-subtitles',
    name: 'Burn Subtitles',
    description: 'Hardcode captions directly into your video',
    icon: Flame,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-800',
    href: '/burn-subtitles',
  },
  {
    id: 'compress-video',
    name: 'Compress Video',
    description: 'Reduce file size while keeping quality high',
    icon: Package,
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-700',
    href: '/compress-video',
  },
  {
    id: 'batch-process',
    name: 'Batch Processing',
    description: 'Upload multiple videos and process them together',
    icon: FolderSync,
    gradientFrom: 'from-blue-700',
    gradientTo: 'to-blue-800',
    href: '/batch-process',
  },
];
