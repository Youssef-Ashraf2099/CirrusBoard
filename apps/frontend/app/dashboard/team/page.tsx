"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Search, Users, Mail, Shield, UserCheck, Crown } from "lucide-react";
import type { Team, User } from "@/lib/types";
import { api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { isPrivilegedRole } from "@/lib/roles";

const roleColors = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  manager: "bg-primary/10 text-primary border-primary/20",
  employee: "bg-muted text-muted-foreground border-border",
};

const roleIcons = {
  admin: <Crown className="w-3 h-3" />,
  manager: <Shield className="w-3 h-3" />,
  employee: <UserCheck className="w-3 h-3" />,
};

function mergeTeamMembers(roster: User[], byPrimaryTeam: User[]): User[] {
  const map = new Map<string, User>();
  for (const u of [...roster, ...byPrimaryTeam]) {
    map.set(u.id, u);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function TeamPage() {
  const { teamId: sessionTeamId, user: currentUser } = useAuth();
  const activeSessionTeamId = sessionTeamId || currentUser?.teamIds?.[0] || "";
  const canManageTeams = isPrivilegedRole(currentUser?.role);
  const [viewTeamId, setViewTeamId] = useState(activeSessionTeamId);
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<User[]>([]);
  const [teamRecord, setTeamRecord] = useState<Team | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setViewTeamId(activeSessionTeamId);
  }, [activeSessionTeamId]);

  const reload = useCallback(async () => {
    const activeTeamId = viewTeamId || activeSessionTeamId;
    if (!activeTeamId) {
      setMembers([]);
      setTeamRecord(null);
      setAllTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [team, byPrimary, teamList] = await Promise.all([
        api.getTeam(activeTeamId).catch(() => null),
        api.listUsers(activeTeamId).catch(() => [] as User[]),
        canManageTeams
          ? api.listTeams().catch(() => [] as Team[])
          : Promise.resolve([] as Team[]),
      ]);
      setTeamRecord(team);
      setAllTeams(teamList);
      const roster = team?.members ?? [];
      setMembers(mergeTeamMembers(roster, byPrimary));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not load team");
    } finally {
      setLoading(false);
    }
  }, [viewTeamId, activeSessionTeamId, canManageTeams]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredUsers = members.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeTeamName =
    teamRecord?.name ??
    allTeams.find((t) => t.id === viewTeamId)?.name ??
    viewTeamId;

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
            {activeTeamName ? `Members of ${activeTeamName}` : "Team members"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canManageTeams && allTeams.length > 0 && (
            <Select value={viewTeamId} onValueChange={setViewTeamId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {allTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, id…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">People on this team</CardTitle>
            <p className="text-sm text-muted-foreground">
              {members.length} member{members.length === 1 ? "" : "s"} · roster
              + users with primary team{" "}
              <code className="text-xs">{viewTeamId}</code>
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {canManageTeams && (
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
              No members yet. Assign users in User management (Team dropdown) —
              they appear here after save.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>User id</TableHead>
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
                      <code className="text-xs text-muted-foreground">
                        {user.id}
                      </code>
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
                        className={cn(
                          "capitalize gap-1",
                          roleColors[user.role],
                        )}
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
  );
}
