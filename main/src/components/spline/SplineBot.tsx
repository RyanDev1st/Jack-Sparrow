import { useRef, useCallback, useEffect, useState } from 'react'
import Spline from '@splinetool/react-spline'
import type { Application as SplineApplication } from '@splinetool/runtime'

export default function SplineBot() {
    const splineRef = useRef<SplineApplication | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const onLoad = useCallback((spline: SplineApplication) => {
        splineRef.current = spline

        try {
            const camera = spline.findObjectByName('Camera')
            if (camera) {
                camera.position.x = 400
                camera.position.y = -200
            }
        } catch {
            // Scene objects may vary
        }

        setIsLoaded(true)
    }, [])

    // Forward global pointer/mouse events to the Spline canvas
    // so the bot tracks the cursor across the entire page
    useEffect(() => {
        if (!isLoaded) return

        const canvas = containerRef.current?.querySelector('canvas')
        if (!canvas) return

        const forwardEvent = (e: PointerEvent | MouseEvent) => {
            const syntheticPointer = new PointerEvent('pointermove', {
                clientX: e.clientX,
                clientY: e.clientY,
                screenX: e.screenX,
                screenY: e.screenY,
                bubbles: true,
                cancelable: true,
                pointerType: 'mouse',
            })
            canvas.dispatchEvent(syntheticPointer)

            const syntheticMouse = new MouseEvent('mousemove', {
                clientX: e.clientX,
                clientY: e.clientY,
                screenX: e.screenX,
                screenY: e.screenY,
                bubbles: true,
                cancelable: true,
            })
            canvas.dispatchEvent(syntheticMouse)
        }

        window.addEventListener('pointermove', forwardEvent, { passive: true })
        window.addEventListener('mousemove', forwardEvent, { passive: true })

        return () => {
            window.removeEventListener('pointermove', forwardEvent)
            window.removeEventListener('mousemove', forwardEvent)
        }
    }, [isLoaded])

    return (
        /* Full-viewport container so Spline's mouse tracking works globally.
           pointer-events: none on the outer so clicks pass through to content. */
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2,
                pointerEvents: 'none',
            }}
        >
            {/* Inner container — large enough to prevent model clipping.
                Positioned bottom-right with pointer-events so direct interaction works. */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '-80px',
                    right: '-80px',
                    width: '520px',
                    height: '520px',
                    pointerEvents: 'auto',
                    opacity: isLoaded ? 0.9 : 0,
                    transition: 'opacity 1s ease',
                    filter: 'drop-shadow(0 0 60px rgba(245, 130, 32, 0.12))',
                }}
            >
                <Spline
                    scene="https://prod.spline.design/ETzusk-57yo1zYBs/scene.splinecode"
                    onLoad={onLoad}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        </div>
    )
}
