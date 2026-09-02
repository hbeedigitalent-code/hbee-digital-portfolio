export default function LoadingPortfolioDetail() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] pt-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12 animate-pulse">
        <div className="h-8 w-32 rounded-full bg-[var(--bg-section)] mb-4" />
        <div className="h-12 w-3/4 rounded-lg bg-[var(--bg-section)] mb-6" />
        <div className="h-20 w-full rounded-lg bg-[var(--bg-section)] mb-8" />
        <div className="h-[400px] w-full rounded-2xl bg-[var(--bg-section)] mb-12" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-40 rounded-2xl bg-[var(--bg-section)]" />
          <div className="h-40 rounded-2xl bg-[var(--bg-section)]" />
        </div>
      </div>
    </main>
  )
}