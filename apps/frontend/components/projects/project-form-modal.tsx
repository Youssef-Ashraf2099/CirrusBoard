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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import type { Project, Team, User } from '@/lib/types'
import { api, ApiError } from '@/lib/api/client'

interface ProjectFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Default team when creating (e.g. manager filter or session team). */
  defaultTeamId: string
  project?: Project | null
  onSaved: () => void
}

export function ProjectFormModal({
  open,
  onOpenChange,
  defaultTeamId,
  project,
  onSaved,
}: ProjectFormModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lifecycle, setLifecycle] = useState<'active' | 'archived'>('active')
  const [teamId, setTeamId] = useState(defaultTeamId)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamEmployees, setTeamEmployees] = useState<User[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [memberUserIds, setMemberUserIds] = useState<string[]>([])
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
      setTeamId(project.teamId || defaultTeamId)
      void api
        .getProject(project.id, true)
        .then((p) => setMemberUserIds(p.memberUserIds ?? []))
        .catch(() => setMemberUserIds(project.memberUserIds ?? []))
    } else {
      setName('')
      setDescription('')
      setLifecycle('active')
      setTeamId(defaultTeamId)
      setMemberUserIds([])
    }
  }, [open, project, defaultTeamId])

  useEffect(() => {
    if (!open || !teamId) {
      setTeamEmployees([])
      return
    }
    setEmployeesLoading(true)
    void api
      .getTeam(teamId)
      .then((team) => {
        const employees = team.members.filter((m) => m.role === 'employee')
        setTeamEmployees(employees)
      })
      .catch(() => setTeamEmployees([]))
      .finally(() => setEmployeesLoading(false))
  }, [open, teamId])

  useEffect(() => {
    if (!open || isEdit) return
    setMemberUserIds([])
  }, [open, isEdit, teamId])

  useEffect(() => {
    if (!open || teams.length === 0) return
    if (!teams.some((t) => t.id === teamId)) {
      setTeamId(teams[0]?.id ?? defaultTeamId)
    }
  }, [open, teams, teamId, defaultTeamId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!teamId) {
      toast.error('Select a team for this project')
      return
    }
    setSubmitting(true)
    try {
      if (project) {
        await api.updateProject(project.id, {
          name,
          description,
          status: lifecycle === 'archived' ? 'ARCHIVED' : 'ACTIVE',
          teamId,
          memberUserIds,
        })
        toast.success('Project updated')
      } else {
        await api.createProject({
          name,
          description,
          teamId,
          memberUserIds,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
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
              value={teamId || undefined}
              onValueChange={setTeamId}
              disabled={teamsLoading || teams.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    teamsLoading
                      ? 'Loading teams…'
                      : teams.length === 0
                        ? 'No teams — create one first'
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
              Employees only see projects they are assigned to below.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Assigned employees</Label>
            <p className="text-xs text-muted-foreground">
              Only these employees appear in the assignee list when creating
              tasks for this project.
            </p>
            {employeesLoading ? (
              <p className="text-sm text-muted-foreground py-2">Loading…</p>
            ) : teamEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No employees on this team. Add them in User management first.
              </p>
            ) : (
              <ul className="max-h-40 overflow-y-auto space-y-2 rounded-md border border-border p-3">
                {teamEmployees.map((emp) => {
                  const checked = memberUserIds.includes(emp.id)
                  return (
                    <li key={emp.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`proj-emp-${emp.id}`}
                        checked={checked}
                        onCheckedChange={(on) => {
                          setMemberUserIds((prev) =>
                            on
                              ? [...prev, emp.id]
                              : prev.filter((id) => id !== emp.id),
                          )
                        }}
                      />
                      <label
                        htmlFor={`proj-emp-${emp.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {emp.name}
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({emp.id})
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
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
