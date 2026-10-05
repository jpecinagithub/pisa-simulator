import { Suspense } from 'react';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const Home = lazyWithRetry(() => import('./pages/Home'));
const WhatIsPisa = lazyWithRetry(() => import('./pages/WhatIsPisa'));
const History = lazyWithRetry(() => import('./pages/History'));
const GlobalResults = lazyWithRetry(() => import('./pages/GlobalResults'));
const Results2025 = lazyWithRetry(() => import('./pages/Results2025'));
const Countries = lazyWithRetry(() => import('./pages/Countries'));
const CountryDetail = lazyWithRetry(() => import('./pages/CountryDetail'));
const SimulatorSetup = lazyWithRetry(() => import('./pages/SimulatorSetup'));
const SimulatorTest = lazyWithRetry(() => import('./pages/SimulatorTest'));
const SimulatorResults = lazyWithRetry(() => import('./pages/SimulatorResults'));
const ReportHistory = lazyWithRetry(() => import('./pages/ReportHistory'));
const Leaderboard = lazyWithRetry(() => import('./pages/Leaderboard'));
const Methodology = lazyWithRetry(() => import('./pages/Methodology'));
const About = lazyWithRetry(() => import('./pages/About'));
const Admin = lazyWithRetry(() => import('./pages/Admin'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

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
                <Route path="/pisa-simulator/history" element={<ReportHistory />} />
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
