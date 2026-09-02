'use client'

import { useState, useEffect } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'

interface TocItem {
  id: string
  text: string
  level: number
}

interface BlogTableOfContentsProps {
  content: string
  /** Server-generated TOC. When provided, heading ids are already in the DOM
   *  (see addHeadingIds) so no client-side parsing / id injection is needed. */
  toc?: TocItem[]
}

export default function BlogTableOfContents({ content, toc }: BlogTableOfContentsProps) {
  const [activeId, setActiveId] = useState('')
  const [items, setItems] = useState<TocItem[]>(toc ?? [])

  useEffect(() => {
    // Fast path: server already provided the TOC and injected matching ids.
    if (toc) {
      setItems(toc)
      return
    }

    const extracted: TocItem[] = []
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const headings = tempDiv.querySelectorAll('h2, h3')

    headings.forEach((heading, index) => {
      const text = heading.textContent?.trim() || ''
      if (!text) return

      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      extracted.push({
        id,
        text,
        level: heading.tagName === 'H2' ? 2 : 3,
      })
    })

    setItems(extracted)

    setTimeout(() => {
      const actualHeadings = document.querySelectorAll('.blog-content h2, .blog-content h3')
      actualHeadings.forEach((heading, idx) => {
        if (extracted[idx] && !heading.id) {
          heading.id = extracted[idx].id
        }
      })
    }, 100)
  }, [content, toc])

  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll('.blog-content h2[id], .blog-content h3[id]')
      let current = ''

      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect()
        if (rect.top <= 150) {
          current = heading.id
        }
      })

      if (current) setActiveId(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [items])

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - offset
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-8">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
        <SvgIcon name="blog" size={16} color="var(--text-muted)" />
        CONTENTS
      </h3>

      <ul className="space-y-2">
        {items.map((item, idx) => {
          const sectionNumber = item.level === 2 
            ? items.filter(i => i.level === 2).indexOf(item) + 1 
            : null
          
          return (
            <li key={item.id}>
              <button
                onClick={() => scrollToHeading(item.id)}
                aria-current={activeId === item.id ? 'location' : undefined}
                className={`w-full rounded-md text-left transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)] ${
                  item.level === 3 ? 'pl-4 text-sm' : 'text-base font-medium'
                } ${
                  activeId === item.id
                    ? 'text-[var(--accent)] font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {sectionNumber && (
                  <span className="mr-2 inline-block text-sm font-bold text-[var(--accent)]">
                    {sectionNumber}.
                  </span>
                )}
                {item.text}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}