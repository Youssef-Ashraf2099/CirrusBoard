import { NextRequest } from 'next/server'
import { forwardRequest } from '@/lib/server/backend-proxy'

export async function GET(request: NextRequest) {
  return forwardRequest(request)
}
