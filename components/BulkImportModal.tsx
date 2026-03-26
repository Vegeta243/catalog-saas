/**
 * Components/BulkImportModal.tsx
 * Modal d'import produit en masse avec support URLs multiples
 * Version avec styles inline pour compatibilité maximale
 */

'use client'

import { useState } from 'react'
import { X, Upload, Check, AlertCircle, Loader2, Package } from 'lucide-react'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (count: number) => void
}

interface ImportResult {
  url: string
  success: boolean
  title?: string
  price?: number
  image?: string
  error?: string
}

export default function BulkImportModal({ 
  isOpen, 
  onClose,
  onSuccess 
}: BulkImportModalProps) {
  const [urls, setUrls] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ImportResult[]>([])
  const [margin, setMargin] = useState(1.5)

  const parseUrls = () => {
    return urls
      .split(/[\n,;\s]+/)
      .filter(url => url.trim().startsWith('http'))
      .slice(0, 100)
  }

  const handleImport = async () => {
    const validUrls = parseUrls()
    if (validUrls.length === 0) return

    setImporting(true)
    setResults([])
    setProgress(0)

    try {
      const response = await fetch('/api/import/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: validUrls,
          push_to_shopify: true,
          auto_retry: true,
          margin,
        }),
      })

      const data = await response.json()
      
      if (data.results) {
        setResults(data.results)
        setProgress(100)
        
        setTimeout(() => {
          onSuccess?.(data.imported)
          handleClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Import error:', error)
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setUrls('')
    setResults([])
    setProgress(0)
    onClose()
  }

  if (!isOpen) return null

  const validCount = parseUrls().length
  const successCount = results.filter(r => r.success).length
  const failedCount = results.filter(r => !r.success).length

  const styles = {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
    },
    modal: {
      position: 'relative' as const,
      width: '100%',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflow: 'auto',
      backgroundColor: '#1e293b',
      borderRadius: '16px',
      border: '1px solid #334155',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '24px',
      borderBottom: '1px solid #334155',
    },
    iconContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    iconBox: {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#f1f5f9',
      margin: 0,
    },
    subtitle: {
      fontSize: '13px',
      color: '#94a3b8',
      margin: '4px 0 0',
    },
    closeButton: {
      padding: '8px',
      background: 'transparent',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      color: '#94a3b8',
    },
    content: {
      padding: '24px',
    },
    textarea: {
      width: '100%',
      minHeight: '200px',
      padding: '16px',
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '12px',
      color: '#f1f5f9',
      fontSize: '14px',
      fontFamily: 'monospace',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
      outline: 'none',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#cbd5e1',
      marginBottom: '8px',
    },
    counter: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '8px',
      fontSize: '12px',
      color: '#94a3b8',
    },
    slider: {
      width: '100%',
      accentColor: '#3b82f6',
    },
    infoBox: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '20px',
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '24px',
      borderTop: '1px solid #334155',
      backgroundColor: 'rgba(30, 41, 59, 0.5)',
    },
    buttonSecondary: {
      padding: '12px 24px',
      backgroundColor: 'transparent',
      border: '1px solid #475569',
      borderRadius: '12px',
      color: '#cbd5e1',
      fontWeight: '600',
      cursor: 'pointer',
    },
    buttonPrimary: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      border: 'none',
      borderRadius: '12px',
      color: '#ffffff',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
    },
    resultsContainer: {
      marginTop: '20px',
    },
    resultItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '8px',
    },
    progressBar: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: '4px',
      backgroundColor: '#334155',
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
      transition: 'width 0.3s ease',
    },
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <div style={styles.iconBox}>
              <Package size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={styles.title}>Import en Masse</h2>
              <p style={styles.subtitle}>Jusqu&apos;à 100 produits simultanément</p>
            </div>
          </div>
          <button style={styles.closeButton} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {results.length === 0 ? (
            <>
              <div>
                <label style={styles.label}>
                  URLs des produits à importer
                </label>
                <textarea
                  style={styles.textarea}
                  value={urls}
                  onChange={e => setUrls(e.target.value)}
                  placeholder={`Collez vos URLs ici (une par ligne)...

https://www.aliexpress.com/item/...
https://cjdropshipping.com/product/...
https://www.banggood.com/...`}
                />
                <div style={styles.counter}>
                  <span>{validCount} URLs valides détectées</span>
                  <span>Max: 100</span>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <label style={styles.label}>
                  Marge commerciale : x{margin.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="1.1"
                  max="5"
                  step="0.1"
                  value={margin}
                  onChange={e => setMargin(parseFloat(e.target.value))}
                  style={styles.slider}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                  <span>1.1x</span>
                  <span>5x</span>
                </div>
              </div>

              <div style={styles.infoBox}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <AlertCircle size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600', color: '#93c5fd' }}>
                      Plateformes supportées :
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
                      <li>AliExpress (taux de réussite: 95%)</li>
                      <li>Alibaba, CJ Dropshipping, DHgate</li>
                      <li>Banggood, Temu</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={styles.resultsContainer}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>Résultats</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ 
                    padding: '6px 12px', 
                    backgroundColor: 'rgba(34, 197, 94, 0.2)', 
                    color: '#4ade80',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    ✓ {successCount} réussis
                  </span>
                  <span style={{ 
                    padding: '6px 12px', 
                    backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                    color: '#f87171',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    ✗ {failedCount} échecs
                  </span>
                </div>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {results.map((result, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.resultItem,
                      backgroundColor: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${result.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    }}
                  >
                    {result.success ? (
                      <Check size={20} color="#4ade80" style={{ flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0 }} />
                    )}
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        color: result.success ? '#f1f5f9' : '#f87171',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {result.title || 'Produit'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                        {result.success 
                          ? `${result.price?.toFixed(2)} €` 
                          : result.error?.slice(0, 50)}
                      </p>
                    </div>

                    {result.image && (
                      <img
                        src={result.image}
                        alt=""
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '6px', 
                          objectFit: 'cover',
                          border: '1px solid #334155',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {results.length === 0 ? (
            <>
              <button
                onClick={handleClose}
                disabled={importing}
                style={{ 
                  ...styles.buttonSecondary,
                  opacity: importing ? 0.5 : 1,
                  cursor: importing ? 'not-allowed' : 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                style={{ 
                  ...styles.buttonPrimary,
                  opacity: validCount === 0 || importing ? 0.5 : 1,
                  cursor: validCount === 0 || importing ? 'not-allowed' : 'pointer',
                }}
              >
                {importing ? (
                  <>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    Importation...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Importer {validCount > 0 ? `(${validCount})` : ''}
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
              }}
            >
              ✓ Terminer
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {importing && (
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
