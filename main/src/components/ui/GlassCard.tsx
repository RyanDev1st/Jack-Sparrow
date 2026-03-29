import type { ReactNode, CSSProperties } from 'react'

interface GlassCardProps {
    children: ReactNode
    className?: string
    style?: CSSProperties
    glow?: boolean
    animate?: boolean
    delay?: number
    variant?: 'default' | 'elevated' | 'orange'
    gradientBorder?: boolean
    static?: boolean
}

export default function GlassCard({
    children,
    className = '',
    style,
    glow = false,
    animate = false,
    delay = 0,
    variant = 'default',
    gradientBorder = false,
    static: isStatic = false,
}: GlassCardProps) {
    const animClass = animate ? `animate-in ${delay > 0 ? `animate-in-delay-${delay}` : ''}` : ''
    const variantClass = variant === 'default' ? '' : `glass-${variant}`
    const staticClass = isStatic ? 'glass-static' : ''

    const card = (
        <div
            className={`glass-panel ${variantClass} ${staticClass} ${animClass} ${className}`}
            style={{
                padding: 'var(--space-xl)',
                ...(glow ? { animation: 'borderGlow 4s ease-in-out infinite' } : {}),
                ...style,
            }}
        >
            {children}
        </div>
    )

    if (gradientBorder) {
        return <div className="gradient-border">{card}</div>
    }

    return card
}
