import React from 'react';
import { PageContainer } from '../../components/layout/LayoutPack';
import TelegramCard from '../../components/integrations/TelegramCard';
import { Puzzle } from 'lucide-react';

const IntegrationsPage: React.FC = () => {
  return (
    <PageContainer>
      <div className="min-h-screen bg-bg px-6 py-10 lg:px-12 animate-in fade-in duration-500">
        <div className="max-w-2xl">
          
          {/* Header Section */}
          <div className="mb-25 mt-14 flex items-start gap-4 bg-surface p-4 rounded-xl border border-outline">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shadow-sm border border-blue-500/20">
              <Puzzle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-text-primary tracking-tight mb-2">Integrations</h1>
              <p className="text-text-secondary max-w-2xl leading-relaxed text-[12px]">
                Connect your AEGIS workspace with external platforms. Enable real-time notifications and alerts.
              </p>
            </div>
          </div>

          {/* Integration List Container */}
          <div className="space-y-6">
            <TelegramCard />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default IntegrationsPage;
