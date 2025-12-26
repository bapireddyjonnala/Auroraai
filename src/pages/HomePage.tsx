import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ModuleSelector } from '@/components/features/ModuleSelector';
import { LegalIntelligence } from '@/components/features/LegalIntelligence';
import { ThreatDetection } from '@/components/features/ThreatDetection';

export function HomePage() {
  const [selectedModule, setSelectedModule] = useState<'legal' | 'security' | null>(null);

  return (
    <div className="min-h-screen">
      <Header 
        onBack={selectedModule ? () => setSelectedModule(null) : undefined}
        title={selectedModule === 'legal' ? 'Legal Intelligence' : selectedModule === 'security' ? 'Threat Detection' : undefined}
      />
      
      {!selectedModule ? (
        <ModuleSelector onSelectModule={setSelectedModule} />
      ) : selectedModule === 'legal' ? (
        <LegalIntelligence />
      ) : (
        <ThreatDetection />
      )}
    </div>
  );
}
