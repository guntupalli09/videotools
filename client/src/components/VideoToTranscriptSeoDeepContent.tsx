import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import CollapsibleToolSection from './CollapsibleToolSection'

export type VideoToTranscriptSeoDeepContent = {
  proofPoints?: string[]
  workflowSteps?: { title: string; detail: string }[]
  outputExamples?: { title: string; body: string }[]
  comparisonRows?: {
    feature: string
    videotext: string
    alternatives: string
  }[]
  useCases?: { title: string; body: string }[]
  visualProof?: { title: string; body: string; image?: string }[]
  technicalExplanation?: { title: string; body: string }[]
  ctaText?: string
  ctaPath?: string
}

type Props = {
  content: VideoToTranscriptSeoDeepContent
}

export default function VideoToTranscriptSeoDeepContent({ content }: Props) {
  const hasBody = Boolean(
    content.proofPoints?.length ||
      content.workflowSteps?.length ||
      content.outputExamples?.length ||
      content.comparisonRows?.length ||
      content.useCases?.length ||
      content.visualProof?.length ||
      content.technicalExplanation?.length,
  )

  if (!hasBody) return null

  return (
    <CollapsibleToolSection id="workflow-learn-more" title="Learn more about this workflow">
      <div className="max-w-5xl space-y-section">
{/* ── Proof points ── */}
{content?.proofPoints?.length ? (
  <div>
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
        By the numbers
      </p>
      <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
        Proof, not promises
      </h2>
    </div>
    <ul className="grid sm:grid-cols-2 gap-3" role="list">
      {content.proofPoints.map((point, idx) => (
        <li
          key={`proof-${idx}`}
          className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-5 py-4 shadow-sm"
        >
          <span
            className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50"
            aria-hidden
          >
            <svg
              className="w-3 h-3 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </span>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {point}
          </p>
        </li>
      ))}
    </ul>
    {content.ctaText && content.ctaPath && (
      <div className="mt-8">
        <Link
          to={content.ctaPath}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          {content.ctaText}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>
    )}
  </div>
) : null}

{/* ── Visual proof ── */}
{content?.visualProof?.length ? (
  <div>
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
        See the actual output
      </p>
      <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
        This is generated automatically in minutes
      </h2>
    </div>
    <div className="grid gap-component md:grid-cols-2 lg:grid-cols-4">
      {content.visualProof.map((proof, idx) => (
        <article
          key={`proof-${idx}`}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {proof.image && (
            <div className="relative bg-gray-100 dark:bg-gray-800 aspect-square overflow-hidden">
              <img
                src={proof.image}
                alt={proof.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="p-4">
            <h3 className="mb-2 font-medium text-sm text-gray-900 dark:text-gray-100 leading-snug">
              {proof.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {proof.body}
            </p>
          </div>
        </article>
      ))}
    </div>
    <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
      No manual cleanup. No editing. Ready to use directly in your
      workflow.
    </p>
  </div>
) : null}
{content?.workflowSteps?.length ? (
  <div>
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
        How it works
      </p>
      <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
        Three steps, no setup
      </h2>
    </div>
    <div className="grid gap-component-sm md:grid-cols-3">
      {content.workflowSteps.map((step, idx) => (
        <article
          key={`step-${idx}`}
          className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-6 shadow-sm"
        >
          <span
            className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold"
            aria-hidden
          >
            {idx + 1}
          </span>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {step.detail}
          </p>
        </article>
      ))}
    </div>
  </div>
) : null}

{/* ── Output examples ── */}
{content?.outputExamples?.length ? (
  <div>
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
        What you get
      </p>
      <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
        Not raw text — ready-to-use content
      </h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Transcript, summary, chapters, and subtitles. All from one
        upload.
      </p>
    </div>
    <div className="grid gap-component-sm md:grid-cols-3">
      {content.outputExamples.map((example, idx) => {
        const accentBorder = [
          "border-t-blue-500",
          "border-t-blue-500",
          "border-t-emerald-500",
        ][idx % 3];
        return (
          <article
            key={`example-${idx}`}
            className={`rounded-xl border border-gray-200 dark:border-gray-700 border-t-2 ${accentBorder} bg-white dark:bg-gray-900/70 p-6 shadow-sm`}
          >
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              {example.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {example.body}
            </p>
          </article>
        );
      })}
    </div>
  </div>
) : null}

{/* ── Comparison table ── */}
{content?.comparisonRows?.length ? (
  <div>
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
        Compare
      </p>
      <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
        VideoText vs alternatives
      </h2>
    </div>
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-1/3">
              Feature
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 w-1/3">
              VideoText
            </th>
            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-1/3">
              Typical alternatives
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950/20">
          {content.comparisonRows.map((row, idx) => (
            <tr
              key={`cmp-${idx}`}
              className={
                idx % 2 === 1
                  ? "bg-gray-50/60 dark:bg-gray-900/20"
                  : ""
              }
            >
              <td className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {row.feature}
              </td>
              <td className="px-5 py-4 font-medium text-gray-900 dark:text-gray-100">
                {row.videotext}
              </td>
              <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                {row.alternatives}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
) : null}

{/* ── Technical explanation ── */}
{content?.technicalExplanation?.length ? (
  <div>
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
        How it works
      </p>
      <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
        Why VideoText is faster than everyone else
      </h2>
    </div>
    <div className="space-y-component-sm">
      {content.technicalExplanation.map((tech, idx) => (
        <article
          key={`tech-${idx}`}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-6 shadow-sm"
        >
          <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
            {tech.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {tech.body}
          </p>
        </article>
      ))}
    </div>
  </div>
) : null}

{/* ── Use cases ── */}
{content?.useCases?.length ? (
  <div>
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
        Who it's for
      </p>
      <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
        Built for people who need it done fast
      </h2>
    </div>
    <div className="grid gap-component-sm sm:grid-cols-2">
      {content.useCases.map((useCase, idx) => (
        <article
          key={`usecase-${idx}`}
          className="flex items-start gap-component-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-5 shadow-sm"
        >
          <span
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold"
            aria-hidden
          >
            {idx + 1}
          </span>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              {useCase.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {useCase.body}
            </p>
          </div>
        </article>
      ))}
    </div>
    {content.ctaText && content.ctaPath && (
      <div className="mt-8">
        <Link
          to={content.ctaPath}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          {content.ctaText}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>
    )}
  </div>
) : null}
      </div>
    </CollapsibleToolSection>
  )
}
