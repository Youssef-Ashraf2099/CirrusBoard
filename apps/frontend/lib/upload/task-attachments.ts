import { api, buildUserMap } from '@/lib/api/client'
import { mapApiTaskToTask } from '@/lib/api/mappers'
import type { Task } from '@/lib/types'

export type UploadProgressHandler = (
  fileIndex: number,
  percent: number,
  fileName: string,
) => void

/**
 * Presign → PUT to S3 → confirm for each file (backend task must already exist).
 * Returns the task from the last confirm (includes updated attachments).
 */
export async function uploadTaskAttachments(
  taskId: string,
  files: File[],
  onProgress?: UploadProgressHandler,
): Promise<Task | null> {
  let lastRaw = null as Awaited<ReturnType<typeof api.confirmTaskUpload>> | null

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const contentType = file.type || 'application/octet-stream'

    const presign = await api.requestTaskUploadUrl(taskId, {
      filename: file.name,
      contentType,
    })

    const eTag = await api.putFileToPresignedUrl(
      presign.uploadUrl,
      file,
      (percent) => onProgress?.(i, percent, file.name),
    )

    lastRaw = await api.confirmTaskUpload(taskId, {
      attachmentId: presign.attachment.attachmentId,
      key: presign.key,
      eTag: eTag ?? undefined,
      size: file.size,
    })
  }

  if (!lastRaw) return null
  const users = await api.listUsers().catch(() => [])
  return mapApiTaskToTask(lastRaw, buildUserMap(users), 0)
}
