"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ProtectedRoute, useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import type { Team, User } from "@/lib/types";
import {
  Building2,
  Pencil,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { isAdminRole, isPrivilegedRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type TeamForm = {
  name: string;
  description: string;
  managerId: string;
  memberUserIds: string[];
};

const emptyTeamForm = (managerId: string): TeamForm => ({
  name: "",
  description: "",
  managerId,
  memberUserIds: [],
});

export default function TeamsManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "manager"]}>
      <TeamsManagementInner />
    </ProtectedRoute>
  );
}

function TeamsManagementInner() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [form, setForm] = useState<TeamForm>(emptyTeamForm(user?.id ?? ""));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([api.listTeams(), api.listUsers()]);
      setTeams(t);
      setUsers(u);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyTeamForm(user?.id ?? ""));
    setCreateOpen(true);
  }

  function openEdit(t: Team) {
    setEditTeam(t);
    setForm({
      name: t.name,
      description: t.description ?? "",
      managerId: t.managerId,
      memberUserIds: (t.members ?? []).map((m) => m.id),
    });
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createTeam({
        name: form.name,
        description: form.description || undefined,
        managerId: form.managerId || user?.id,
        memberUserIds: form.memberUserIds,
      });
      toast.success("Team created");
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Create failed");
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTeam) return;
    try {
      await api.updateTeam(editTeam.id, {
        name: form.name,
        description: form.description || undefined,
        managerId: form.managerId,
        memberUserIds: form.memberUserIds,
      });
      toast.success("Team updated");
      setEditTeam(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function handleDelete(t: Team) {
    if (!confirm(`Delete team "${t.name}"?`)) return;
    try {
      await api.deleteTeam(t.id);
      toast.success("Team deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const managerOptions = users.filter(
    (u) => u.role === "manager" || u.role === "admin",
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary" />
            Teams
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage team records. Assign employees via User management
            (Team dropdown) — they are added to the roster automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => void load()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {isPrivilegedRole(user?.role) && (
            <Button className="gap-2" type="button" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              New team
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team registry</CardTitle>
          <CardDescription>
            Managers and admins can create teams. Team managers may update teams
            they manage. Admins can delete teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No teams yet. Admins can create one with New team.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.id}
                    </TableCell>
                    <TableCell className="text-sm">
                      {userName(t.managerId)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.members?.length ?? 0} linked
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdminRole(user?.role) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="text-destructive"
                            onClick={() => void handleDelete(t)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TeamFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create team"
        form={form}
        setForm={setForm}
        users={users}
        onSubmit={submitCreate}
      />

      <TeamFormDialog
        open={!!editTeam}
        onOpenChange={(o) => !o && setEditTeam(null)}
        title={`Edit ${editTeam?.name ?? "team"}`}
        form={form}
        setForm={setForm}
        users={users}
        onSubmit={submitEdit}
      />
    </motion.div>
  );
}

function TeamFormDialog({
  open,
  onOpenChange,
  title,
  form,
  setForm,
  users,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  form: TeamForm;
  setForm: React.Dispatch<React.SetStateAction<TeamForm>>;
  users: User[];
  onSubmit: (e: React.FormEvent) => void;
}) {
  const managerOptions = users.filter(
    (u) => u.role === "manager" || u.role === "admin",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Manager</Label>
              <Select
                value={form.managerId}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, managerId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {managerOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <p className="text-xs text-muted-foreground">
                Select users by name. Their ids are saved automatically.
              </p>
              <div className="max-h-56 overflow-y-auto rounded-md border border-border p-3 space-y-2">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No users available.
                  </p>
                ) : (
                  users.map((u) => {
                    const checked = form.memberUserIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-muted/40",
                          checked && "bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            setForm((current) => ({
                              ...current,
                              memberUserIds: value
                                ? [...current.memberUserIds, u.id]
                                : current.memberUserIds.filter(
                                    (id) => id !== u.id,
                                  ),
                            }));
                          }}
                        />
                        <span className="flex-1">
                          <span className="font-medium">{u.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {u.role}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
