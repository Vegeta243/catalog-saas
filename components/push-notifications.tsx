'use client'
import { useEffect } from 'react'

export function PushNotificationSetup() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (!('PushManager' in window)) return

    const requestPermission = async () => {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // VAPID public key — replace with your own from web-push library
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        // Store subscription in DB
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })
      } catch {
        // Subscription failed silently — non-blocking
      }
    }

    // Ask after 30 seconds (not on first load)
    const timer = setTimeout(requestPermission, 30_000)
    return () => clearTimeout(timer)
  }, [])

  return null
}
