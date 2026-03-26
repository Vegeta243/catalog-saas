/**
 * /api/import/history/route.ts
 * Get import job history for user
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { data: jobs, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
      total: jobs?.length || 0,
    })
  } catch (error) {
    console.error('[History] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur serveur',
      jobs: [],
    }, { status: 500 })
  }
}
