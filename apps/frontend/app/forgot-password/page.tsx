'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, ArrowLeft, Lock } from 'lucide-react'

const Background3D = dynamic(
  () => import('@/components/3d/background-3d').then((mod) => mod.Background3D),
  { ssr: false },
)

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Background3D />

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Zap className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl text-foreground">TaskFlow</span>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Lock className="w-6 h-6" />
              Change your password
            </CardTitle>
            <CardDescription>
              Sign in, then open Settings to update your password. Email reset is
              not available yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard/settings">Go to settings (after sign in)</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
