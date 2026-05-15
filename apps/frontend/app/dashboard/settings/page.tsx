'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Building,
  Mail,
  Lock,
  Smartphone,
  Sun,
  Moon,
  Monitor,
  Save,
  Upload,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskAssigned: true,
    taskCompleted: true,
    comments: true,
    deadlines: true,
  })

  const [appearance, setAppearance] = useState({
    compactMode: false,
    animationsEnabled: true,
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 max-w-4xl"
    >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                  <CardDescription>Update your personal details and profile picture</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20 border-2 border-primary/20">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="text-2xl">
                        {user?.name?.charAt(0) ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" className="gap-2 mb-2">
                        <Upload className="w-4 h-4" />
                        Change Avatar
                      </Button>
                      <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue={user?.name ?? ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={user?.email ?? ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input id="role" defaultValue={user?.role ?? ''} disabled className="capitalize" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select defaultValue="utc-8">
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utc-8">Pacific Time (UTC-8)</SelectItem>
                          <SelectItem value="utc-5">Eastern Time (UTC-5)</SelectItem>
                          <SelectItem value="utc">UTC</SelectItem>
                          <SelectItem value="utc+1">Central European Time (UTC+1)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Channels */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Notification Channels</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">Email Notifications</p>
                            <p className="text-sm text-muted-foreground">Receive updates via email</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifications.email}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">Receive push notifications</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifications.push}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Types */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Notification Types</h4>
                    <div className="space-y-4">
                      {[
                        { key: 'taskAssigned', label: 'Task Assigned', desc: 'When a task is assigned to you' },
                        { key: 'taskCompleted', label: 'Task Completed', desc: 'When a task you created is completed' },
                        { key: 'comments', label: 'Comments', desc: 'When someone comments on your tasks' },
                        { key: 'deadlines', label: 'Deadline Reminders', desc: 'Reminders before task deadlines' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{item.label}</p>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                          <Switch
                            checked={notifications[item.key as keyof typeof notifications] as boolean}
                            onCheckedChange={(checked) =>
                              setNotifications({ ...notifications, [item.key]: checked })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Appearance Settings</CardTitle>
                  <CardDescription>Customize the look and feel of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Theme</h4>
                    <div className="grid grid-cols-3 gap-4">
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
                          className={`p-4 rounded-lg border-2 transition-all ${
                            (theme ?? 'system') === themeOption.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <themeOption.icon
                            className={`w-6 h-6 mx-auto mb-2 ${
                              (theme ?? 'system') === themeOption.value
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            }`}
                          />
                          <p className="text-sm font-medium text-foreground">{themeOption.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Compact Mode</p>
                        <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                      </div>
                      <Switch
                        checked={appearance.compactMode}
                        onCheckedChange={(checked) => setAppearance({ ...appearance, compactMode: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Animations</p>
                        <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                      </div>
                      <Switch
                        checked={appearance.animationsEnabled}
                        onCheckedChange={(checked) => setAppearance({ ...appearance, animationsEnabled: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Security Settings</CardTitle>
                  <CardDescription>Manage your account security and authentication</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Password */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Change Password</h4>
                    <div className="grid gap-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                      <Button className="w-fit">Update Password</Button>
                    </div>
                  </div>

                  <Separator />

                  {/* 2FA */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-warning border-warning/30">
                        Not Enabled
                      </Badge>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>

                  <Separator />

                  {/* Sessions */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Active Sessions</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Monitor className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">Chrome on MacOS</p>
                            <p className="text-xs text-muted-foreground">Current session</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-success border-success/30">Active</Badge>
                      </div>
                    </div>
                    <Button variant="outline" className="text-destructive">Sign Out All Other Sessions</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
  )
}
