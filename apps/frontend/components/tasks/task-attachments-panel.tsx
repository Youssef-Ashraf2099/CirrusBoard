'use client'

import { useCallback, useEffect, useState } from 'react'
import { mapApiTaskToTask } from '@/lib/api/mappers'
import { api, ApiError, buildUserMap } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Download, Upload, Loader2, ImageIcon } from 'lucide-react'
import { isPrivilegedRole } from '@/lib/roles'
import { useAuth } from '@/lib/auth-context'
import type { TaskAttachment } from '@/lib/types'
import { toast } from 'sonner'
import {
  FileUploadDropzone,
  patchStagedUploads,
  type StagedUpload,
} from '@/components/upload/file-upload-dropzone'
import { uploadTaskAttachments } from '@/lib/upload/task-attachments'
import { formatBytes } from '@/lib/utils'

interface TaskAttachmentsPanelProps {
  taskId: string
  attachments: TaskAttachment[]
  onAttachmentsChange: () => void
  allowUpload?: boolean
  compactUpload?: boolean
}

export function TaskAttachmentsPanel({
  taskId,
  attachments,
  onAttachmentsChange,
  allowUpload = true,
  compactUpload,
}: TaskAttachmentsPanelProps) {
  const [displayAttachments, setDisplayAttachments] =
    useState<TaskAttachment[]>(attachments)
  const [staged, setStaged] = useState<StagedUpload[]>([])
  const [uploading, setUploading] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [resizingId, setResizingId] = useState<string | null>(null)
  const { user } = useAuth()
  const canResize = isPrivilegedRole(user?.role)

  useEffect(() => {
    setDisplayAttachments(attachments)
  }, [attachments])

  const reloadAttachments = useCallback(async () => {
    try {
      const raw = await api.getTask(taskId)
      const users = await api.listUsers().catch(() => [])
      const mapped = mapApiTaskToTask(raw, buildUserMap(users), 0)
      setDisplayAttachments(mapped.attachments ?? [])
      return mapped.attachments ?? []
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Could not refresh attachments',
      )
      return null
    }
  }, [taskId])

  async function handleResize(att: TaskAttachment) {
    setResizingId(att.id)
    try {
      await api.resizeTaskAttachment(taskId, { attachmentId: att.id })
      toast.success('Resize Lambda invoked')
      onAttachmentsChange()
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Could not invoke image resize',
      )
    } finally {
      setResizingId(null)
    }
  }

  async function handleDownload(att: TaskAttachment) {
    setOpeningId(att.id)
    try {
      const { url } = await api.getAttachmentDownloadUrl(taskId, att.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : 'Could not open attachment',
      )
    } finally {
      setOpeningId(null)
    }
  }

  async function handleUploadStaged() {
    const pending = staged.filter((s) => s.status === 'staged')
    if (!pending.length) return

    setUploading(true)
    try {
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i]
        setStaged((prev) =>
          patchStagedUploads(prev, item.id, {
            status: 'uploading',
            progress: 0,
          }),
        )

        try {
          const updatedTask = await uploadTaskAttachments(
            taskId,
            [item.file],
            (_idx, percent) => {
              setStaged((prev) =>
                patchStagedUploads(prev, item.id, {
                  progress: percent,
                  status: 'uploading',
                }),
              )
            },
          )
          if (updatedTask?.attachments?.length) {
            setDisplayAttachments(updatedTask.attachments)
          }
          setStaged((prev) =>
            patchStagedUploads(prev, item.id, {
              status: 'complete',
              progress: 100,
            }),
          )
        } catch (err) {
          const msg =
            err instanceof ApiError ? err.message : 'Upload failed'
          setStaged((prev) =>
            patchStagedUploads(prev, item.id, {
              status: 'error',
              errorMessage: msg,
            }),
          )
          throw err
        }
      }
      toast.success('Attachments uploaded')
      setStaged([])
      await reloadAttachments()
      onAttachmentsChange()
    } catch {
      toast.error('One or more uploads failed')
    } finally {
      setUploading(false)
    }
  }

  const hasStaged = staged.some((s) => s.status === 'staged')
  const useCompactDropzone =
    compactUpload ?? displayAttachments.length > 0

  return (
    <div className="space-y-3">
      {displayAttachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
          {displayAttachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-card/50 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-foreground">
                  {att.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {att.size > 0 ? formatBytes(att.size) : 'Size pending'}
                  {' · '}
                  {new Date(att.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {canResize && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    disabled={resizingId === att.id}
                    onClick={() => void handleResize(att)}
                    title="Resize image"
                  >
                    {resizingId === att.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8"
                  disabled={openingId === att.id}
                  onClick={() => void handleDownload(att)}
                >
                  {openingId === att.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-1" />
                      Open
                    </>
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {allowUpload && (
        <>
          <FileUploadDropzone
            value={staged}
            onChange={setStaged}
            disabled={uploading}
            variant={useCompactDropzone ? 'compact' : 'default'}
          />
          {hasStaged && (
            <Button
              type="button"
              size="sm"
              disabled={uploading}
              onClick={() => void handleUploadStaged()}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {staged.filter((s) => s.status === 'staged').length}{' '}
                  file
                  {staged.filter((s) => s.status === 'staged').length !== 1
                    ? 's'
                    : ''}
                </>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
