import { ApiError } from '@/lib/api/client'

/** Console helpers for debugging Activity / Notifications API flows. */
export function logApi(area: 'Activity' | 'Notifications', step: string, detail?: unknown) {
  if (detail !== undefined) {
    console.log(`[CirrusBoard:${area}]`, step, detail)
  } else {
    console.log(`[CirrusBoard:${area}]`, step)
  }
}

export function logApiError(area: 'Activity' | 'Notifications', step: string, err: unknown) {
  console.error(`[CirrusBoard:${area}] ERROR @`, step)
  if (err instanceof ApiError) {
    console.error(`[CirrusBoard:${area}]   status:`, err.status)
    console.error(`[CirrusBoard:${area}]   message:`, err.message)
    console.error(`[CirrusBoard:${area}]   body:`, err.body)
  } else if (err instanceof Error) {
    console.error(`[CirrusBoard:${area}]   message:`, err.message)
    console.error(`[CirrusBoard:${area}]   stack:`, err.stack)
  } else {
    console.error(`[CirrusBoard:${area}]   raw:`, err)
  }
}
