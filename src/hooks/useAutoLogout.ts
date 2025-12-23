
import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Default timeout: 4 hours (14400000 ms)
const DEFAULT_TIMEOUT = 4 * 60 * 60 * 1000

export function useAutoLogout(timeoutMs = DEFAULT_TIMEOUT) {
    const { signOut, session } = useAuth()
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleLogout = useCallback(() => {
        if (session) {
            console.log('Sessão expirada por inatividade.')
            signOut()
        }
    }, [session, signOut])

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }

        if (session) {
            timerRef.current = setTimeout(handleLogout, timeoutMs)
        }
    }, [session, handleLogout, timeoutMs])

    useEffect(() => {
        // Events to monitor for activity
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click',
            'keyup',
            'wheel'
        ]

        // Set initial timer
        resetTimer()

        // Add event listeners
        events.forEach(event => {
            document.addEventListener(event, resetTimer)
        })

        // Clean up
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
            events.forEach(event => {
                document.removeEventListener(event, resetTimer)
            })
        }
    }, [resetTimer])

    return null
}
