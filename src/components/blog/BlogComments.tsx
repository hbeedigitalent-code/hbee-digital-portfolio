'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface Comment {
  id: string
  post_slug: string
  author_name: string
  author_email: string | null
  content: string
  is_approved: boolean
  created_at: string | null
}

interface BlogCommentsProps {
  postSlug: string
}

// Temporary safety mitigation: unauthenticated comment submission is disabled
// while proper spam protection (verification + rate limiting) is built.
// Approved comments stay visible. Do not flip this without the follow-up work.
const COMMENTS_OPEN: boolean = false

export default function BlogComments({ postSlug }: BlogCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')

  useEffect(() => {
    async function fetchComments() {
      setLoading(true)
      const { data } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('post_slug', postSlug)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })

      setComments(data || [])
      setLoading(false)
    }

    fetchComments()
  }, [postSlug])

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()

    // Hard stop: no unauthenticated writes while comments are closed.
    if (!COMMENTS_OPEN) return

    if (!name.trim() || !commentText.trim()) {
      setSubmitStatus('error')
      setSubmitMessage('Please enter your name and comment.')
      return
    }

    setSubmitStatus('submitting')
    setSubmitMessage('')

    const { error } = await supabase.from('blog_comments').insert({
      post_slug: postSlug,
      author_name: name.trim(),
      author_email: email.trim() || null,
      content: commentText.trim(),
      is_approved: false,
    })

    if (error) {
      setSubmitStatus('error')
      setSubmitMessage('Failed to submit comment. Please try again.')
      return
    }

    setSubmitStatus('success')
    setSubmitMessage('Your comment has been submitted and is awaiting approval.')
    setName('')
    setEmail('')
    setCommentText('')
  }

  const commentCount = comments.length

  return (
    <section className="mt-16">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
        <SvgIcon name="comment" size={20} color="var(--text-muted)" />
        {commentCount > 0 ? `${commentCount} Comment${commentCount > 1 ? 's' : ''}` : 'Comments'}
      </h3>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--bg-card)]" />
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-navy)] text-xs font-bold text-[var(--accent)]">
                  {(comment.author_name || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {comment.author_name}
                  </p>
                  {comment.created_at && (
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(comment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          No comments yet. Be the first to share your thoughts.
        </p>
      )}

      {!COMMENTS_OPEN ? (
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center">
          <SvgIcon name="comment" size={24} color="var(--text-muted)" className="mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Comments are temporarily closed
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-6 text-[var(--text-muted)]">
            We&apos;re improving how comments work. Existing comments stay visible. Have a
            question about your store?{' '}
            <a href="/contact" className="font-semibold text-[var(--accent)] underline">
              Contact us
            </a>
            .
          </p>
        </div>
      ) : (
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h4 className="mb-1 text-lg font-bold text-[var(--text-primary)]">Leave a comment</h4>
        <p className="mb-5 text-xs text-[var(--text-muted)]">
          Please note, comments need to be approved before they are published.
        </p>

        <form onSubmit={handleSubmitComment} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
              Comment *
            </label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={submitStatus === 'submitting'}
              variant="cta"
              size="md"
            >
              {submitStatus === 'submitting' ? 'Posting...' : 'Post comment'}
            </Button>

            {submitMessage && (
              <p
                className={`text-sm font-semibold ${
                  submitStatus === 'success' ? 'text-[var(--accent)]' : 'text-red-400'
                }`}
              >
                {submitMessage}
              </p>
            )}
          </div>
        </form>
      </div>
      )}
    </section>
  )
}