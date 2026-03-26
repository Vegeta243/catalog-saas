/**
 * Components/FileImportZone.tsx
 * Zone de drop pour importer depuis un fichier CSV/TXT
 */

'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Check, AlertCircle, Loader2, X } from 'lucide-react'

interface FileImportZoneProps {
  onImportComplete?: (result: {
    imported: number
    failed: number
    fileName: string
  }) => void
}

interface UploadResult {
  fileName: string
  format: 'csv' | 'txt'
  totalLines: number
  validUrls: number
  imported: number
  failed: number
  successRate: number
  results: Array<{
    url: string
    success: boolean
    title?: string
    price?: number
    platform?: string
    error?: string
  }>
}

export default function FileImportZone({ onImportComplete }: FileImportZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImport = useCallback(async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('push_to_shopify', 'true')
      formData.append('auto_retry', 'true')
      formData.append('margin', '1.5')

      const response = await fetch('/api/import/from-file', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Échec de l\'import')
      }

      const uploadResult: UploadResult = {
        fileName: data.file.name,
        format: data.file.format,
        totalLines: data.file.totalLines,
        validUrls: data.file.validUrls,
        imported: data.stats.imported,
        failed: data.stats.failed,
        successRate: data.stats.successRate,
        results: data.results,
      }

      setResult(uploadResult)
      onImportComplete?.({
        imported: data.stats.imported,
        failed: data.stats.failed,
        fileName: data.file.name,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsUploading(false)
    }
  }, [onImportComplete])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleImport(file)
    } else {
      setError('Format non supporté. Utilisez CSV ou TXT.')
    }
  }, [handleImport])

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImport(file)
    }
  }, [handleImport])

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!result && (
        <div
        onDragOver={e => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all
            ${isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
      >
        <input
          type="file"
          accept=".csv,.txt"
          onChange={onFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="space-y-4">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-3" />
              <p className="text-slate-300 font-medium">Import en cours...</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white mb-1">
                  Glissez-déposez votre fichier
                </p>
                <p className="text-sm text-slate-400">
                  CSV ou TXT (max 100 URLs)
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> .CSV
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> .TXT
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300 mb-1">Erreur d'import</p>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
          <button
            onClick={reset}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Import réussi !</p>
                <p className="text-sm text-slate-400">{result.fileName}</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{result.imported}</p>
              <p className="text-xs text-slate-400 mt-1">Importés</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{result.failed}</p>
              <p className="text-xs text-slate-400 mt-1">Échecs</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{result.successRate}%</p>
              <p className="text-xs text-slate-400 mt-1">Réussite</p>
            </div>
          </div>

          {result.results.some(r => !r.success) && (
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              <p className="text-sm font-medium text-slate-300">Échecs :</p>
              {result.results
                .filter(r => !r.success)
                .slice(0, 5)
                .map((r, i) => (
                  <div key={i} className="text-xs text-red-400 flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span className="flex-1 truncate">{r.url}</span>
                    <span className="text-slate-500 flex-shrink-0">{r.error?.slice(0, 30)}</span>
                  </div>
                ))}
              {result.results.filter(r => !r.success).length > 5 && (
                <p className="text-xs text-slate-500 text-center">
                  +{result.results.filter(r => !r.success).length - 5} autres
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!result && !error && (
        <div className="bg-slate-800/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-300">Format attendu :</p>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-mono">TXT</span>
              <span>Une URL par ligne</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-mono">CSV</span>
              <span>URL dans n'importe quelle colonne</span>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-500">
            <p className="text-slate-400 mb-2">Exemple TXT :</p>
            <p>https://www.aliexpress.com/item/...</p>
            <p>https://cjdropshipping.com/product/...</p>
            <p>https://www.banggood.com/...</p>
          </div>
        </div>
      )}
    </div>
  )
}
