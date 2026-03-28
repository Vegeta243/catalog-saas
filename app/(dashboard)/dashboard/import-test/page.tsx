/**
 * Test page for bulk import feature
 * Access at: /dashboard/import-test
 */

'use client'

import { useState } from 'react'
import BulkImportModal from '@/components/BulkImportModal'

export default function ImportTestPage() {
  const [showModal, setShowModal] = useState(false)
  const [lastImport, setLastImport] = useState<number | null>(null)

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      color: '#f1f5f9',
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '20px' }}>
         Test Import en Masse
      </h1>

      <div style={{ 
        padding: '24px', 
        backgroundColor: '#1e293b', 
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>
          Test du Modal d'Import
        </h2>
        <p style={{ color: "var(--text-tertiary)", marginBottom: '20px' }}>
          Cliquez sur le bouton ci-dessous pour ouvrir le modal d'import en masse.
        </p>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
          }}
        >
           Ouvrir le Modal d'Import
        </button>

        {lastImport !== null && (
          <div style={{ 
            marginTop: '20px',
            padding: '16px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
          }}>
            <p style={{ margin: 0, color: '#15803d', fontWeight: '600' }}>
               Dernier import : {lastImport} produit(s) importé(s)
            </p>
          </div>
        )}
      </div>

      <div style={{ 
        padding: '24px', 
        backgroundColor: '#1e293b', 
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>
          Instructions de Test
        </h2>
        <ol style={{ color: "var(--text-tertiary)", lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Cliquez sur "Ouvrir le Modal d'Import"</li>
          <li>Collez des URLs de produits (AliExpress, CJ, etc.)</li>
          <li>Ajustez la marge avec le slider</li>
          <li>Cliquez sur "Importer"</li>
          <li>Vérifiez les résultats</li>
        </ol>

        <div style={{ 
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '13px',
        }}>
          <p style={{ color: '#60a5fa', marginBottom: '8px' }}>Exemple d'URLs à tester :</p>
          <p style={{ color: "var(--text-tertiary)" }}>https://www.aliexpress.com/item/1005006294704696.html</p>
          <p style={{ color: "var(--text-tertiary)" }}>https://www.aliexpress.com/item/1005005531234567.html</p>
        </div>
      </div>

      {/* Bulk Import Modal */}
      <BulkImportModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={(count) => {
          setLastImport(count)
          setShowModal(false)
        }}
      />
    </div>
  )
}
