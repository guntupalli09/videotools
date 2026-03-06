/**
 * Founder dashboard API. Uses JWT from auth.
 * Founder status comes from lightweight /api/admin/me; dashboard from /api/admin/dashboard.
 */

import { api } from './api'

const FOUNDER_ME_KEY = 'videotext:founder'

export async function fetchFounderMe(): Promise<{ isFounder: true } | null> {
  const res = await api('/api/admin/me')
  if (!res.ok) return null
  const data = await res.json()
  return data?.isFounder === true ? { isFounder: true } : null
}

export function getCachedFounderStatus(): boolean | null {
  if (typeof sessionStorage === 'undefined') return null
  const v = sessionStorage.getItem(FOUNDER_ME_KEY)
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

export function setCachedFounderStatus(isFounder: boolean): void {
  try { sessionStorage?.setItem(FOUNDER_ME_KEY, String(isFounder)) } catch { /* ignore */ }
}

export function clearCachedFounderStatus(): void {
  try { sessionStorage?.removeItem(FOUNDER_ME_KEY) } catch { /* ignore */ }
}

export interface DashboardSnapshot {
  date?: string
  totalUsers?: number
  activeUsers?: number
  mrrCents?: number
  arpuCents?: number
  jobsCompleted?: number
  newUsers?: number
  jobsCreated?: number
  jobsFailed?: number
  newPaidUsers?: number
  churnedUsers?: number
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
  totalUsers: number
  jobsCreated: number
  jobsCompleted: number
  jobsFailed: number
  mrrCents: number
  activeUsers: number
  churnedUsers: number
  newPaidUsers: number
  avgProcessingMs: number | null
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

export interface DashboardUtmEntry {
  source: string
  count: number
}

export interface DashboardFailureReason {
  reason: string
  count: number
}

export interface DashboardFeedbackByTool {
  toolId: string
  avgStars: number
  count: number
}

export interface DashboardStarDist {
  stars: number
  count: number
}

export interface DashboardServerHealth {
  queueWaiting: number
  queueActive: number
  queueFailed: number
  queueCompleted: number
  queueDelayed: number
  workerLastHeartbeatAgeMs: number | null
  workerStatus: 'healthy' | 'stale' | 'unknown'
  redisOk: boolean
  dbOk: boolean
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
  utmBreakdown: DashboardUtmEntry[]
  failureReasons: DashboardFailureReason[]
  feedbackByTool: DashboardFeedbackByTool[]
  starDistribution: DashboardStarDist[]
}

export type FetchDashboardResult =
  | { ok: true; data: DashboardData }
  | { ok: false; status: 401 }
  | { ok: false; status: 403 }
  | { ok: false; status: 'error' }

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

export async function fetchServerHealth(): Promise<DashboardServerHealth | null> {
  try {
    const res = await api('/api/admin/server-health')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
