'use client'

import SvgIcon from '@/components/ui/SvgIcon'

interface BlogAuthorBioProps {
  author?: string
  date?: string
  readTime?: string
}

export default function BlogAuthorBio({
  author = 'Hbee Digitals',
  date,
  readTime,
}: BlogAuthorBioProps) {
  const credential =
    author === 'Hbee Digitals'
      ? 'Ecommerce Growth Studio'
      : 'Ecommerce growth strategist · Hbee Digitals'

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-navy)] text-xs font-bold text-[var(--accent)]">
          {(author || 'H').charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Written by
          </span>
          <span className="font-semibold text-[var(--text-primary)]">{author}</span>
          <span className="text-xs text-[var(--text-muted)]">{credential}</span>
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            {date && (
              <span className="flex items-center gap-1">
                <SvgIcon name="calendar" size={12} color="var(--text-muted)" />
                {date}
              </span>
            )}
            {readTime && (
              <span className="flex items-center gap-1">
                <SvgIcon name="clock" size={12} color="var(--text-muted)" />
                {readTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}