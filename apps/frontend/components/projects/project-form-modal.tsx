'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Project } from '@/lib/types'
import { api, ApiError } from '@/lib/api/client'

interface ProjectFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  project?: Project | null
  onSaved: () => void
}

export function ProjectFormModal({
  open,
  onOpenChange,
  teamId,
  project,
  onSaved,
}: ProjectFormModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lifecycle, setLifecycle] = useState<'active' | 'archived'>('active')
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!project

  useEffect(() => {
    if (!open) return
    if (project) {
      setName(project.name)
      setDescription(project.description ?? '')
      setLifecycle(project.status === 'archived' ? 'archived' : 'active')
    } else {
      setName('')
      setDescription('')
      setLifecycle('active')
    }
  }, [open, project])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    setSubmitting(true)
    try {
      if (project) {
        await api.updateProject(project.id, {
          name,
          description,
          status: lifecycle === 'archived' ? 'ARCHIVED' : 'ACTIVE',
        })
        toast.success('Project updated')
      } else {
        await api.createProject({
          name,
          description,
          teamId,
        })
        toast.success('Project created')
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit project' : 'Create project'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proj-name">Name</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[88px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={lifecycle}
              onValueChange={(v) =>
                setLifecycle(v as typeof lifecycle)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
