import { useEffect, useState } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'
import { useAppStore } from '../../store/AppStore'

interface CountUpProps {
    end: number
    duration?: number
    className?: string
}

export function CountUp({ end, duration = 1000, className }: CountUpProps) {
    const { showValues } = useAppStore()
    const [count, setCount] = useState(0)

    useEffect(() => {
        let startTime: number | null = null
        let animationFrameId: number

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)

            // Easing function (easeOutExpo)
            // 1 - Math.pow(2, -10 * progress) for a nice pop effect
            const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

            setCount(ease * end)

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step)
            }
        }

        animationFrameId = requestAnimationFrame(step)

        return () => cancelAnimationFrame(animationFrameId)
    }, [end, duration])

    if (!showValues) {
        return <span className={className}>*****</span>
    }

    return <span className={className}>R$ {formatCurrency(count).replace('R$', '').trim()}</span>
}
