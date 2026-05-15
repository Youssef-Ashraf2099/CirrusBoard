import { NextRequest } from 'next/server'
import { forwardRequest } from '@/lib/server/backend-proxy'

/** Mirrors Nest GET /api/projects/team/:teamId */
export async function GET(request: NextRequest) {
  return forwardRequest(request)
}
