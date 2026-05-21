import { api } from '@/lib/api/client'

export type UploadProgressHandler = (
  fileIndex: number,
  percent: number,
  fileName: string,
) => void

/**
 * Presign → PUT to S3 → confirm for each file (backend task must already exist).
 */
export async function uploadTaskAttachments(
  taskId: string,
  files: File[],
  onProgress?: UploadProgressHandler,
): Promise<void> {
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

    await api.confirmTaskUpload(taskId, {
      attachmentId: presign.attachment.attachmentId,
      key: presign.key,
      eTag: eTag ?? undefined,
      size: file.size,
    })
  }
}
