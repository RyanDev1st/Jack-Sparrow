import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SpaceBackground from '@/components/ui/SpaceBackground';

const Home = lazy(() => import('@/pages/Home'));
const Join = lazy(() => import('@/pages/Join'));
const Hunt = lazy(() => import('@/pages/Hunt'));
const AdminPage = lazy(() => import('@/app/admin/page'));

function AppContent() {
  return (
    <>
      <SpaceBackground />

      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<Join />} />
          <Route path="/scan" element={<Hunt />} />
          <Route path="/hunt" element={<Hunt />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Suspense>

      <div className="noise-overlay" />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
