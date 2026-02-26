import { createBrowserRouter } from 'react-router';
import Root from './Root';
import Landing from './pages/Landing';
import VideoToTranscript from './pages/VideoToTranscript';
import VideoToSubtitles from './pages/VideoToSubtitles';
import TranslateSubtitles from './pages/TranslateSubtitles';
import FixSubtitles from './pages/FixSubtitles';
import BurnSubtitles from './pages/BurnSubtitles';
import CompressVideo from './pages/CompressVideo';
import BatchProcessing from './pages/BatchProcessing';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      {
        index: true,
        Component: Landing,
      },
      {
        path: 'tools/video-to-transcript',
        Component: VideoToTranscript,
      },
      {
        path: 'tools/video-to-subtitles',
        Component: VideoToSubtitles,
      },
      {
        path: 'tools/translate-subtitles',
        Component: TranslateSubtitles,
      },
      {
        path: 'tools/fix-subtitles',
        Component: FixSubtitles,
      },
      {
        path: 'tools/burn-subtitles',
        Component: BurnSubtitles,
      },
      {
        path: 'tools/compress-video',
        Component: CompressVideo,
      },
      {
        path: 'tools/batch-processing',
        Component: BatchProcessing,
      },
    ],
  },
]);
