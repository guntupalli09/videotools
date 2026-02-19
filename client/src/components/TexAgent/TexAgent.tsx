import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../lib/theme'
import { subscribeTexEvents, type TexEventType } from '../../tex'
import TexAvatar from './TexAvatar'
import TexAgentPanel from './TexAgentPanel'

const TEX_FAB_STORAGE_KEY = 'videotext-tex-seen'

export default function TexAgent() {
  const [open, setOpen] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(TEX_FAB_STORAGE_KEY)
      if (!seen) setShowPulse(true)
    } catch {
      setShowPulse(false)
    }
  }, [])

  // Auto-open panel when a job completes so user sees "done in XX seconds" and feedback prompt
  useEffect(() => {
    const unsub = subscribeTexEvents((type: TexEventType) => {
      if (type === 'job_completed') {
        setOpen(true)
        setShowPulse(false)
        try {
          sessionStorage.setItem(TEX_FAB_STORAGE_KEY, '1')
        } catch {
          // ignore
        }
      }
    })
    return unsub
  }, [])

  function handleOpen() {
    setOpen(true)
    try {
      sessionStorage.setItem(TEX_FAB_STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setShowPulse(false)
  }

  return (
    <>
      {/* FAB */}
      <motion.button
        type="button"
        onClick={open ? undefined : handleOpen}
        onKeyDown={(e) => e.key === 'Enter' && !open && handleOpen()}
        className="fixed bottom-6 right-6 z-[55] flex items-center justify-center w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
        aria-label="Open Tex — VideoText guide"
        initial={false}
        animate={{
          scale: open ? 0.9 : 1,
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
        }}
        transition={{ duration: 0.2 }}
      >
        {showPulse && (
          <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-30" aria-hidden />
        )}
        <TexAvatar size="md" onDark />
      </motion.button>

      {/* Panel overlay + drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[54] bg-black/40 dark:bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[55] h-[85vh] max-h-[600px] flex flex-col px-4 pb-4 pt-2 pointer-events-auto"
            >
              <TexAgentPanel onClose={() => setOpen(false)} isDark={isDark} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
