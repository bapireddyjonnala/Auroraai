import { Shield, FileText, AlertTriangle, Mic, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModuleSelectorProps {
  onSelectModule: (module: 'legal' | 'security') => void;
}

export function ModuleSelector({ onSelectModule }: ModuleSelectorProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="relative py-20 px-4">
        <div className="absolute inset-0 bg-aurora-radial" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 glass rounded-full">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">Powered by Advanced AI</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-float">
            <span className="text-gradient">Aurora.ai</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Real-Time Legal Intelligence & Cybersecurity Threat Detection Platform with Voice AI
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>Document Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" />
              <span>Voice Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>Threat Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>AI Chat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module Selection */}
      <div className="flex-1 px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Choose Your Module</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Legal Intelligence Module */}
            <Card 
              className={cn(
                "glass glass-hover cursor-pointer group",
                "transition-all duration-500 hover:scale-105",
                "card-glow"
              )}
              onClick={() => onSelectModule('legal')}
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:aurora-glow transition-all">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                
                <h3 className="text-2xl font-bold mb-4">Legal Document Intelligence</h3>
                
                <p className="text-muted-foreground mb-6">
                  Upload legal documents and get instant AI-powered analysis with risk assessment, clause detection, and voice-guided recommendations.
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                    <span className="text-sm text-muted-foreground">Real-time OCR & AI analysis in under 10 seconds</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                    <span className="text-sm text-muted-foreground">Voice assistant explains risks & recommendations</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                    <span className="text-sm text-muted-foreground">Interactive Q&A on your documents</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                    <span className="text-sm text-muted-foreground">Supports PDF, DOC, DOCX formats</span>
                  </div>
                </div>
                
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Start Analysis
                </Button>
              </div>
            </Card>

            {/* Cybersecurity Module */}
            <Card 
              className={cn(
                "glass glass-hover cursor-pointer group",
                "transition-all duration-500 hover:scale-105",
                "card-glow"
              )}
              onClick={() => onSelectModule('security')}
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-destructive/20 rounded-2xl flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-destructive/30 transition-all">
                  <Shield className="w-8 h-8 text-destructive" />
                </div>
                
                <h3 className="text-2xl font-bold mb-4">Cybersecurity Threat Detection</h3>
                
                <p className="text-muted-foreground mb-6">
                  Detect phishing, scams, fake profiles, and malicious content using advanced AI pattern recognition and behavioral analysis.
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-destructive rounded-full mt-2" />
                    <span className="text-sm text-muted-foreground">Fake profile & phishing detection</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-destructive rounded-full mt-2" />
                    <span className="text-sm text-muted-foreground">Scam message analysis with pattern recognition</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-destructive rounded-full mt-2" />
                    <span className="text-sm text-muted-foreground">Risk scoring & incident prioritization</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-destructive rounded-full mt-2" />
                    <span className="text-sm text-muted-foreground">Actionable security recommendations</span>
                  </div>
                </div>
                
                <Button className="w-full bg-destructive hover:bg-destructive/90">
                  Start Scanning
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Privacy First</span>
          </div>
          <p>All documents are processed in real-time and automatically deleted. Your data is never stored.</p>
        </div>
      </div>
    </div>
  );
}
