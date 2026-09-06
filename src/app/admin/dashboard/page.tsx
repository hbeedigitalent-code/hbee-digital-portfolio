// src/app/admin/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalClients: number
  newLeads: number
  pendingAssessments: number
  pendingOnboarding: number
  tasksDueThisWeek: number
  overdueTasks: number
  pendingInquiries: number
  revenuePipeline: number
  projectCompletionRate: number
  totalGrowthScores: number
  growthReady: number
}

export default function AdminDashboardPage() {
  const supabase = createClientComponentClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [quickActions, setQuickActions] = useState([
    { name: 'New Assessment', href: '/admin/growth-assessments', icon: 'growth-readiness' },
    { name: 'New Lead', href: '/admin/crm/new', icon: 'user' },
    { name: 'New Project', href: '/admin/projects/new', icon: 'projects' },
    { name: 'New Task', href: '/admin/tasks/new', icon: 'check' },
    { name: 'New Blog Post', href: '/admin/blog/new', icon: 'blog' },
  ])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)

    const [
      projectsRes,
      clientsRes,
      leadsRes,
      assessmentsRes,
      onboardingRes,
      tasksRes,
      inquiriesRes,
      invoicesRes,
      growthScoresRes
    ] = await Promise.all([
      supabase.from('projects').select('status, progress', { count: 'exact' }),
      supabase.from('clients').select('status', { count: 'exact' }),
      supabase.from('leads').select('status', { count: 'exact' }).eq('status', 'New Lead'),
      supabase.from('growth_assessments').select('status', { count: 'exact' }).eq('status', 'New Submission'),
      supabase.from('client_onboarding_submissions').select('status', { count: 'exact' }).eq('status', 'New Submission'),
      supabase.from('tasks').select('status, due_date'),
      supabase.from('contact_submissions').select('is_read', { count: 'exact' }).eq('is_read', false),
      supabase.from('project_invoices').select('status, amount').eq('status', 'overdue'),
      supabase.from('growth_scores').select('classification', { count: 'exact' }),
    ])

    const totalProjects = projectsRes.data?.length || 0
    const activeProjects = projectsRes.data?.filter((p: any) => p.status !== 'Completed' && p.status !== 'Archived').length || 0
    const totalClients = clientsRes.data?.length || 0
    const newLeads = leadsRes.count || 0
    const pendingAssessments = assessmentsRes.count || 0
    const pendingOnboarding = onboardingRes.count || 0
    
    const today = new Date()
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const tasksDueThisWeek = tasksRes.data?.filter((t: any) => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      return dueDate >= today && dueDate <= weekEnd
    }).length || 0

    const overdueTasks = tasksRes.data?.filter((t: any) => {
      if (!t.due_date) return false
      return new Date(t.due_date) < today
    }).length || 0

    const pendingInquiries = inquiriesRes.count || 0
    const revenuePipeline = invoicesRes.data?.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0) || 0
    
    const completedProjects = projectsRes.data?.filter((p: any) => p.status === 'Completed').length || 0
    const projectCompletionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0

    const totalGrowthScores = growthScoresRes.data?.length || 0
    const growthReady = growthScoresRes.data?.filter((s: any) => s.classification === 'Growth Ready' || s.classification === 'Scale Ready').length || 0

    setStats({
      totalProjects,
      activeProjects,
      totalClients,
      newLeads,
      pendingAssessments,
      pendingOnboarding,
      tasksDueThisWeek,
      overdueTasks,
      pendingInquiries,
      revenuePipeline,
      projectCompletionRate,
      totalGrowthScores,
      growthReady
    })

    const activities: any[] = []
    
    const { data: recentAssessments } = await supabase
      .from('growth_assessments')
      .select('id, status, created_at, merchants(business_name)')
      .order('created_at', { ascending: false })
      .limit(3)

    if (recentAssessments) {
      recentAssessments.forEach((a: any) => {
        activities.push({
          type: 'assessment',
          title: `New assessment from ${a.merchants?.business_name || 'Unknown'}`,
          status: a.status,
          time: new Date(a.created_at).toLocaleString(),
          href: `/admin/growth-assessments/${a.id}`
        })
      })
    }

    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, lead_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(3)

    if (recentLeads) {
      recentLeads.forEach((l: any) => {
        activities.push({
          type: 'lead',
          title: `New lead: ${l.lead_name}`,
          status: l.status,
          time: new Date(l.created_at).toLocaleString(),
          href: `/admin/crm/${l.id}`
        })
      })
    }

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setRecentActivities(activities.slice(0, 5))

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <span className="text-sm text-[var(--text-muted)]">
          Last updated: {new Date().toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--accent)]">{stats?.activeProjects}</div>
          <div className="text-xs text-[var(--text-muted)]">Active Projects</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--text-primary)]">{stats?.totalClients}</div>
          <div className="text-xs text-[var(--text-muted)]">Total Clients</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--warning)]">{stats?.newLeads}</div>
          <div className="text-xs text-[var(--text-muted)]">New Leads</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--accent)]">{stats?.pendingAssessments}</div>
          <div className="text-xs text-[var(--text-muted)]">Pending Assessments</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--success)]">{stats?.growthReady}</div>
          <div className="text-xs text-[var(--text-muted)]">Growth Ready</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--accent)]">{stats?.pendingOnboarding}</div>
          <div className="text-xs text-[var(--text-muted)]">Pending Onboarding</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--accent)]">{stats?.tasksDueThisWeek}</div>
          <div className="text-xs text-[var(--text-muted)]">Tasks Due</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--error)]">{stats?.overdueTasks}</div>
          <div className="text-xs text-[var(--text-muted)]">Overdue</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--accent)]">
            ${(stats?.revenuePipeline || 0).toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Revenue Pipeline</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 transition hover:border-[var(--accent)]"
              >
                <SvgIcon name={action.icon} size={20} color="var(--accent)" />
                <span className="text-center text-xs font-medium text-[var(--text-primary)]">{action.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Activity</h2>
            <span className="text-xs text-[var(--text-muted)]">Latest updates</span>
          </div>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                  <div className={`mt-0.5 rounded-full p-1.5 ${
                    activity.type === 'assessment' ? 'bg-[var(--accent-subtle)]' :
                    activity.type === 'lead' ? 'bg-[var(--warning-subtle)]' :
                    'bg-[var(--accent-subtle)]'
                  }`}>
                    <SvgIcon
                      name={activity.type === 'assessment' ? 'growth-readiness' : activity.type === 'lead' ? 'user' : 'notification'}
                      size={12}
                      color={
                        activity.type === 'assessment' ? 'var(--accent)' :
                        activity.type === 'lead' ? 'var(--warning)' :
                        'var(--accent)'
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{activity.title}</p>
                      <span className="text-xs text-[var(--text-muted)]">{activity.time}</span>
                    </div>
                    {activity.status && (
                      <span className="text-xs text-[var(--text-muted)]">Status: {activity.status}</span>
                    )}
                  </div>
                  <Link
                    href={activity.href}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}