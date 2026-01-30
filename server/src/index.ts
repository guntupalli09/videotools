import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import uploadRoutes from './routes/upload'
import jobRoutes from './routes/jobs'
import downloadRoutes from './routes/download'
import usageRoutes from './routes/usage'
import batchRoutes from './routes/batch'
import billingRoutes from './routes/billing'
import authRoutes from './routes/auth'
import { stripeWebhookHandler } from './routes/stripeWebhook'
import { startWorker } from './workers/videoProcessor'
import { startFileCleanup } from './utils/fileCleanup'

const app = express()
const PORT = process.env.PORT || 3001

// Required behind Railway / Render / Fly / Vercel: trust one proxy hop so rate-limit doesn't throw on X-Forwarded-For
app.set('trust proxy', 1)

// Phase 2.5: Per-user upload rate limit (3/min) is applied in upload and batch routes; no global upload cap here.
// Optional: general API rate limit for other routes if needed
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many requests. Please wait.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Middleware
app.use(cors())

// Stripe webhook must receive the raw body for signature verification
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
)

// JSON body parsing for all other routes
app.use(express.json())
app.use('/api', generalLimiter)

// Routes
app.use('/api/upload', uploadRoutes)
app.use('/api/job', jobRoutes)
app.use('/api/download', downloadRoutes)
app.use('/api/usage', usageRoutes)
app.use('/api/batch', batchRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/auth', authRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)

  // Worker runs in a separate container when Dockerized (DISABLE_WORKER=true).
  if (process.env.DISABLE_WORKER !== 'true') {
    startWorker()
    console.log('Background worker started')
  }

  // Start file cleanup cron
  startFileCleanup()
  console.log('File cleanup cron started')
})

// Handle server errors gracefully
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`)
    console.error(`\nTo fix this, run one of these commands:`)
    console.error(`  Windows: netstat -ano | findstr :${PORT}`)
    console.error(`  Then: taskkill /F /PID [process_id]`)
    console.error(`\nOr change the PORT in your .env file\n`)
    process.exit(1)
  } else {
    console.error('Server error:', error)
    process.exit(1)
  }
})

// Handle process termination gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
