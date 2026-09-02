'use client'

/**
 * Phase 03A — UI primitive showcase (development only).
 * Not linked from anywhere. Replaced the old Supabase connection test.
 */

import { useState } from 'react'
import Container from '@/components/ui/Container'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import Accordion from '@/components/ui/Accordion'
import Skeleton from '@/components/ui/Skeleton'
import Image from '@/components/ui/Image'
import { useTheme } from '@/context/ThemeContext'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] py-6 first:border-t-0">
      <p className="text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-[var(--ls-eyebrow)] text-[var(--text-muted)]">
        {label}
      </p>
      {children}
    </div>
  )
}

export default function PrimitivesShowcase() {
  const { theme, toggleTheme, isSystem } = useTheme()
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorDemo, setErrorDemo] = useState(true)

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Section spacing="compact">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading
            eyebrow="Phase 03A"
            title="UI Primitives"
            description="Development showcase for the canonical Hbee Digitals components. Not part of the site."
            size="h1"
          />
          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            Theme: {theme}{isSystem ? ' (system)' : ''}
          </Button>
        </div>
      </Section>

      <Section background="subtle" spacing="compact">
        <Row label="Typography scale">
          <p className="text-[length:var(--fs-display)] leading-[var(--lh-display)] tracking-[var(--ls-display)] font-bold">Display</p>
          <p className="text-[length:var(--fs-h1)] leading-[var(--lh-h1)] tracking-[var(--ls-h1)] font-bold">Heading 1</p>
          <p className="text-[length:var(--fs-h2)] leading-[var(--lh-h2)] tracking-[var(--ls-h2)] font-semibold">Heading 2</p>
          <p className="text-[length:var(--fs-h3)] leading-[var(--lh-h3)] tracking-[var(--ls-h3)] font-semibold">Heading 3</p>
          <p className="text-[length:var(--fs-body-lg)] leading-[var(--lh-body-lg)]">Body large — the quick brown fox jumps over the lazy dog.</p>
          <p className="text-[length:var(--fs-body)] leading-[var(--lh-body)]">Body — the quick brown fox jumps over the lazy dog.</p>
          <p className="text-[length:var(--fs-body-sm)] leading-[var(--lh-body-sm)]">Body small — the quick brown fox jumps over the lazy dog.</p>
          <p className="text-[length:var(--fs-eyebrow)] font-semibold uppercase tracking-[var(--ls-eyebrow)] text-[var(--accent)]">Eyebrow label</p>
          <p className="text-[length:var(--fs-caption)] text-[var(--text-muted)]">Caption text</p>
        </Row>
      </Section>

      <Section spacing="compact">
        <Row label="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Get a Free Audit</Button>
            <Button variant="cta">Get a Free Audit</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button
              variant="cta"
              loading={loading}
              onClick={() => {
                setLoading(true)
                setTimeout(() => setLoading(false), 1400)
              }}
            >
              {loading ? 'Working' : 'Trigger loading'}
            </Button>
            <Button variant="secondary" href="/">Link button</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="primary">Small</Button>
            <Button size="md" variant="primary">Medium</Button>
            <Button size="lg" variant="primary">Large</Button>
          </div>
          <div className="rounded-[var(--radius-card)] bg-[var(--bg-inverse)] p-5">
            <Button variant="outline-dark">Outline on dark (legacy)</Button>
          </div>
        </Row>

        <Row label="Cards">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card variant="default">
              <p className="font-semibold">Default</p>
              <p className="mt-1 text-[length:var(--fs-body-sm)] text-[var(--text-secondary)]">Surface, hairline border, xs shadow.</p>
            </Card>
            <Card variant="interactive" href="/test">
              <p className="font-semibold">Interactive</p>
              <p className="mt-1 text-[length:var(--fs-body-sm)] text-[var(--text-secondary)]">Subtle hover: border + 1px lift.</p>
            </Card>
            <Card variant="flat">
              <p className="font-semibold">Flat</p>
              <p className="mt-1 text-[length:var(--fs-body-sm)] text-[var(--text-secondary)]">No shadow, no hover.</p>
            </Card>
          </div>
        </Row>

        <Row label="Badges">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="accent">Accent</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="error">Error</Badge>
            <Badge tone="accent" shape="tag">Tag shape</Badge>
          </div>
        </Row>

        <Row label="Forms">
          <div className="grid gap-5 sm:max-w-md">
            <Field label="Full name" required>
              <Input placeholder="Jane Cooper" />
            </Field>
            <Field label="Email" hint="We never share your email.">
              <Input type="email" placeholder="jane@company.com" />
            </Field>
            <Field label="Budget">
              <Select defaultValue="">
                <option value="" disabled>Select a range</option>
                <option value="1">$1k–5k</option>
                <option value="2">$5k–15k</option>
                <option value="3">$15k+</option>
              </Select>
            </Field>
            <Field label="Project details" error={errorDemo ? 'Please tell us a bit more (min 20 characters).' : undefined}>
              <Textarea placeholder="What are you trying to build?" />
            </Field>
            <Button variant="ghost" size="sm" onClick={() => setErrorDemo((v) => !v)}>
              Toggle error state
            </Button>
          </div>
        </Row>

        <Row label="Modal">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Request a free audit"
            description="Focus is trapped, Escape closes, scroll is locked, focus is restored on close."
          >
            <div className="grid gap-4">
              <Field label="Website URL">
                <Input placeholder="https://" />
              </Field>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="cta" size="sm" onClick={() => setModalOpen(false)}>Send</Button>
              </div>
            </div>
          </Modal>
        </Row>

        <Row label="Dropdown">
          <Dropdown label="Resources">
            <DropdownItem href="/blog">Blog</DropdownItem>
            <DropdownItem href="/pricing">Pricing</DropdownItem>
            <DropdownItem href="/faq">FAQ</DropdownItem>
            <DropdownItem onSelect={() => undefined} disabled>Disabled item</DropdownItem>
          </Dropdown>
        </Row>

        <Row label="Accordion">
          <Accordion
            type="single"
            defaultOpenIds={['a']}
            items={[
              { id: 'a', title: 'What does a growth audit include?', content: 'A structured review of your storefront, conversion path, technical health and trust signals.' },
              { id: 'b', title: 'How long does it take?', content: 'Most audits are delivered within five business days.' },
              { id: 'c', title: 'Do you work with non-Shopify stores?', content: 'Yes — WooCommerce, custom builds and headless setups too.' },
            ]}
          />
        </Row>

        <Row label="Skeleton">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" width={44} height={44} />
              <Skeleton variant="text" lines={2} width={180} />
            </div>
            <Skeleton variant="rect" height={96} />
          </div>
        </Row>

        <Row label="Image">
          <div className="grid gap-4 sm:grid-cols-3">
            <Image src="/Portfolio/agency.jpg" alt="Agency case study" aspectRatio="4/3" sizes="(max-width:768px) 100vw, 33vw" />
            <Image src="/Portfolio/branding.jpg" alt="Branding case study" aspectRatio="4/3" rounded="large" sizes="(max-width:768px) 100vw, 33vw" />
            <Image src="/does-not-exist.jpg" alt="Broken image fallback" aspectRatio="4/3" />
          </div>
        </Row>
      </Section>

      <Section background="inverse" spacing="compact">
        <SectionHeading
          tone="inverse"
          eyebrow="Inverse surface"
          title="Primitives on a dark section"
          description="Section background=inverse flips text tokens; Accordion + SectionHeading take tone='inverse'."
        />
        <div className="mt-6">
          <Accordion
            tone="inverse"
            items={[
              { id: 'x', title: 'Inverse accordion header', content: 'Panel text uses the muted inverse colour.' },
              { id: 'y', title: 'Second header', content: 'Keyboard: Arrow keys move between headers.' },
            ]}
          />
        </div>
      </Section>
    </main>
  )
}
