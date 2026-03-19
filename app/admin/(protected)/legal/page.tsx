import { createClient } from '@supabase/supabase-js'

export default async function AdminLegalPage() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Fetch soft-deleted accounts
  const { data: deletedUsers } = await admin
    .from('users')
    .select('id, email, deleted_at, deletion_scheduled_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  // Fetch recent audit logs
  const { data: auditLogs } = await admin
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Count data per table
  const [usersCount, shopsCount, historyCount] = await Promise.all([
    admin.from('users').select('id', { count: 'exact', head: true }),
    admin.from('shops').select('id', { count: 'exact', head: true }),
    admin.from('action_history').select('id', { count: 'exact', head: true }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚖️ Conformité légale</h1>
        <p className="text-gray-500 mt-1">RGPD · LCEN · Conformité France</p>
      </div>

      {/* RGPD Checklist */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold text-lg mb-4">📋 Checklist RGPD / LCEN</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { ok: true,  label: 'Politique de confidentialité publiée (/politique-confidentialite)' },
            { ok: true,  label: 'Mentions légales publiées (/mentions-legales)' },
            { ok: true,  label: 'Export données utilisateur (Art. 20 RGPD) — /api/user/export-data' },
            { ok: true,  label: 'Suppression compte (Art. 17 RGPD) — /api/user/delete' },
            { ok: true,  label: 'Récupération compte 30 jours — /account-recovery' },
            { ok: true,  label: 'Emails transactionnels via Resend (no-reply@ecompilotelite.com)' },
            { ok: true,  label: 'Hébergeur identifié — Vercel Inc., 340 Pine Street, San Francisco' },
            { ok: true,  label: 'CGU accessibles (/cgu)' },
            { ok: true,  label: 'CGV accessibles (/cgv) — tarifs, paiement, rétractation 14j' },
            { ok: true,  label: 'Emails jetables bloqués à l\'inscription (blocked_email_domains)' },
            { ok: false, label: 'SIRET à renseigner dans /mentions-legales → [À COMPLÉTER]' },
            { ok: false, label: 'Capital social à renseigner dans /mentions-legales → [À COMPLÉTER]' },
            { ok: false, label: 'RCS à renseigner dans /mentions-legales → [À COMPLÉTER]' },
            { ok: false, label: 'DPO désigné — contact DPO à renseigner dans /politique-confidentialite' },
            { ok: false, label: 'Registre des traitements (RGPD Art. 30) — à documenter' },
          ].map((item, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${item.ok ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className={`text-lg flex-shrink-0 ${item.ok ? 'text-green-500' : 'text-red-500'}`}>
                {item.ok ? '✅' : '⚠️'}
              </span>
              <span className={`text-sm ${item.ok ? 'text-green-800' : 'text-red-800'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data inventory */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold text-lg mb-4">🗄️ Inventaire des données personnelles</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { table: 'users', count: usersCount.count || 0, data: 'Email, nom, téléphone, plan, IP implicite' },
            { table: 'shops', count: shopsCount.count || 0, data: 'Domaine boutique, access token Shopify' },
            { table: 'action_history', count: historyCount.count || 0, data: 'Actions utilisateur, timestamps' },
          ].map(item => (
            <div key={item.table} className="border rounded-xl p-4">
              <p className="font-bold text-gray-900">{item.table}</p>
              <p className="text-2xl font-black text-blue-600 my-1">{item.count}</p>
              <p className="text-xs text-gray-500">{item.data}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Soft-deleted accounts */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold text-lg mb-4">🗑️ Comptes en attente de suppression définitive</h2>
        {!deletedUsers?.length ? (
          <p className="text-gray-500 text-sm">Aucun compte en attente de suppression</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Email</th>
                <th className="pb-2">Suppression demandée</th>
                <th className="pb-2">Suppression définitive</th>
                <th className="pb-2">Jours restants</th>
              </tr>
            </thead>
            <tbody>
              {deletedUsers.map((u: { id: string; email: string; deleted_at: string; deletion_scheduled_at: string | null }) => {
                const daysLeft = u.deletion_scheduled_at
                  ? Math.max(0, Math.ceil((new Date(u.deletion_scheduled_at).getTime() - Date.now()) / 86400000))
                  : 0
                return (
                  <tr key={u.id} className="border-b">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{new Date(u.deleted_at).toLocaleDateString('fr-FR')}</td>
                    <td className="py-2">{u.deletion_scheduled_at ? new Date(u.deletion_scheduled_at).toLocaleDateString('fr-FR') : 'N/A'}</td>
                    <td className="py-2">
                      <span className={`font-bold ${daysLeft <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                        {daysLeft}j
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Audit log */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-bold text-lg mb-4">🔍 Journal d&apos;audit admin (50 dernières actions)</h2>
        {!auditLogs?.length ? (
          <p className="text-gray-500 text-sm">Aucune action enregistrée</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Date</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Cible</th>
                <th className="pb-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {(auditLogs as { id: number; created_at: string; action: string; target_email?: string; target_id?: string; ip_address?: string; ip?: string }[]).map(log => (
                <tr key={log.id} className="border-b">
                  <td className="py-2 text-gray-500">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                  <td className="py-2 font-medium">{log.action}</td>
                  <td className="py-2 text-gray-600">{log.target_email || log.target_id || '-'}</td>
                  <td className="py-2 text-gray-400 font-mono text-xs">{log.ip_address || log.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
