import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, getBackendBaseUrl } from '@/lib/server/backend-proxy'

export async function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get('teamId')
  if (!teamId) {
    return NextResponse.json([])
  }
  const url = `${getBackendBaseUrl()}/api/tasks/team/${encodeURIComponent(teamId)}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? [], { status: res.status })
}

export async function POST(request: NextRequest) {
  return forwardRequest(request)
}
