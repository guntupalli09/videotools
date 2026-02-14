/**
 * Request ID middleware: read x-request-id from edge (e.g. Caddy) or generate UUID.
 * Attaches to request context and returns in response header for correlation (UI → API → worker).
 */
import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

export const REQUEST_ID_HEADER = 'x-request-id'

export interface RequestWithId extends Request {
  requestId?: string
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER]
  const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : uuidv4()
  ;(req as RequestWithId).requestId = id
  res.setHeader(REQUEST_ID_HEADER, id)
  next()
}
