import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, Mail, MessageSquare, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { ThreatScan } from '@/types';
import { cn } from '@/lib/utils';
import { FunctionsHttpError } from '@supabase/supabase-js';

export function ThreatDetection() {
  const [scanType, setScanType] = useState<'fake_profile' | 'phishing' | 'scam_message' | 'url_analysis'>('scam_message');
  const [content, setContent] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ThreatScan | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();

  const handleScan = async () => {
    if (!content.trim()) {
      toast({
        title: 'Input required',
        description: 'Please enter content to analyze',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to use threat detection',
        variant: 'destructive',
      });
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('detect-threat', {
        body: {
          scan_type: scanType,
          content: content.trim(),
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      setResult(data.scan);
      
      toast({
        title: 'Scan complete',
        description: data.scan.is_threat ? 'Threat detected!' : 'No threats found',
        variant: data.scan.is_threat ? 'destructive' : 'default',
      });
    } catch (error: any) {
      console.error('Scan error:', error);
      toast({
        title: 'Scan failed',
        description: error.message || 'Failed to analyze content',
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  const getThreatLevelColor = (level?: string) => {
    switch (level) {
      case 'critical':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          <span className="text-gradient">Cybersecurity Threat Detection</span>
        </h2>
        <p className="text-muted-foreground">
          Detect phishing, scams, fake profiles, and malicious content using AI
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card className="glass p-6">
          <Tabs value={scanType} onValueChange={(v) => setScanType(v as any)}>
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="scam_message" className="text-xs">
                <MessageSquare className="w-4 h-4 mr-1" />
                Message
              </TabsTrigger>
              <TabsTrigger value="phishing" className="text-xs">
                <Mail className="w-4 h-4 mr-1" />
                Email
              </TabsTrigger>
              <TabsTrigger value="fake_profile" className="text-xs">
                <Shield className="w-4 h-4 mr-1" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="url_analysis" className="text-xs">
                <LinkIcon className="w-4 h-4 mr-1" />
                URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scam_message" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Message Content
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste the suspicious message here..."
                  className="min-h-[200px] glass"
                  disabled={scanning}
                />
              </div>
            </TabsContent>

            <TabsContent value="phishing" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Email Content
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste the suspicious email here..."
                  className="min-h-[200px] glass"
                  disabled={scanning}
                />
              </div>
            </TabsContent>

            <TabsContent value="fake_profile" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Profile Information
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter profile details (bio, posts, metadata)..."
                  className="min-h-[200px] glass"
                  disabled={scanning}
                />
              </div>
            </TabsContent>

            <TabsContent value="url_analysis" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  URL to Analyze
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the suspicious URL..."
                  className="min-h-[200px] glass"
                  disabled={scanning}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleScan}
            disabled={scanning || !content.trim()}
            className="w-full mt-4"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Scan for Threats
              </>
            )}
          </Button>
        </Card>

        {/* Results Section */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Threat Overview */}
              <Card className={cn(
                'glass p-6',
                result.is_threat && 'border-destructive/50'
              )}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      {result.is_threat ? '⚠️ Threat Detected' : '✅ No Threat Detected'}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {scanType.replace('_', ' ')} Analysis
                    </p>
                  </div>
                  
                  {result.threat_level && (
                    <Badge className={cn('risk-badge', result.threat_level)}>
                      {result.threat_level.toUpperCase()}
                    </Badge>
                  )}
                </div>

                {/* Threat Score */}
                {result.threat_score !== undefined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Threat Score</span>
                      <span className="text-sm font-bold">{result.threat_score}/100</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          result.threat_score > 70 && 'bg-red-500',
                          result.threat_score > 40 && result.threat_score <= 70 && 'bg-yellow-500',
                          result.threat_score <= 40 && 'bg-green-500'
                        )}
                        style={{ width: `${result.threat_score}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Category */}
                {result.threat_category && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Category</p>
                    <Badge variant="outline" className="capitalize">
                      {result.threat_category.replace('_', ' ')}
                    </Badge>
                  </div>
                )}

                {/* Explanation */}
                {result.explanation && (
                  <div className="prose prose-invert max-w-none">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.explanation}
                    </p>
                  </div>
                )}
              </Card>

              {/* Detected Patterns */}
              {result.detected_patterns && result.detected_patterns.length > 0 && (
                <Card className="glass p-6">
                  <h4 className="font-semibold mb-3">Detected Patterns</h4>
                  <div className="space-y-2">
                    {result.detected_patterns.map((pattern, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-destructive rounded-full mt-2" />
                        <span className="text-muted-foreground">{pattern}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Risk Indicators */}
              {result.risk_indicators && result.risk_indicators.length > 0 && (
                <Card className="glass p-6">
                  <h4 className="font-semibold mb-3">Risk Indicators</h4>
                  <div className="space-y-3">
                    {result.risk_indicators.map((indicator, index) => (
                      <div key={index} className="glass p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{indicator.indicator}</span>
                          <Badge className={cn('risk-badge', indicator.severity)}>
                            {indicator.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {indicator.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recommended Action */}
              {result.recommended_action && (
                <Card className="glass p-6 border-primary/50">
                  <h4 className="font-semibold mb-3">💡 Recommended Action</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.recommended_action}
                  </p>
                </Card>
              )}
            </>
          ) : (
            <Card className="glass p-12 text-center">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Scan Results</h3>
              <p className="text-sm text-muted-foreground">
                Enter content and click "Scan for Threats" to begin analysis
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
