// src/app/admin/workspace/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface DashboardStats {
  activeProjects: number
  newLeads: number
  pendingAssessments: number
  pendingOnboarding: number
  tasksDueThisWeek: number
  pendingClientRequests: number
  overdueTasks: number
  unpaidInvoices: number
  projectCompletionRate: number
  revenuePipeline: number
}

export default function AdminWorkspacePage() {
  const supabase = createClientComponentClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentTasks, setRecentTasks] = useState<any[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)

    const [
      projectsRes,
      leadsRes,
      assessmentsRes,
      onboardingRes,
      tasksRes,
      requestsRes,
      invoicesRes
    ] = await Promise.all([
      supabase.from('projects').select('status', { count: 'exact' }),
      supabase.from('leads').select('status', { count: 'exact' }).eq('status', 'New Lead'),
      supabase.from('growth_assessments').select('status', { count: 'exact' }).eq('status', 'New Submission'),
      supabase.from('client_onboarding_submissions').select('status', { count: 'exact' }).eq('status', 'New Submission'),
      supabase.from('tasks').select('status, due_date').eq('status', 'Pending'),
      supabase.from('project_requests').select('status').eq('status', 'open'),
      supabase.from('project_invoices').select('status, amount').eq('status', 'overdue'),
    ])

    const activeProjects = projectsRes.data?.filter(p => p.status !== 'Completed' && p.status !== 'Archived').length || 0
    const newLeads = leadsRes.count || 0
    const pendingAssessments = assessmentsRes.count || 0
    const pendingOnboarding = onboardingRes.count || 0
    
    const today = new Date()
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const tasksDueThisWeek = tasksRes.data?.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      return dueDate >= today && dueDate <= weekEnd
    }).length || 0

    const overdueTasks = tasksRes.data?.filter(t => {
      if (!t.due_date) return false
      return new Date(t.due_date) < today
    }).length || 0

    const pendingClientRequests = requestsRes.count || 0
    const unpaidInvoices = invoicesRes.count || 0
    
    const totalProjects = projectsRes.data?.length || 0
    const completedProjects = projectsRes.data?.filter(p => p.status === 'Completed').length || 0
    const projectCompletionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0

    const revenuePipeline = invoicesRes.data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0

    setStats({
      activeProjects,
      newLeads,
      pendingAssessments,
      pendingOnboarding,
      tasksDueThisWeek,
      pendingClientRequests,
      overdueTasks,
      unpaidInvoices,
      projectCompletionRate,
      revenuePipeline
    })

    const { data: recentTaskData } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    setRecentTasks(recentTaskData || [])

    const { data: deadlineData } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'In Progress')
      .not('expected_completion_date', 'is', null)
      .order('expected_completion_date', { ascending: true })
      .limit(5)

    setUpcomingDeadlines(deadlineData || [])

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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workspace</h1>
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
          <div className="text-xl font-bold text-[var(--warning)]">{stats?.newLeads}</div>
          <div className="text-xs text-[var(--text-muted)]">New Leads</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--accent)]">{stats?.pendingAssessments}</div>
          <div className="text-xs text-[var(--text-muted)]">Pending Assessments</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--accent)]">{stats?.pendingOnboarding}</div>
          <div className="text-xs text-[var(--text-muted)]">Pending Onboarding</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--success)]">{stats?.projectCompletionRate}%</div>
          <div className="text-xs text-[var(--text-muted)]">Completion Rate</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--accent)]">{stats?.tasksDueThisWeek}</div>
          <div className="text-xs text-[var(--text-muted)]">Tasks Due This Week</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--error)]">{stats?.overdueTasks}</div>
          <div className="text-xs text-[var(--text-muted)]">Overdue Tasks</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--accent)]">{stats?.pendingClientRequests}</div>
          <div className="text-xs text-[var(--text-muted)]">Client Requests</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--accent)]">
            ${stats?.revenuePipeline.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Revenue Pipeline</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Tasks</h2>
            <Link href="/admin/tasks" className="text-xs text-[var(--accent)] hover:underline">
              View All
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No recent tasks</p>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2.5">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{task.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {task.status} • {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.priority === 'Urgent' ? 'bg-[var(--error-subtle)] text-[var(--error)]' :
                    task.priority === 'High' ? 'bg-[var(--warning-subtle)] text-[var(--warning)]' :
                    task.priority === 'Medium' ? 'bg-[var(--warning-subtle)] text-[var(--warning)]' :
                    'bg-[var(--accent-subtle)] text-[var(--accent)]'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Upcoming Deadlines</h2>
            <Link href="/admin/projects" className="text-xs text-[var(--accent)] hover:underline">
              View All
            </Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No upcoming deadlines</p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((project) => (
                <div key={project.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2.5">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{project.project_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {project.project_id} • {project.progress}% complete
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(project.expected_completion_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}