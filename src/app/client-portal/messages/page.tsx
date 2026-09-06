// src/app/client-portal/messages/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import EmptyState from '@/components/client-portal/EmptyState'

interface Message {
  id: string
  sender_name: string
  sender_role: string
  message: string
  created_at: string
  is_read: boolean
}

export default function ClientMessagesPage() {
  const supabase = createClientComponentClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [clientId, setClientId] = useState<string | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  async function fetchMessages() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClientId(clientData.id)

        // project_messages has no client_id column — it is owned via
        // project_messages.project_id -> projects.id -> projects.client_id.
        // Resolve this client's own project ids first so a failed or empty
        // project lookup can never fall through to an unscoped (or, as
        // before, wrongly-filtered) read of the message table.
        const { data: myProjects, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('client_id', clientData.id)

        const projectIds = projectsError ? [] : (myProjects || []).map((p) => p.id)

        if (projectIds.length > 0) {
          const { data: messageData } = await supabase
            .from('project_messages')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false })
          setMessages(messageData || [])
        } else {
          setMessages([])
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
        <p className="text-[var(--text-muted)]">Communication with your project team</p>
      </div>

      {messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Messages from your project team will appear here."
          icon="messages"
        />
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{msg.sender_name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{msg.sender_role}</span>
                    {!msg.is_read && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-[var(--accent-orange)]" />
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{msg.message}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}