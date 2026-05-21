'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Search, Users, Mail, Shield, UserCheck, Crown, Info } from 'lucide-react'
import type { Team, User } from '@/lib/types'
import { api, ApiError } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

const roleColors = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  manager: 'bg-primary/10 text-primary border-primary/20',
  employee: 'bg-muted text-muted-foreground border-border',
}

const roleIcons = {
  admin: <Crown className="w-3 h-3" />,
  manager: <Shield className="w-3 h-3" />,
  employee: <UserCheck className="w-3 h-3" />,
}

export default function TeamPage() {
  const { teamId, user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [members, setMembers] = useState<User[]>([])
  const [teamRecord, setTeamRecord] = useState<Team | null>(null)
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const canManageTeams =
    currentUser?.role === 'admin' || currentUser?.role === 'manager'

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const all = await api.listUsers()
      const onTeam = all.filter((u) => u.teamId === teamId)
      setMembers(onTeam.length ? onTeam : all)

      try {
        const team = await api.getTeam(teamId)
        setTeamRecord(team)
      } catch {
        setTeamRecord(null)
      }

      if (canManageTeams) {
        const teams = await api.listTeams().catch(() => [] as Team[])
        setAllTeams(teams)
      } else {
        setAllTeams([])
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load team')
    } finally {
      setLoading(false)
    }
  }, [teamId, canManageTeams])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredUsers = members.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground">
            {teamRecord
              ? `${teamRecord.name} · members with primary team ${teamId}`
              : `Members with primary team ${teamId} (no Teams table row yet)`}
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            How &quot;Team&quot; works in CirrusBoard
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            This page lists <strong>users</strong> whose <code className="text-xs">primaryTeamId</code> matches
            your session team (<code className="text-xs">{teamId}</code>). That is the day-to-day &quot;team&quot;
            for projects and tasks. A separate <strong>Teams</strong> entity in DynamoDB (name, manager,
            member list) is optional — use User management to assign <code className="text-xs">primaryTeamId</code>.
            {canManageTeams && ' Admins and managers can see all Teams records below.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {canManageTeams && allTeams.length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Teams registry</CardTitle>
            <p className="text-sm text-muted-foreground">
              {allTeams.length} team record{allTeams.length === 1 ? '' : 's'} from{' '}
              <code className="text-xs">GET /api/teams</code>
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {allTeams.map((t) => (
                <li
                  key={t.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2',
                    t.id === teamId && 'border-primary/40 bg-primary/5',
                  )}
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted-foreground text-xs font-mono">{t.id}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">People on your team</CardTitle>
            <p className="text-sm text-muted-foreground">
              {members.length} members loaded
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
              <Button variant="outline" size="sm" type="button" asChild>
                <a href="/dashboard/teams">Manage teams</a>
              </Button>
            )}
            <Button variant="outline" size="sm" type="button" asChild>
              <a href="/dashboard/users">User management</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              {members.length === 0
                ? 'No users with this primaryTeamId — create users via signup or User management.'
                : 'No matches for that search.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('capitalize gap-1', roleColors[user.role])}
                      >
                        {roleIcons[user.role]}
                        {user.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
