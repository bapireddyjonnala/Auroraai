import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { DocumentAnalysis } from '@/types';
import { cn } from '@/lib/utils';

interface AnalysisResultsProps {
  analysis: DocumentAnalysis;
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const getRiskIcon = () => {
    switch (analysis.risk_level) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getRiskColor = () => {
    switch (analysis.risk_level) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="glass p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">{analysis.filename}</h3>
            <p className="text-sm text-muted-foreground">
              {analysis.contract_type && (
                <span className="capitalize">{analysis.contract_type} Contract</span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {getRiskIcon()}
            <Badge className={cn('risk-badge', analysis.risk_level)}>
              {analysis.risk_level?.toUpperCase()} RISK
            </Badge>
          </div>
        </div>

        {/* Risk Score */}
        {analysis.risk_score !== undefined && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Risk Score</span>
              <span className="text-sm font-bold">{analysis.risk_score}/100</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-500',
                  analysis.risk_score > 70 && 'bg-red-500',
                  analysis.risk_score > 40 && analysis.risk_score <= 70 && 'bg-yellow-500',
                  analysis.risk_score <= 40 && 'bg-green-500'
                )}
                style={{ width: `${analysis.risk_score}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary */}
        {analysis.plain_summary && (
          <div className="prose prose-invert max-w-none">
            <h4 className="text-lg font-semibold mb-3">Plain-Language Summary</h4>
            <p className="text-muted-foreground leading-relaxed">
              {analysis.plain_summary}
            </p>
          </div>
        )}
      </Card>

      {/* Detected Clauses */}
      {analysis.clauses && analysis.clauses.length > 0 && (
        <Card className="glass p-6">
          <h4 className="text-lg font-semibold mb-4">Detected Clauses</h4>
          <div className="space-y-3">
            {analysis.clauses.map((clause, index) => (
              <div
                key={index}
                className={cn(
                  'clause-highlight p-4 rounded-lg',
                  clause.type
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="capitalize">
                    {clause.type}
                  </Badge>
                  <Badge className={cn('risk-badge', clause.risk_level)}>
                    {clause.risk_level}
                  </Badge>
                </div>
                <p className="text-sm mb-2 line-clamp-2">{clause.text}</p>
                <p className="text-xs text-muted-foreground">{clause.explanation}</p>
                {clause.recommendation && (
                  <p className="text-xs text-primary mt-2">
                    💡 {clause.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Key Information Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Obligations */}
        {analysis.key_obligations && analysis.key_obligations.length > 0 && (
          <Card className="glass p-6">
            <h4 className="text-lg font-semibold mb-4">Key Obligations</h4>
            <ul className="space-y-2">
              {analysis.key_obligations.map((obligation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                  <span className="text-muted-foreground">{obligation}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Recommended Actions */}
        {analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
          <Card className="glass p-6">
            <h4 className="text-lg font-semibold mb-4">Recommended Actions</h4>
            <ul className="space-y-2">
              {analysis.recommended_actions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{action}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Payment & Expiry Terms */}
      <div className="grid md:grid-cols-2 gap-6">
        {analysis.payment_terms && (
          <Card className="glass p-6">
            <h4 className="text-lg font-semibold mb-4">Payment Terms</h4>
            <div className="space-y-3">
              {analysis.payment_terms.amount && (
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-medium">{analysis.payment_terms.amount}</p>
                </div>
              )}
              {analysis.payment_terms.schedule && (
                <div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="font-medium">{analysis.payment_terms.schedule}</p>
                </div>
              )}
              {analysis.payment_terms.penalties && (
                <div>
                  <p className="text-xs text-muted-foreground">Penalties</p>
                  <p className="font-medium">{analysis.payment_terms.penalties}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {analysis.expiry_terms && (
          <Card className="glass p-6">
            <h4 className="text-lg font-semibold mb-4">Expiry & Termination</h4>
            <div className="space-y-3">
              {analysis.expiry_terms.date && (
                <div>
                  <p className="text-xs text-muted-foreground">Expiry Date</p>
                  <p className="font-medium">{analysis.expiry_terms.date}</p>
                </div>
              )}
              {analysis.expiry_terms.notice_period && (
                <div>
                  <p className="text-xs text-muted-foreground">Notice Period</p>
                  <p className="font-medium">{analysis.expiry_terms.notice_period}</p>
                </div>
              )}
              {analysis.expiry_terms.auto_renewal !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground">Auto-Renewal</p>
                  <p className="font-medium">
                    {analysis.expiry_terms.auto_renewal ? 'Yes' : 'No'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Compliance Issues */}
      {analysis.compliance_issues && analysis.compliance_issues.length > 0 && (
        <Card className="glass p-6 border-yellow-500/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <h4 className="text-lg font-semibold">Compliance Concerns</h4>
          </div>
          <ul className="space-y-2">
            {analysis.compliance_issues.map((issue, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2" />
                <span className="text-muted-foreground">{issue}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Processing Time */}
      {analysis.processing_time_ms && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Analyzed in {(analysis.processing_time_ms / 1000).toFixed(2)}s</span>
        </div>
      )}
    </div>
  );
}
