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
import type { Project, Team } from '@/lib/types'
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
  const [selectedTeamId, setSelectedTeamId] = useState(teamId)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!project

  useEffect(() => {
    if (!open) return
    setTeamsLoading(true)
    void api
      .listTeams()
      .then(setTeams)
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    if (project) {
      setName(project.name)
      setDescription(project.description ?? '')
      setLifecycle(project.status === 'archived' ? 'archived' : 'active')
      setSelectedTeamId(project.teamId || teamId)
    } else {
      setName('')
      setDescription('')
      setLifecycle('active')
      setSelectedTeamId(teamId)
    }
  }, [open, project, teamId])

  useEffect(() => {
    if (!open || isEdit) return
    if (teams.length > 0 && !teams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id)
    }
  }, [open, isEdit, teams, selectedTeamId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!selectedTeamId) {
      toast.error('Select a team for this project')
      return
    }
    setSubmitting(true)
    try {
      if (project) {
        await api.updateProject(project.id, {
          name,
          description,
          teamId: selectedTeamId,
          status: lifecycle === 'archived' ? 'ARCHIVED' : 'ACTIVE',
        })
        toast.success('Project updated')
      } else {
        await api.createProject({
          name,
          description,
          teamId: selectedTeamId,
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

  const teamLabel =
    teams.find((t) => t.id === selectedTeamId)?.name ?? selectedTeamId

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
            <Label>Team</Label>
            <Select
              value={selectedTeamId || undefined}
              onValueChange={setSelectedTeamId}
              disabled={teamsLoading || teams.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    teamsLoading
                      ? 'Loading teams…'
                      : teams.length === 0
                        ? 'No teams — create one in Teams'
                        : 'Select team'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only members of {teamLabel || 'this team'} can see this project.
            </p>
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
