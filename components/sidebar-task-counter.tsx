'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLAN_TASKS } from '@/lib/credits'

export default function SidebarTaskCounter({
  initialUsed,
  initialTotal,
  plan: initialPlan,
}: {
  initialUsed: number
  initialTotal: number
  plan?: string
}) {
  const [tasksUsed, setTasksUsed] = useState(initialUsed)
  const [tasksTotal, setTasksTotal] = useState(initialTotal)

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('actions_used, actions_limit, plan')
        .eq('id', user.id)
        .single()
      if (data) {
        setTasksUsed(data.actions_used || 0)
        const p = data.plan || initialPlan || 'free'
        setTasksTotal(data.actions_limit || PLAN_TASKS[p] || 30)
      }
    } catch { /* silent */ }
  }, [initialPlan])

  useEffect(() => {
    const interval = setInterval(refresh, 30000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    // Expose globally so API call wrappers can trigger refresh
    ;(window as unknown as Record<string, unknown>).__refreshTaskCounter = refresh
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const tasksRemaining = Math.max(0, tasksTotal - tasksUsed)

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-300">Tâches ce mois</span>
        <span className={`text-xs font-bold ${
          tasksRemaining <= 5 ? 'text-red-400' :
          tasksRemaining <= 10 ? 'text-blue-400' : 'text-green-400'
        }`}>
          {tasksRemaining} / {tasksTotal}
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            tasksRemaining <= 5 ? 'bg-red-500' :
            tasksRemaining <= 10 ? 'bg-blue-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.max(2, Math.min(100, (tasksUsed / Math.max(tasksTotal, 1)) * 100))}%` }}
        />
      </div>
      <p className="text-xs text-gray-600">
        {tasksUsed} utilisées · renouvellement le 1er
      </p>
    </div>
  )
}
