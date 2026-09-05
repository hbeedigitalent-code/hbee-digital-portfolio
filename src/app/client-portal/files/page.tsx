// src/app/client-portal/files/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import EmptyState from '@/components/client-portal/EmptyState'

interface File {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_at: string
}

// Reasonable business-file allow-list — images, common documents, and
// archives. Anything outside this list is rejected before upload.
const ALLOWED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
]
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

export default function ClientFilesPage() {
  const supabase = createClientComponentClient()
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  async function fetchFiles() {
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
        const { data: fileData } = await supabase
          .from('project_files')
          .select('*')
          .eq('client_id', clientData.id)
          .order('uploaded_at', { ascending: false })
        setFiles(fileData || [])
      }
    }

    setLoading(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !clientId) return

    setPageError(null)

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setPageError('That file type is not supported. Allowed: images, PDF, Word, Excel, text, CSV, or ZIP.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setPageError('File is too large. Maximum size is 25MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)

    try {
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `client-files/${clientId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Store the bare object path, not a permanent public URL — downloads
      // now go exclusively through the signed-url API route (handleDownload
      // below). toProjectFilesObjectPath() on the read side already accepts
      // both this shape and any pre-existing full public URLs, so no
      // migration of old rows is required. While the bucket stays public
      // (item C.10), the upload call itself is otherwise unchanged.
      const { error: dbError } = await supabase.from('project_files').insert({
        client_id: clientId,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        uploaded_by: 'client',
      })

      if (dbError) throw dbError

      await fetchFiles()
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDownload(file: File) {
    setPageError(null)
    setDownloadingId(file.id)

    // Open the tab synchronously, inside the click handler, before any
    // await — a tab opened only after an awaited fetch resolves is treated
    // as an unrequested popup by most browsers and gets blocked.
    const newTab = window.open('', '_blank')

    try {
      const response = await fetch(`/api/client-portal/files/${file.id}/signed-url`)
      const result = await response.json()

      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Failed to generate download link')
      }

      if (newTab) {
        newTab.location.href = result.url
      } else {
        // Popup was blocked despite the synchronous open (rare, e.g. some
        // mobile browsers) — fall back to a same-tab navigation.
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Download error:', error)
      if (newTab) newTab.close()
      setPageError('Failed to prepare download. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Files</h1>
          <p className="text-[var(--text-muted)]">Upload and manage your project files</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--accent-orange)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
          >
            <SvgIcon name="upload" size={16} color="white" />
            {uploading ? 'Uploading...' : 'Upload File'}
          </label>
        </div>
      </div>

      {pageError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-500">
          {pageError}
        </div>
      )}

      {files.length === 0 ? (
        <EmptyState
          title="No files uploaded"
          description="Upload your project files, documents, and assets here."
          icon="file"
          actionText="Upload File"
          onAction={() => fileInputRef.current?.click()}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 hidden md:table-cell">Size</th>
                <th className="px-4 py-3 hidden lg:table-cell">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-[var(--bg-section)] transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <SvgIcon name="file" size={16} color="var(--text-muted)" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{file.file_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-[var(--text-muted)]">{file.file_type?.split('/').pop() || 'Unknown'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-[var(--text-muted)]">
                    {formatFileSize(file.file_size)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-[var(--text-muted)]">
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === file.id}
                      className="inline-flex items-center gap-1 text-sm text-[var(--accent-orange)] hover:underline disabled:cursor-wait disabled:opacity-60"
                    >
                      {downloadingId === file.id ? 'Preparing...' : 'Download'}
                      <SvgIcon name="download" size={14} color="var(--accent-orange)" />
                    </button>
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