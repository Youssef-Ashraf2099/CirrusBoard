'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Zap,
  CheckCircle2,
  Users,
  BarChart3,
  ArrowRight,
  Star,
  Sparkles,
  Shield,
  Clock,
  Target,
  Layers,
} from 'lucide-react'

const HeroScene = dynamic(
  () => import('@/components/3d/hero-scene').then((mod) => mod.HeroScene),
  { ssr: false }
)

const Background3D = dynamic(
  () => import('@/components/3d/background-3d').then((mod) => mod.Background3D),
  { ssr: false }
)

const features = [
  {
    icon: <Layers className="w-6 h-6" />,
    title: 'Intuitive Kanban Boards',
    description: 'Visualize your workflow with drag-and-drop task management across customizable columns.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Team Collaboration',
    description: 'Assign tasks, leave comments, and keep your entire team aligned on project goals.',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Real-time Analytics',
    description: 'Track progress with beautiful charts and actionable insights into team performance.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Role-based Access',
    description: 'Secure your workspace with manager, employee, and admin roles with granular permissions.',
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Smart Deadlines',
    description: 'Never miss a deadline with automated reminders and priority-based task sorting.',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Goal Tracking',
    description: 'Set project milestones and track completion rates to keep teams motivated.',
  },
]

const testimonials = [
  {
    quote: 'TaskFlow transformed how our engineering team operates. We shipped 40% faster within the first month.',
    author: 'Sarah Chen',
    role: 'VP of Engineering, TechCorp',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    quote: 'The best project management tool we have ever used. Clean, fast, and incredibly intuitive.',
    author: 'Marcus Johnson',
    role: 'Product Manager, StartupXYZ',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
  },
  {
    quote: 'Finally, a task management app that my entire team actually enjoys using. Game changer.',
    author: 'Emily Rodriguez',
    role: 'Design Lead, Creative Agency',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Background3D />
      
      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <span className="font-bold text-xl text-foreground">TaskFlow</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
              Testimonials
            </Link>
            <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="gap-2">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge variant="outline" className="mb-6 gap-2 px-4 py-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Now with AI-powered task suggestions
              </Badge>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 text-balance">
                Ship faster with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  TaskFlow
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-lg">
                The modern task management platform that helps teams collaborate, 
                track progress, and deliver projects on time.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <Link href="/signup">
                  <Button size="lg" className="gap-2 text-lg px-8">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="gap-2 text-lg px-8">
                    View Demo
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Free 14-day trial
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  No credit card required
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <HeroScene />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-muted-foreground mb-8">
            Trusted by 10,000+ teams worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50">
            {['TechCorp', 'Innovate Inc', 'StartupXYZ', 'Enterprise Co', 'Growth Labs'].map((company) => (
              <motion.span
                key={company}
                className="text-xl font-semibold text-foreground"
                whileHover={{ scale: 1.1 }}
              >
                {company}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-4xl font-bold text-foreground mb-4 text-balance">
              Everything you need to manage projects
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help your team stay organized and deliver exceptional results.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all group">
                  <CardContent className="p-6">
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 text-primary"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {feature.icon}
                    </motion.div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl font-bold text-foreground mb-4 text-balance">
              Loved by teams everywhere
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what our customers have to say about their experience with TaskFlow.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-foreground mb-6 italic">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.author}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-foreground">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
            <Card className="relative border-border/50 bg-card/80 backdrop-blur-sm p-12">
              <CardContent className="p-0">
                <h2 className="text-4xl font-bold text-foreground mb-4 text-balance">
                  Ready to transform your workflow?
                </h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of teams already using TaskFlow to ship faster and collaborate better.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="gap-2 text-lg px-8">
                      Start Free Trial
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button size="lg" variant="outline" className="gap-2 text-lg px-8">
                      View Demo
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">TaskFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 TaskFlow. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
