import { NextRequest, NextResponse } from 'next/server'

export function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.CIRRUSBOARD_BACKEND_URL ||
    'http://127.0.0.1:3001'
  ).replace(/\/$/, '')
}

export async function forwardRequest(req: NextRequest): Promise<NextResponse> {
  const target = `${getBackendBaseUrl()}${req.nextUrl.pathname}${req.nextUrl.search}`

  let body: ArrayBuffer | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer()
  }

  const headers = new Headers()
  req.headers.forEach((value, key) => {
    const lk = key.toLowerCase()
    if (
      ['host', 'connection', 'content-encoding', 'transfer-encoding'].includes(
        lk,
      )
    ) {
      return
    }
    headers.set(key, value)
  })

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
  })

  const outHeaders = new Headers(res.headers)
  outHeaders.delete('transfer-encoding')

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  })
}
