export default function LoadingPortfolio() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] pt-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="animate-pulse">
          <div className="h-8 w-32 rounded-full bg-[var(--bg-section)] mb-4" />
          <div className="h-12 w-3/4 rounded-lg bg-[var(--bg-section)] mb-4" />
          <div className="h-20 w-full rounded-lg bg-[var(--bg-section)]" />
          
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl bg-[var(--bg-card)] overflow-hidden">
                <div className="aspect-[4/3] bg-[var(--bg-section)]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-20 bg-[var(--bg-section)] rounded" />
                  <div className="h-6 w-3/4 bg-[var(--bg-section)] rounded" />
                  <div className="h-4 w-full bg-[var(--bg-section)] rounded" />
                  <div className="h-4 w-2/3 bg-[var(--bg-section)] rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}