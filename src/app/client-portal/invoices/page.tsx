// src/app/client-portal/invoices/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import EmptyState from '@/components/client-portal/EmptyState'
import StatusBadge from '@/components/client-portal/StatusBadge'

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: string
  due_date: string
  payment_link: string | null
  created_at: string
}

export default function ClientInvoicesPage() {
  const supabase = createClientComponentClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        // project_invoices has no client_id column — it is owned via
        // project_invoices.project_id -> projects.id -> projects.client_id.
        // Resolve this client's own project ids first so a failed or empty
        // project lookup can never fall through to an unscoped read.
        const { data: myProjects, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('client_id', clientData.id)

        const projectIds = projectsError ? [] : (myProjects || []).map((p) => p.id)

        if (projectIds.length > 0) {
          const { data: invoiceData } = await supabase
            .from('project_invoices')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false })
          setInvoices(invoiceData || [])
        } else {
          setInvoices([])
        }
      }
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Invoices</h1>
        <p className="text-[var(--text-muted)]">View and manage your invoices</p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Your invoices will appear here once they're generated."
          icon="pricing"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 hidden md:table-cell">Due Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-[var(--bg-section)] transition">
                  <td className="px-4 py-3">
                    <span className="font-medium text-[var(--text-primary)]">{invoice.invoice_number}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm text-[var(--text-muted)]">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-[var(--text-muted)]">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                    {invoice.currency || 'USD'} ${invoice.amount?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status || 'pending'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {invoice.payment_link ? (
                      <a
                        href={invoice.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[var(--accent-orange)] hover:underline"
                      >
                        Pay Now
                        <SvgIcon name="external" size={14} color="var(--accent-orange)" />
                      </a>
                    ) : (
                      <span className="text-sm text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}