import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import SpaceBackground from '@/components/SpaceBackground'
import { JOIN_KEYBOARD_SCENE_URL, ORB_SCENE_URL, warmSplineScenes } from '@/lib/spline-scenes'

const Home = lazy(() => import('@/pages/Home'))
const Join = lazy(() => import('@/pages/Join'))
const Scan = lazy(() => import('@/pages/Scan'))
const Admin = lazy(() => import('@/pages/Admin'))
const SplineBot = lazy(() => import('@/components/SplineBot'))

function AppContent() {
  const location = useLocation()
  const showSharedBackground = ['/', '/join'].includes(location.pathname)
  const showSplineBot = !['/', '/join', '/scan', '/admin'].includes(location.pathname)

  useEffect(() => {
    warmSplineScenes([ORB_SCENE_URL, JOIN_KEYBOARD_SCENE_URL])
  }, [])

  return (
    <>
      {showSharedBackground && <SpaceBackground />}

      {/* z-index 1: Page content layer */}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<Join />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Suspense>

      {/* z-index 2: Spline 3D bot — hidden on home (onboarding has its own) */}
      {showSplineBot && (
        <Suspense fallback={null}>
          <SplineBot />
        </Suspense>
      )}

      {/* z-index 9999: Noise texture overlay */}
      <div className="noise-overlay" />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
