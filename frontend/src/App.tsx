import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import MarketingPage from './pages/MarketingPage';
import LandingPage from './pages/LandingPage';
import WalletPage from './pages/WalletPage';
import PlaygroundPage from './pages/PlaygroundPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import IntegrationsPage from './app/integrations/page';

// Docs multi-page
import DocsLayout from './pages/docs/DocsLayout';
import DocsOverview from './pages/docs/DocsOverview';
import DocsArchitecture from './pages/docs/DocsArchitecture';
import DocsRuntime from './pages/docs/DocsRuntime';
import DocsAutomations from './pages/docs/DocsAutomations';
import DocsTriggers from './pages/docs/DocsTriggers';
import DocsIntegrations from './pages/docs/DocsIntegrations';
import DocsSecurity from './pages/docs/DocsSecurity';
import DocsObservability from './pages/docs/DocsObservability';
import DocsAPI from './pages/docs/DocsAPI';
import DocsDataModel from './pages/docs/DocsDataModel';
import DocsRoadmap from './pages/docs/DocsRoadmap';

function App() {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<MarketingPage />} />
          <Route path="/dashboard" element={<LandingPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          
          {/* Phase 2 Routes */}
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />

          {/* Documentation — Multi-page with shared layout */}
          <Route path="/documentation" element={<DocsLayout />}>
            <Route index element={<DocsOverview />} />
            <Route path="architecture" element={<DocsArchitecture />} />
            <Route path="runtime" element={<DocsRuntime />} />
            <Route path="automations" element={<DocsAutomations />} />
            <Route path="triggers" element={<DocsTriggers />} />
            <Route path="integrations" element={<DocsIntegrations />} />
            <Route path="security" element={<DocsSecurity />} />
            <Route path="observability" element={<DocsObservability />} />
            <Route path="api" element={<DocsAPI />} />
            <Route path="data-model" element={<DocsDataModel />} />
            <Route path="roadmap" element={<DocsRoadmap />} />
          </Route>
          
          <Route path="/404" element={<div className="p-20 text-center font-bold">404 - Not Found</div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </Router>
  );
}

export default App;
