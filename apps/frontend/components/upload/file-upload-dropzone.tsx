'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Upload, X, FileIcon, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn, createId } from '@/lib/utils'

export type StagedUploadStatus = 'staged' | 'uploading' | 'complete' | 'error'

export type StagedUpload = {
  id: string
  file: File
  name: string
  size: number
  type: string
  progress: number
  status: StagedUploadStatus
  errorMessage?: string
}

interface FileUploadDropzoneProps {
  value: StagedUpload[]
  onChange: (files: StagedUpload[]) => void
  accept?: string
  maxFiles?: number
  className?: string
  disabled?: boolean
}

export function FileUploadDropzone({
  value,
  onChange,
  accept,
  maxFiles = 8,
  className,
  disabled = false,
}: FileUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(value)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length || disabled) return
      const additions: StagedUpload[] = []
      for (let i = 0; i < fileList.length; i++) {
        if (valueRef.current.length + additions.length >= maxFiles) break
        const file = fileList[i]
        additions.push({
          id: createId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          progress: 0,
          status: 'staged',
        })
      }
      if (!additions.length) return
      const merged = [...valueRef.current, ...additions]
      valueRef.current = merged
      onChange(merged)
    },
    [onChange, maxFiles, disabled],
  )

  const remove = (id: string) => {
    if (disabled) return
    const next = valueRef.current.filter((f) => f.id !== id)
    valueRef.current = next
    onChange(next)
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          if (disabled) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (disabled) return
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40 bg-muted/20',
        )}
      >
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">
          Drag & drop files here
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse — files upload to S3 after the task is saved
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          disabled={disabled}
          accept={accept}
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              {f.status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : f.status === 'error' ? (
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              ) : (
                <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                {(f.status === 'uploading' || f.status === 'staged') && (
                  <Progress
                    value={f.status === 'staged' ? 0 : f.progress}
                    className="h-1.5 mt-1.5"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {(f.size / 1024).toFixed(1)} KB
                  {f.status === 'uploading' && ` · ${Math.round(f.progress)}%`}
                  {f.status === 'complete' && ' · uploaded'}
                  {f.status === 'error' && f.errorMessage
                    ? ` · ${f.errorMessage}`
                    : f.status === 'error'
                      ? ' · failed'
                      : ''}
                </p>
              </div>
              {f.status !== 'uploading' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  disabled={disabled}
                  onClick={() => remove(f.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Update progress/status for staged items by id (used during S3 upload). */
export function patchStagedUploads(
  current: StagedUpload[],
  id: string,
  patch: Partial<StagedUpload>,
): StagedUpload[] {
  return current.map((f) => (f.id === id ? { ...f, ...patch } : f))
}
