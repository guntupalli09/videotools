import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Send, X } from 'lucide-react'
import TexAvatar from './TexAvatar'
import {
  TEX_SUGGESTIONS,
  getTexEntryById,
  findTexEntryForQuery,
  type TexEntry,
} from '../../content/texKnowledge'
import {
  subscribeTexEvents,
  getToolGreeting,
  getTexTrigger,
  type TexEventType,
} from '../../tex'
import { getCurrentUsage, submitFeedback } from '../../lib/api'

const TYPING_DELAY_MS = 500

interface Message {
  type: 'user' | 'tex'
  text: string
  entry?: TexEntry
  /** Contextual auto-inject (speed, error, trigger) */
  contextual?: boolean
}

interface TexAgentPanelProps {
  onClose: () => void
  isDark?: boolean
}

export default function TexAgentPanel({ onClose }: TexAgentPanelProps) {
  const { pathname } = useLocation()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const [plan, setPlan] = useState<string>('free')
  const [lastJobCompletedToolId, setLastJobCompletedToolId] = useState<string | undefined>(undefined)
  const [feedbackStars, setFeedbackStars] = useState<number | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackNameOrEmail, setFeedbackNameOrEmail] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const submittedFeedbackForToolIdRef = useRef<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const showFeedbackStrip =
    lastJobCompletedToolId != null && submittedFeedbackForToolIdRef.current !== lastJobCompletedToolId

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  // Plan awareness — read-only, non-blocking
  useEffect(() => {
    getCurrentUsage()
      .then((data) => setPlan((data.plan || 'free').toLowerCase()))
      .catch(() => setPlan(typeof localStorage !== 'undefined' ? (localStorage.getItem('plan') || 'free').toLowerCase() : 'free'))
  }, [])

  // Route + tool greeting when panel first shows messages (do not wait for plan)
  useEffect(() => {
    if (hasGreeted || messages.length > 0) return
    const toolGreeting = getToolGreeting(pathname)
    const base = "Hi! I'm Tex, your VideoText guide. Ask me how any tool works, what's in each plan, or how to fix an issue."
    const withTool = toolGreeting ? `${toolGreeting} ${base}` : base
    setHasGreeted(true)
    setMessages([{ type: 'tex', text: withTool, contextual: false }])
  }, [pathname, hasGreeted, messages.length])

  // Plan nudge — non-blocking, once when plan is free
  const planNudgeSentRef = useRef(false)
  useEffect(() => {
    if (plan !== 'free' || planNudgeSentRef.current || messages.length === 0) return
    planNudgeSentRef.current = true
    setMessages((prev) => [
      ...prev,
      { type: 'tex', text: "You're on the free plan — 60 min/month. Ask me about upgrades.", contextual: true },
    ])
  }, [plan, messages.length])

  // Re-inject tool greeting when route changes and panel already has content (optional short line)
  const lastPathRef = useRef(pathname)
  useEffect(() => {
    if (messages.length === 0 || pathname === lastPathRef.current) return
    lastPathRef.current = pathname
    const toolGreeting = getToolGreeting(pathname)
    if (toolGreeting) {
      setMessages((prev) => [
        ...prev,
        { type: 'tex', text: toolGreeting, contextual: true },
      ])
    }
  }, [pathname])

  // Event subscription — observation only
  useEffect(() => {
    const unsub = subscribeTexEvents((type: TexEventType, payload: unknown) => {
      if (type === 'error') {
        const p = payload as { type: string; message?: string }
        const help = p.type === 'job_failed'
          ? "That run didn’t finish. Try again—if it keeps failing, check your file format and plan limits. I can explain limits if you ask."
          : "Something went wrong. Try again or ask me about file formats and limits."
        setMessages((prev) => [...prev, { type: 'tex', text: help, contextual: true }])
        return
      }
      if (type === 'job_completed') {
        const p = payload as { durationMs: number; toolId?: string }
        const sec = (p.durationMs / 1000).toFixed(1)
        setLastJobCompletedToolId(p.toolId)
        const runLabel =
          p.toolId === 'video-to-transcript'
            ? 'transcription'
            : p.toolId === 'video-to-subtitles'
              ? 'subtitles'
              : p.toolId === 'translate-subtitles'
                ? 'translation'
                : p.toolId === 'compress-video'
                  ? 'compressed video'
                  : p.toolId === 'burn-subtitles'
                    ? 'burned video'
                    : p.toolId === 'fix-subtitles'
                      ? 'fixed subtitles'
                      : p.toolId === 'batch-process'
                        ? 'batch'
                        : 'run'
        const isPlural =
          runLabel === 'subtitles' || runLabel === 'fixed subtitles'
        const donePhrase =
          runLabel === 'run'
            ? `That run finished in ${sec} seconds`
            : isPlural
              ? `Your ${runLabel} are done in ${sec} seconds`
              : `Your ${runLabel} is done in ${sec} seconds`
        const message = `Hey! 🎉 ${donePhrase} — blazing fast! ⚡

Go ahead and try it: copy, download, or use the result in your next step. I'm here if you need anything.

Helps us improve! Feel free to share your experience — stars and a comment below mean a lot. ⭐`
        setMessages((prev) => [
          ...prev,
          { type: 'tex', text: message, contextual: true },
        ])
        return
      }
      if (type === 'trigger') {
        const p = payload as { message: string; link?: { path: string; label: string } }
        setMessages((prev) => [
          ...prev,
          { type: 'tex', text: p.message, contextual: true, entry: p.link ? { id: '', keywords: [], question: '', answer: '', link: p.link } as TexEntry : undefined },
        ])
      }
    })
    return unsub
  }, [])

  // Trigger check when we have lastJobCompletedToolId (deterministic, no AI)
  const triggerCheckedRef = useRef(false)
  useEffect(() => {
    const trigger = getTexTrigger({
      pathname,
      plan,
      idleAfterUpload: Boolean(lastJobCompletedToolId),
      lastJobCompletedToolId,
    })
    if (!trigger || triggerCheckedRef.current) return
    triggerCheckedRef.current = true
    const entryWithLink: TexEntry | undefined = trigger.link
      ? { id: 'trigger', keywords: [], question: '', answer: trigger.message, link: trigger.link }
      : undefined
    setMessages((prev) => [
      ...prev,
      { type: 'tex', text: trigger.message, contextual: true, entry: entryWithLink },
    ])
  }, [pathname, plan, lastJobCompletedToolId])

  function showTexResponse(entry: TexEntry) {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        { type: 'tex', text: entry.answer, entry },
      ])
    }, TYPING_DELAY_MS)
  }

  function handleSuggestionClick(entryId: string) {
    const entry = getTexEntryById(entryId)
    if (!entry) return
    setMessages((prev) => [...prev, { type: 'user', text: entry.question }])
    showTexResponse(entry)
  }

  async function handleSendFeedback(e: React.FormEvent) {
    e.preventDefault()
    if (!lastJobCompletedToolId) return
    setFeedbackSending(true)
    try {
      await submitFeedback({
        toolId: lastJobCompletedToolId,
        stars: feedbackStars ?? undefined,
        comment: feedbackComment.trim() || undefined,
        userNameOrEmail: feedbackNameOrEmail.trim() || undefined,
        planAtSubmit: plan,
      })
      submittedFeedbackForToolIdRef.current = lastJobCompletedToolId
      setMessages((prev) => [
        ...prev,
        { type: 'tex', text: "Thanks! Your feedback helps us improve. 🙏", contextual: true },
      ])
      setFeedbackStars(null)
      setFeedbackComment('')
      setFeedbackNameOrEmail('')
    } catch {
      setMessages((prev) => [
        ...prev,
        { type: 'tex', text: "Couldn't send feedback right now. Try again later!", contextual: true },
      ])
    } finally {
      setFeedbackSending(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q) return
    setMessages((prev) => [...prev, { type: 'user', text: q }])
    setInput('')
    const entry = findTexEntryForQuery(q)
    if (entry) {
      showTexResponse(entry)
    } else {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages((prev) => [
          ...prev,
          {
            type: 'tex',
            text: "I'm not sure about that. Try a suggestion below or ask \"How does transcription work?\" or \"What's in the free plan?\"",
          },
        ])
      }, TYPING_DELAY_MS)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-600 bg-violet-50 dark:bg-violet-900/20">
        <div className="flex items-center gap-3">
          <TexAvatar size="md" pose="wave" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Tex</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">VideoText guide · Here to help</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages + suggestions */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : ''}`}
          >
            {msg.type === 'tex' && <TexAvatar size="sm" className="shrink-0 mt-0.5" />}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.type === 'user'
                  ? 'bg-violet-600 text-white'
                  : msg.contextual
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100 border border-violet-200 dark:border-violet-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.entry?.link && (
                <Link
                  to={msg.entry.link.path}
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 rounded"
                >
                  {msg.entry.link.label} →
                </Link>
              )}
            </div>
            {msg.type === 'user' && <span className="shrink-0 w-8" />}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <TexAvatar size="sm" className="shrink-0 mt-0.5" />
            <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Feedback strip after job completion */}
        {showFeedbackStrip && (
          <div className="flex gap-3">
            <TexAvatar size="sm" className="shrink-0 mt-0.5" />
            <div className="rounded-2xl px-4 py-3 bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 max-w-[85%] space-y-2">
              <p className="text-xs font-medium text-violet-900 dark:text-violet-100">
                Helps us improve! Feel free to share your experience.
              </p>
              <div className="flex gap-1" role="group" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFeedbackStars(n)}
                    className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  >
                    <span className="text-lg leading-none">
                      {feedbackStars != null && n <= feedbackStars ? '⭐' : '☆'}
                    </span>
                  </button>
                ))}
              </div>
              <form onSubmit={handleSendFeedback} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value.slice(0, 500))}
                  placeholder="Share your experience (optional)..."
                  className="rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  maxLength={500}
                  aria-label="Share your experience"
                />
                {plan === 'free' && (
                  <input
                    type="text"
                    value={feedbackNameOrEmail}
                    onChange={(e) => setFeedbackNameOrEmail(e.target.value.slice(0, 500))}
                    placeholder="Name or email (optional)"
                    className="rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    maxLength={500}
                    aria-label="Name or email"
                  />
                )}
                <button
                  type="submit"
                  disabled={feedbackSending}
                  className="self-start text-sm font-medium text-violet-700 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded px-2 py-1"
                >
                  {feedbackSending ? 'Sending…' : 'Send feedback'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Suggested questions */}
        <div className="pt-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {TEX_SUGGESTIONS.map((s) => (
              <button
                key={s.entryId}
                type="button"
                onClick={() => handleSuggestionClick(s.entryId)}
                className="text-left text-xs px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 border border-transparent hover:border-violet-200 dark:hover:border-violet-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-600">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tools, plans, or issues..."
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:outline-none"
            aria-label="Ask Tex a question"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            aria-label="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </motion.div>
  )
}
