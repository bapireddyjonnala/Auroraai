import { useEffect } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAnalysisStore } from '@/stores/analysisStore';
import { cn } from '@/lib/utils';

const STAGES = [
  { id: 'upload', name: 'Upload', message: 'Uploading document...' },
  { id: 'ocr', name: 'OCR', message: 'Extracting text...' },
  { id: 'analysis', name: 'AI Analysis', message: 'Analyzing content...' },
  { id: 'clauses', name: 'Clause Detection', message: 'Detecting clauses...' },
  { id: 'summary', name: 'Summary', message: 'Generating insights...' },
];

export function ProcessingPipeline() {
  const { processingStages, setProcessingStages, updateStage } = useAnalysisStore();

  useEffect(() => {
    if (processingStages.length === 0) {
      setProcessingStages(
        STAGES.map((stage, index) => ({
          ...stage,
          status: index === 0 ? 'active' : 'pending',
        }))
      );
    }
  }, [processingStages.length, setProcessingStages]);

  return (
    <Card className="glass p-6">
      <h3 className="text-lg font-semibold mb-6">Processing Pipeline</h3>
      
      <div className="space-y-4">
        {processingStages.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-4">
            {/* Icon */}
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              stage.status === 'completed' && 'bg-green-500/20',
              stage.status === 'active' && 'bg-primary/20',
              stage.status === 'failed' && 'bg-destructive/20',
              stage.status === 'pending' && 'bg-muted'
            )}>
              {stage.status === 'completed' && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {stage.status === 'active' && (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              )}
              {stage.status === 'failed' && (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              {stage.status === 'pending' && (
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  'font-medium',
                  stage.status === 'active' && 'text-primary',
                  stage.status === 'completed' && 'text-green-500',
                  stage.status === 'failed' && 'text-destructive',
                  stage.status === 'pending' && 'text-muted-foreground'
                )}>
                  {stage.name}
                </h4>
              </div>
              
              {stage.status === 'active' && stage.message && (
                <p className="text-sm text-muted-foreground mt-1">
                  {stage.message}
                </p>
              )}
            </div>

            {/* Connector */}
            {index < processingStages.length - 1 && (
              <div className={cn(
                'w-12 h-0.5 flex-shrink-0',
                stage.status === 'completed' ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {processingStages.filter(s => s.status === 'completed').length} / {processingStages.length} Complete
          </span>
          <span className="text-muted-foreground">
            Processing time: ~10s
          </span>
        </div>
      </div>
    </Card>
  );
}
