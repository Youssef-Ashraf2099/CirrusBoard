'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ProtectedRoute, useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api/client'
import { DEFAULT_TEAM_ID } from '@/lib/config'
import type { User } from '@/lib/types'
import { UserPlus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { isAdminRole } from '@/lib/roles'

type FormState = {
  name: string
  email: string
  password: string
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN'
  primaryTeamId: string
  isActive: boolean
}

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  password: '',
  role: 'EMPLOYEE',
  primaryTeamId: '',
  isActive: true,
})

export default function UsersManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <UsersManagementInner />
    </ProtectedRoute>
  )
}

function UsersManagementInner() {
  const { teamId, refreshUser, user: currentUser } = useAuth()
  const showAdminRole = isAdminRole(currentUser?.role)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await api.listUsers()
      setUsers(list)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setForm(emptyForm())
    setCreateOpen(true)
  }

  function openEdit(u: User) {
    setEditUser(u)
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role:
        u.role === 'admin'
          ? 'ADMIN'
          : u.role === 'manager'
            ? 'MANAGER'
            : 'EMPLOYEE',
      primaryTeamId: u.teamId,
      isActive: true,
    })
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.createUser({
        name: form.name,
        email: form.email,
        password: form.password || 'changeme',
        role: form.role,
        primaryTeamId: form.primaryTeamId || undefined,
      })
      toast.success('User created')
      setCreateOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create')
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    try {
      const patch: Parameters<typeof api.updateUser>[1] = {
        name: form.name,
        email: form.email,
        role: form.role,
        primaryTeamId: form.primaryTeamId,
        isActive: form.isActive,
      }
      if (form.password) patch.password = form.password
      await api.updateUser(editUser.id, patch)
      toast.success('User updated')
      setEditUser(null)
      await load()
      await refreshUser().catch(() => {})
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update')
    }
  }

  async function removeUser(u: User) {
    if (!confirm(`Remove ${u.name}? Tasks referencing this user may need cleanup.`))
      return
    try {
      await api.deleteUser(u.id)
      toast.success('User removed')
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User management</h1>
          <p className="text-muted-foreground">
            CRUD mapped to Nest `POST/PATCH/DELETE /users` (+ list via scan for demo).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" type="button" onClick={() => void load()}>
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          </Button>
          <Button className="gap-2" type="button" onClick={openCreate}>
            <UserPlus className="w-4 h-4" />
            Invite user
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>Team · {teamId}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users returned for this team filter. Try global list via backend scan (leave team filter) from API client or create the first account from login.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void removeUser(u)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitCreate}>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="min 8 chars recommended"
                />
              </Field>
              <Field label="Role">
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, role: v as FormState['role'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    {showAdminRole && (
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Primary team id">
                <Input
                  value={form.primaryTeamId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, primaryTeamId: e.target.value }))
                  }
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitEdit}>
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </Field>
              <Field label="New password (optional)">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </Field>
              <Field label="Role">
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, role: v as FormState['role'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    {showAdminRole && (
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Primary team id">
                <Input
                  value={form.primaryTeamId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, primaryTeamId: e.target.value }))
                  }
                />
              </Field>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, isActive: v === true }))
                  }
                />
              </div>
            </div>
            <Separator className="my-2" />
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
