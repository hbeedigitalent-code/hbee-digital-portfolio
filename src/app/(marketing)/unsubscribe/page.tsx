'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (email) {
      unsubscribe()
    } else {
      setStatus('error')
      setMessage('No email address provided')
    }
  }, [email])

  const unsubscribe = async () => {
    const { error } = await supabase
      .from('subscribers')
      .update({ 
        status: 'unsubscribed', 
        unsubscribed_at: new Date().toISOString() 
      })
      .eq('email', email)
      .eq('status', 'active')

    if (error) {
      setStatus('error')
      setMessage('Failed to unsubscribe. Please try again.')
    } else {
      setStatus('success')
      setMessage(`You have been successfully unsubscribed. You will no longer receive emails from us.`)
    }
  }

  return (
    <main className="min-h-screen pt-32 pb-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-md">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="text-5xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold mb-2">Processing...</h2>
              <p className="text-gray-600">Please wait while we process your request.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary-color)' }}>
                Unsubscribed Successfully
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                href="/"
                className="inline-block px-6 py-2 text-white rounded-lg hover:opacity-90"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Return to Homepage
              </Link>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-2xl font-bold mb-2 text-red-600">Error</h2>
              <p className="text-gray-600 mb-6">{message || 'Something went wrong'}</p>
              <Link
                href="/"
                className="inline-block px-6 py-2 text-white rounded-lg hover:opacity-90"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Return to Homepage
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function UnsubscribePage() {
  return (
    <>
      <Suspense fallback={
        <main className="min-h-screen pt-32 pb-20 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </main>
      }>
        <UnsubscribeContent />
      </Suspense>
    </>
  )
}