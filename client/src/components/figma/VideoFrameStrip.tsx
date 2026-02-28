import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

const MAX_FRAMES = 24;
const THUMB_WIDTH = 120;
const THUMB_HEIGHT = 68;

interface Frame {
  time: number;
  dataUrl: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface VideoFrameStripProps {
  /** Object URL of the video (e.g. from URL.createObjectURL(file)). */
  videoSrc: string;
  /** Total duration in seconds (for sampling and labels). */
  durationSeconds: number;
  /** Optional: when user clicks a frame, seek main video to this time. */
  onSeek?: (timeSeconds: number) => void;
  /** Optional: current playback time to highlight the active frame. */
  currentTime?: number;
  className?: string;
}

/**
 * Descript-style frame strip: horizontal scrollable thumbnails sampled from the video
 * so the user can see the video frame-by-frame and jump to any point.
 */
export function VideoFrameStrip({
  videoSrc,
  durationSeconds,
  onSeek,
  currentTime = 0,
  className = '',
}: VideoFrameStripProps) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!videoSrc || durationSeconds <= 0) {
      setFrames([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    let aborted = false;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvas.width = THUMB_WIDTH;
    canvas.height = THUMB_HEIGHT;
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');

    const numFrames = Math.min(MAX_FRAMES, Math.max(1, Math.ceil(durationSeconds / 4)));
    const times: number[] = [];
    if (numFrames === 1) {
      times.push(0);
    } else {
      for (let i = 0; i < numFrames; i++) {
        times.push((i / (numFrames - 1)) * Math.max(0, durationSeconds - 0.1));
      }
    }

    const results: Frame[] = [];
    let index = 0;
    const SEEK_TIMEOUT_MS = 800;

    const tryCaptureFrame = () => {
      if (!ctx || aborted) return;
      try {
        ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        results.push({ time: times[index], dataUrl });
      } catch {
        // skip this frame (e.g. tainted canvas)
      }
      index++;
      scheduleNext();
    };

    const scheduleNext = () => {
      if (aborted) return;
      if (index >= times.length || !ctx) {
        setFrames([...results]);
        setLoading(false);
        cleanup();
        return;
      }
      const time = times[index];
      video.currentTime = time;
      let done = false;
      const finish = () => {
        if (done || aborted) return;
        done = true;
        video.removeEventListener('seeked', onSeeked);
        clearTimeout(timeoutId);
        const near = Math.abs((video.currentTime || 0) - time) < 1.5;
        if (near) tryCaptureFrame();
        else {
          index++;
          scheduleNext();
        }
      };
      const timeoutId = setTimeout(finish, SEEK_TIMEOUT_MS);
      const onSeeked = () => finish();
      video.addEventListener('seeked', onSeeked);
    };

    const onError = () => {
      if (aborted) return;
      setError(true);
      setLoading(false);
      cleanup();
    };

    const cleanup = () => {
      aborted = true;
      video.removeEventListener('error', onError);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.src = '';
      video.load();
      videoRef.current = null;
    };

    const onReady = () => {
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.addEventListener('error', onError);
      // Some browsers only fire 'seeked' after the video has been played once
      video.play().catch(() => {}).then(() => {
        if (aborted) return;
        video.pause();
        scheduleNext();
      });
    };

    video.addEventListener('canplay', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);
    video.src = videoSrc;

    return () => {
      cleanup();
    };
  }, [videoSrc, durationSeconds]);

  if (loading) {
    return (
      <div className={`rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <span>Loading frame strip…</span>
        </div>
      </div>
    );
  }

  if (error || frames.length === 0) {
    return (
      <div className={className}>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Frame by frame</p>
        <div className="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
          {error ? 'Could not load frame preview.' : 'Frame preview unavailable for this video.'}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Frame by frame</p>
      <div className="flex gap-1 overflow-x-auto pb-1 rounded-lg bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 p-1.5">
        {frames.map((frame) => {
          const isActive = Math.abs(frame.time - currentTime) < 2;
          return (
            <motion.button
              key={frame.time}
              type="button"
              onClick={() => onSeek?.(frame.time)}
              className={`flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
                isActive
                  ? 'border-violet-500 ring-2 ring-violet-500/30'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              } ${onSeek ? 'cursor-pointer' : 'cursor-default'}`}
              whileHover={onSeek ? { scale: 1.02 } : {}}
              whileTap={onSeek ? { scale: 0.98 } : {}}
            >
              <img
                src={frame.dataUrl}
                alt={`Frame at ${formatTime(frame.time)}`}
                className="w-[72px] h-[41px] sm:w-[88px] sm:h-[49px] object-cover block"
              />
              <span className="block w-full bg-black/60 text-[9px] sm:text-[10px] text-white text-center py-0.5">
                {formatTime(frame.time)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
