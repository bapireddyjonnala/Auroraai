import { useState, useEffect } from 'react';
import { DocumentUpload } from '@/components/features/DocumentUpload';
import { ProcessingPipeline } from '@/components/features/ProcessingPipeline';
import { AnalysisResults } from '@/components/features/AnalysisResults';
import { VoiceAssistant } from '@/components/features/VoiceAssistant';
import { useAnalysisStore } from '@/stores/analysisStore';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function LegalIntelligence() {
  const { currentAnalysis, setCurrentAnalysis, updateStage, setIsProcessing, isProcessing } = useAnalysisStore();
  const { toast } = useToast();
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) return;

    // Poll for analysis updates
    const pollInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from('document_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error) {
        console.error('Poll error:', error);
        return;
      }

      if (data) {
        setCurrentAnalysis(data);

        // Update pipeline stages based on status
        if (data.status === 'completed') {
          updateStage('upload', { status: 'completed' });
          updateStage('ocr', { status: 'completed' });
          updateStage('analysis', { status: 'completed' });
          updateStage('clauses', { status: 'completed' });
          updateStage('summary', { status: 'completed' });
          setIsProcessing(false);
          clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          updateStage('summary', { status: 'failed' });
          setIsProcessing(false);
          clearInterval(pollInterval);
          toast({
            title: 'Analysis failed',
            description: 'Failed to analyze document',
            variant: 'destructive',
          });
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [analysisId, setCurrentAnalysis, updateStage, setIsProcessing, toast]);

  const handleUploadComplete = (id: string) => {
    setAnalysisId(id);
    setIsProcessing(true);
    
    // Simulate pipeline progression
    setTimeout(() => updateStage('upload', { status: 'completed' }), 500);
    setTimeout(() => {
      updateStage('ocr', { status: 'active' });
    }, 1000);
    setTimeout(() => {
      updateStage('ocr', { status: 'completed' });
      updateStage('analysis', { status: 'active' });
    }, 3000);
    setTimeout(() => {
      updateStage('analysis', { status: 'completed' });
      updateStage('clauses', { status: 'active' });
    }, 5000);
    setTimeout(() => {
      updateStage('clauses', { status: 'completed' });
      updateStage('summary', { status: 'active' });
    }, 7000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          <span className="text-gradient">Legal Document Intelligence</span>
        </h2>
        <p className="text-muted-foreground">
          Upload and analyze legal documents with AI-powered insights
        </p>
      </div>

      {!currentAnalysis ? (
        <div className="space-y-6">
          <DocumentUpload onUploadComplete={handleUploadComplete} />
          {isProcessing && <ProcessingPipeline />}
        </div>
      ) : currentAnalysis.status === 'processing' ? (
        <div className="space-y-6">
          <ProcessingPipeline />
          <div className="glass p-12 text-center rounded-lg">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analyzing Document...</h3>
            <p className="text-sm text-muted-foreground">
              AI is processing your document. This usually takes less than 10 seconds.
            </p>
          </div>
        </div>
      ) : currentAnalysis.status === 'completed' ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnalysisResults analysis={currentAnalysis} />
          </div>
          <div>
            <VoiceAssistant analysis={currentAnalysis} />
          </div>
        </div>
      ) : (
        <div className="glass p-12 text-center rounded-lg border-destructive/50">
          <h3 className="text-lg font-semibold mb-2 text-destructive">Analysis Failed</h3>
          <p className="text-sm text-muted-foreground">
            Failed to analyze the document. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
