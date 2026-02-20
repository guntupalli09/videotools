import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../lib/theme'
import { subscribeTexEvents, type TexEventType } from '../../tex'
import TexAvatar from './TexAvatar'
import TexAgentPanel from './TexAgentPanel'

const TEX_FAB_STORAGE_KEY = 'videotext-tex-seen'
const MOBILE_BREAKPOINT = 768

export default function TexAgent() {
  const [open, setOpen] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const [inputFocused, setInputFocused] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`)
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // On mobile, hide FAB when any input/textarea is focused (keyboard open) to avoid overlap
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        setInputFocused(true)
      }
    }
    const onFocusOut = () => setInputFocused(false)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

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
          opacity: open || (!isDesktop && inputFocused) ? 0 : 1,
          pointerEvents: open || (!isDesktop && inputFocused) ? 'none' : 'auto',
        }}
        transition={{ duration: 0.2 }}
      >
        {showPulse && (
          <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-30" aria-hidden />
        )}
        <TexAvatar size="md" onDark />
      </motion.button>

      {/* Overlay: only when open (so closed panel doesn't block clicks) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[54] bg-black/40 dark:bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Panel: always mounted so history is preserved when closed and reopened */}
      <motion.div
        initial={false}
        animate={
          open
            ? { opacity: 1, x: 0, y: 0 }
            : isDesktop
              ? { opacity: 0, x: '100%' }
              : { opacity: 0, y: '100%' }
        }
        transition={{ type: 'tween', duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="fixed right-0 bottom-0 z-[55] flex flex-col shadow-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-t-2xl rounded-l-2xl border-b-0 border-r-0"
        style={{
          width: isDesktop ? 'min(380px, 88vw)' : 'min(300px, 82vw)',
          height: '75vh',
          maxHeight: '640px',
          pointerEvents: open ? 'auto' : 'none',
        }}
        aria-hidden={!open}
      >
        <TexAgentPanel onClose={() => setOpen(false)} isDark={isDark} isOpen={open} />
      </motion.div>
    </>
  )
}
