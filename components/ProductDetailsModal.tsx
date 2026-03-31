'use client'

type ModalProduct = {
  id: string
  shopify_product_id?: string
  title: string
  vendor?: string
  product_type?: string
  handle?: string
  shop_domain?: string
  body_html?: string
  tags?: string
  status?: string
  price?: string | number
  compare_at_price?: string | number | null
  images?: unknown
}

function asImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((img) => {
      if (typeof img === 'string') return img
      if (img && typeof img === 'object') {
        const src = (img as { src?: unknown; url?: unknown }).src
        const url = (img as { src?: unknown; url?: unknown }).url
        return typeof src === 'string' ? src : typeof url === 'string' ? url : ''
      }
      return ''
    }).filter(Boolean)
  }
  if (typeof value === 'string') {
    try {
      return asImageUrls(JSON.parse(value))
    } catch {
      return []
    }
  }
  return []
}

function formatPrice(value: string | number | null | undefined): string {
  const amount = typeof value === 'number' ? value : Number(value || 0)
  return Number.isFinite(amount) ? amount.toFixed(2) + ' €' : '0.00 €'
}

export default function ProductDetailsModal({
  product,
  open,
  onClose,
  onEdit,
}: {
  product: ModalProduct | null
  open: boolean
  onClose: () => void
  onEdit?: (product: ModalProduct) => void
}) {
  if (!open || !product) return null

  const images = asImageUrls(product.images)
  const storeHref = product.shop_domain && product.handle
    ? `https://${product.shop_domain}/products/${product.handle}`
    : ''

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px',
          width: '100%', maxWidth: '760px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
              {product.title}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              {product.vendor || 'Sans fournisseur'} · {product.product_type || 'Produit'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '20px', color: '#64748b', padding: '4px 8px',
            }}
          >×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            <div>
              {images.length > 0 ? (
                <div>
                  <img
                    src={images[0]}
                    alt={product.title}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
                  {images.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {images.slice(1, 5).map((url, index) => (
                        <img key={index} src={url} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
                  Aucune image
                </div>
              )}
            </div>

            <div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#15803d' }}>
                  {formatPrice(product.price)}
                </div>
                {product.compare_at_price != null && Number(product.compare_at_price) > 0 && (
                  <div style={{ fontSize: '16px', color: '#94a3b8', textDecoration: 'line-through' }}>
                    {formatPrice(product.compare_at_price)}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: product.status === 'active' ? '#dcfce7' : '#fee2e2',
                  color: product.status === 'active' ? '#15803d' : '#dc2626',
                  padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                }}>
                  {product.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
                {product.product_type && (
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                    {product.product_type}
                  </span>
                )}
              </div>

              {product.body_html && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</div>
                  <div
                    style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, maxHeight: '120px', overflowY: 'auto' }}
                    dangerouslySetInnerHTML={{ __html: product.body_html }}
                  />
                </div>
              )}

              {product.tags && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {product.tags.split(',').filter(Boolean).map((tag) => (
                      <span key={tag} style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {product.vendor && (
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    <strong>Fournisseur :</strong> {product.vendor}
                  </div>
                )}
                {product.handle && (
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    <strong>Handle :</strong> {product.handle}
                  </div>
                )}
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  <strong>ID Shopify :</strong> {product.shopify_product_id || product.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e2e8f0', flexShrink: 0,
          display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap',
        }}>
          {storeHref && (
            <a
              href={storeHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#f1f5f9', color: '#374151', padding: '10px 18px',
                borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500,
              }}
            >
              Voir sur la boutique
            </a>
          )}
          <a
            href={`https://admin.shopify.com/products/${product.shopify_product_id || product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#f1f5f9', color: '#374151', padding: '10px 18px',
              borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500,
            }}
          >
            Voir sur Shopify
          </a>
          {onEdit && (
            <button
              onClick={() => onEdit(product)}
              style={{
                background: '#e0f2fe', color: '#0369a1', border: 'none',
                padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: 500,
              }}
            >
              Modifier
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: '#2563eb', color: '#fff', border: 'none',
              padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 500,
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}