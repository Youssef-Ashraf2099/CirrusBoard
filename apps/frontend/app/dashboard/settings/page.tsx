'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User,
  Lock,
  Sun,
  Moon,
  Monitor,
  Save,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api, ApiError } from '@/lib/api/client'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, updateUser, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user?.name, user?.email])

  const profileDirty = useMemo(() => {
    if (!user) return false
    const n = name.trim()
    const e = email.trim().toLowerCase()
    return n !== (user.name ?? '').trim() || e !== (user.email ?? '').trim().toLowerCase()
  }, [user, name, email])

  async function saveProfile() {
    if (!user?.id) return
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Enter a valid email address')
      return
    }
    if (!profileDirty) return

    setSavingProfile(true)
    try {
      const updated = await api.updateUser(user.id, {
        name: trimmedName,
        email: trimmedEmail,
      })
      updateUser(updated)
      await refreshUser()
      toast.success('Profile updated')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword() {
    if (!user?.id) return
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      await api.updateUser(user.id, { password: newPassword })
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not update password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Update your account details and password
        </p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Your name and email are saved to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-xl">
                {user?.name?.charAt(0) ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">
                {user?.name ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {user?.email ?? '—'}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={user?.role ?? ''}
                disabled
                className="capitalize"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Input id="team" value={user?.teamId ?? ''} disabled />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              className="gap-2"
              type="button"
              onClick={() => void saveProfile()}
              disabled={savingProfile || !user || !profileDirty}
            >
              {savingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password
          </CardTitle>
          <CardDescription>
            Choose a new password (at least 8 characters)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button
            className="gap-2"
            type="button"
            onClick={() => void savePassword()}
            disabled={
              savingPassword ||
              !user ||
              !newPassword ||
              newPassword !== confirmPassword
            }
          >
            {savingPassword ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Theme</CardTitle>
          <CardDescription>Applies across the app on this device</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ] as const
            ).map((themeOption) => (
              <button
                key={themeOption.value}
                type="button"
                onClick={() => setTheme(themeOption.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  (theme ?? 'system') === themeOption.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <themeOption.icon
                  className={`w-5 h-5 mx-auto mb-1.5 ${
                    (theme ?? 'system') === themeOption.value
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                />
                <p className="text-sm font-medium text-foreground">
                  {themeOption.label}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
