/**
 * Founder dashboard API. Uses JWT from auth.
 * Founder status comes from lightweight /api/admin/me; dashboard from /api/admin/dashboard.
 */

import { api } from './api'

const FOUNDER_ME_KEY = 'videotext:founder'

/** Fetch lightweight founder check. Returns { isFounder: true } on 200, null on 401/403. */
export async function fetchFounderMe(): Promise<{ isFounder: true } | null> {
  const res = await api('/api/admin/me')
  if (!res.ok) return null
  const data = await res.json()
  return data?.isFounder === true ? { isFounder: true } : null
}

/** Read cached founder status from sessionStorage. */
export function getCachedFounderStatus(): boolean | null {
  if (typeof sessionStorage === 'undefined') return null
  const v = sessionStorage.getItem(FOUNDER_ME_KEY)
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

/** Write founder status to sessionStorage (session lifetime). */
export function setCachedFounderStatus(isFounder: boolean): void {
  try {
    sessionStorage?.setItem(FOUNDER_ME_KEY, String(isFounder))
  } catch {
    // ignore
  }
}

/** Clear cached founder status (e.g. on logout). */
export function clearCachedFounderStatus(): void {
  try {
    sessionStorage?.removeItem(FOUNDER_ME_KEY)
  } catch {
    // ignore
  }
}

export interface DashboardSnapshot {
  date?: string
  totalUsers?: number
  activeUsers?: number
  mrrCents?: number
  jobsCompleted?: number
  newUsers?: number
  jobsCreated?: number
  jobsFailed?: number
  status?: 'no_metrics_data'
}

export interface DashboardRevenue {
  mrrTrend: { monthStart: string; mrrCents: number }[]
  newMrrTrend: { monthStart: string; newMrrCents: number }[]
  churnedMrrTrend: { monthStart: string; churnedMrrCents: number }[]
  churnRateTrend: { monthStart: string; churnRatePercent: number | null }[]
}

export interface DashboardUsage {
  topUsersByJobCount: { userId: string; email: string; plan: string; jobCount: number }[]
  jobsByToolType: { toolType: string; count: number }[]
}

export interface DashboardPerformance {
  avgProcessingMs: number
  p95ProcessingMs: number
  failureRate: number
}

export interface DashboardRetention {
  activeUsersLast7Days: number
  activeUsersLast30Days: number
}

export interface DashboardFeedback {
  id: string
  toolId: string | null
  stars: number | null
  comment: string
  planAtSubmit: string | null
  createdAt: string
}

export interface DashboardUser {
  id: string
  email: string
  plan: string
  createdAt: string
  lastActiveAt: string | null
  utmSource: string | null
  firstReferrer: string | null
  totalJobs: number
  jobCount30d: number
}

export interface DashboardDailyPoint {
  date: string
  newUsers: number
  jobsCreated: number
  jobsCompleted: number
  jobsFailed: number
  mrrCents: number
  activeUsers: number
}

export interface DashboardPlanCount {
  plan: string
  count: number
}

export interface DashboardJob {
  id: string
  userId: string
  email: string | null
  toolType: string
  status: string
  processingMs: number | null
  videoDurationSec: number | null
  createdAt: string
  failureReason: string | null
  planAtRun: string | null
}

export interface DashboardData {
  snapshot: DashboardSnapshot
  revenue: DashboardRevenue
  usage: DashboardUsage
  performance: DashboardPerformance
  retention: DashboardRetention
  feedback: DashboardFeedback[]
  users: DashboardUser[]
  daily: DashboardDailyPoint[]
  planDistribution: DashboardPlanCount[]
  recentJobs: DashboardJob[]
}

export type FetchDashboardResult =
  | { ok: true; data: DashboardData }
  | { ok: false; status: 401 }
  | { ok: false; status: 403 }
  | { ok: false; status: 'error' }

/** Fetch founder dashboard. Distinguishes 401 (redirect to login) vs 403 (unauthorized) vs success. */
export async function fetchFounderDashboard(): Promise<FetchDashboardResult> {
  try {
    const res = await api('/api/admin/dashboard')
    if (res.status === 401) return { ok: false, status: 401 }
    if (res.status === 403) return { ok: false, status: 403 }
    if (!res.ok) return { ok: false, status: 'error' }
    const data = await res.json()
    return { ok: true, data }
  } catch {
    return { ok: false, status: 'error' }
  }
}
