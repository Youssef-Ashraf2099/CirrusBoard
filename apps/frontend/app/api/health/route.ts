import { NextRequest } from 'next/server'
import { forwardRequest } from '@/lib/server/backend-proxy'

/** Proxies GET /api/health → Nest (for local and ALB checks via Next). */
export async function GET(request: NextRequest) {
  return forwardRequest(request)
}
