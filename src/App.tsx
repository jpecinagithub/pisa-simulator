import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const Home = lazy(() => import('./pages/Home'));
const WhatIsPisa = lazy(() => import('./pages/WhatIsPisa'));
const History = lazy(() => import('./pages/History'));
const GlobalResults = lazy(() => import('./pages/GlobalResults'));
const Results2025 = lazy(() => import('./pages/Results2025'));
const Countries = lazy(() => import('./pages/Countries'));
const CountryDetail = lazy(() => import('./pages/CountryDetail'));
const SimulatorSetup = lazy(() => import('./pages/SimulatorSetup'));
const SimulatorTest = lazy(() => import('./pages/SimulatorTest'));
const SimulatorResults = lazy(() => import('./pages/SimulatorResults'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Methodology = lazy(() => import('./pages/Methodology'));
const About = lazy(() => import('./pages/About'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 text-center text-ink-600" aria-busy="true">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ErrorBoundary>
          <Layout>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/what-is-pisa" element={<WhatIsPisa />} />
                <Route path="/pisa-history" element={<History />} />
                <Route path="/results" element={<GlobalResults />} />
                <Route path="/pisa-results-2025" element={<Results2025 />} />
                <Route path="/countries" element={<Countries />} />
                <Route path="/country/:code" element={<CountryDetail />} />
                <Route path="/pisa-simulator" element={<SimulatorSetup />} />
                <Route path="/pisa-simulator/test" element={<SimulatorTest />} />
                <Route path="/pisa-simulator/results" element={<SimulatorResults />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="/about" element={<About />} />
                <Route path="/admin" element={<Admin />} />
                {/* legacy aliases */}
                <Route path="/history" element={<Navigate to="/pisa-history" replace />} />
                <Route path="/simulator" element={<Navigate to="/pisa-simulator" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </LanguageProvider>
    </BrowserRouter>
  );
}
