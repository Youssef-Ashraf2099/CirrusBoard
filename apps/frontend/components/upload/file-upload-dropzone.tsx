'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Upload, X, FileIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StagedUpload = {
  id: string
  name: string
  size: number
  type: string
  progress: number
  /** Simulated storage key — wire to S3 in production */
  key: string
}

function simulateProgress(
  id: string,
  onTick: (id: string, p: number) => void,
  onDone: (id: string) => void,
) {
  let p = 0
  const t = setInterval(() => {
    p += Math.random() * 18 + 5
    if (p >= 100) {
      p = 100
      clearInterval(t)
      onTick(id, 100)
      onDone(id)
    } else {
      onTick(id, p)
    }
  }, 120)
}

interface FileUploadDropzoneProps {
  value: StagedUpload[]
  onChange: (files: StagedUpload[]) => void
  accept?: string
  maxFiles?: number
  className?: string
}

export function FileUploadDropzone({
  value,
  onChange,
  accept,
  maxFiles = 8,
  className,
}: FileUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(value)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return
      const additions: StagedUpload[] = []
      for (let i = 0; i < fileList.length; i++) {
        if (valueRef.current.length + additions.length >= maxFiles) break
        const file = fileList[i]
        const id = crypto.randomUUID()
        const key = `local/${Date.now()}-${file.name}`
        additions.push({
          id,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          progress: 0,
          key,
        })
      }
      if (!additions.length) return

      const merged = [...valueRef.current, ...additions]
      valueRef.current = merged
      onChange(merged)

      for (const item of additions) {
        simulateProgress(
          item.id,
          (fid, prog) => {
            const next = valueRef.current.map((f) =>
              f.id === fid ? { ...f, progress: prog } : f,
            )
            valueRef.current = next
            onChange(next)
          },
          () => {},
        )
      }
    },
    [onChange, maxFiles],
  )

  const remove = (id: string) => {
    const next = valueRef.current.filter((f) => f.id !== id)
    valueRef.current = next
    onChange(next)
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
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
          or click to browse — uploads are staged locally for this demo
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
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
              <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <Progress value={f.progress} className="h-1.5 mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  {(f.size / 1024).toFixed(1)} KB · {Math.round(f.progress)}%
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => remove(f.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
