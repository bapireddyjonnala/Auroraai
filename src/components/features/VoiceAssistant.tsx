import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { DocumentAnalysis } from '@/types';
import { cn } from '@/lib/utils';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface VoiceAssistantProps {
  analysis: DocumentAnalysis;
}

export function VoiceAssistant({ analysis }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleVoiceQuery(text);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: 'Voice recognition error',
          description: 'Please try again',
          variant: 'destructive',
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Not supported',
        description: 'Voice recognition is not supported in your browser',
        variant: 'destructive',
      });
      return;
    }

    setTranscript('');
    setResponse('');
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleVoiceQuery = async (query: string) => {
    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          query,
          analysis_id: analysis.id,
          analysis_data: {
            summary: analysis.plain_summary,
            risk_level: analysis.risk_level,
            clauses: analysis.clauses,
            obligations: analysis.key_obligations,
            actions: analysis.recommended_actions,
          },
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

      const assistantResponse = data.response;
      setResponse(assistantResponse);
      speak(assistantResponse);
    } catch (error: any) {
      console.error('Voice query error:', error);
      toast({
        title: 'Query failed',
        description: error.message || 'Failed to process voice query',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      synthRef.current = new SpeechSynthesisUtterance(text);
      synthRef.current.rate = 0.9;
      synthRef.current.pitch = 1;
      synthRef.current.volume = 1;
      
      synthRef.current.onstart = () => setIsSpeaking(true);
      synthRef.current.onend = () => setIsSpeaking(false);
      synthRef.current.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(synthRef.current);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const readRisks = () => {
    const highRiskClauses = analysis.clauses?.filter(c => c.risk_level === 'high') || [];
    
    if (highRiskClauses.length === 0) {
      speak('No high-risk clauses were detected in this document. Overall risk level is ' + analysis.risk_level);
      return;
    }

    let message = `I found ${highRiskClauses.length} high-risk clause${highRiskClauses.length > 1 ? 's' : ''} in this document. `;
    
    highRiskClauses.forEach((clause, index) => {
      message += `Risk ${index + 1}: ${clause.explanation}. ${clause.recommendation}. `;
    });

    speak(message);
    setResponse(message);
  };

  const readSummary = () => {
    if (analysis.plain_summary) {
      speak(analysis.plain_summary);
      setResponse(analysis.plain_summary);
    }
  };

  return (
    <Card className="glass p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">🎙️ Voice Assistant</h3>
        {isSpeaking && (
          <Button
            variant="ghost"
            size="sm"
            onClick={stopSpeaking}
            className="gap-2"
          >
            <VolumeX className="w-4 h-4" />
            Stop
          </Button>
        )}
      </div>

      {/* Voice Waveform Animation */}
      {(isListening || isSpeaking) && (
        <div className="flex items-center justify-center gap-1 h-16 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="voice-wave h-12" />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button
          variant="outline"
          onClick={readRisks}
          disabled={processing || isSpeaking}
          className="glass-hover"
        >
          <Volume2 className="w-4 h-4 mr-2" />
          Read Risks
        </Button>
        
        <Button
          variant="outline"
          onClick={readSummary}
          disabled={processing || isSpeaking}
          className="glass-hover"
        >
          <Volume2 className="w-4 h-4 mr-2" />
          Read Summary
        </Button>
      </div>

      {/* Voice Input */}
      <div className="space-y-4">
        <Button
          onClick={isListening ? stopListening : startListening}
          disabled={processing || isSpeaking}
          className={cn(
            'w-full h-16 text-lg',
            isListening && 'bg-destructive hover:bg-destructive/90'
          )}
        >
          {processing ? (
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-6 h-6 mr-2" />
          ) : (
            <Mic className="w-6 h-6 mr-2" />
          )}
          {processing ? 'Processing...' : isListening ? 'Listening...' : 'Ask a Question'}
        </Button>

        {/* Transcript */}
        {transcript && (
          <div className="glass p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">You said:</p>
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="glass p-4 rounded-lg border-l-4 border-primary">
            <p className="text-sm text-muted-foreground mb-1">Assistant:</p>
            <p className="text-sm leading-relaxed">{response}</p>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground mb-3">Try asking:</p>
        <div className="space-y-2">
          {[
            'What are the risks in this contract?',
            'Explain this clause in simple words',
            'What should I do before signing?',
            'Any red flags?',
          ].map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleVoiceQuery(suggestion)}
              disabled={processing || isSpeaking}
              className="w-full text-left text-xs glass glass-hover p-2 rounded transition-all disabled:opacity-50"
            >
              "{suggestion}"
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
