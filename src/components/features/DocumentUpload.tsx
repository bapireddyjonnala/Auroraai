import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface DocumentUploadProps {
  onUploadComplete: (analysisId: string) => void;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthStore();

  const handleFile = useCallback(async (file: File) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upload documents',
        variant: 'destructive',
      });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PDF, DOC, DOCX, or TXT files',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create analysis record
      const { data: analysis, error: insertError } = await supabase
        .from('document_analyses')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Start processing via Edge Function
      const { error: processError } = await supabase.functions.invoke('analyze-document', {
        body: {
          analysis_id: analysis.id,
          file_path: filePath,
        },
      });

      if (processError) {
        let errorMessage = processError.message;
        if (processError instanceof FunctionsHttpError) {
          try {
            const statusCode = processError.context?.status ?? 500;
            const textContent = await processError.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || processError.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${processError.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      onUploadComplete(analysis.id);
      
      toast({
        title: 'Document uploaded',
        description: 'AI analysis started...',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [user, onUploadComplete, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <Card
      className={cn(
        'glass border-2 border-dashed transition-all duration-300',
        isDragging && 'border-primary bg-primary/5',
        uploading && 'opacity-50 pointer-events-none'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="p-12 text-center">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-primary" />
          )}
        </div>

        <h3 className="text-2xl font-bold mb-2">
          {uploading ? 'Uploading...' : 'Upload Legal Document'}
        </h3>
        
        <p className="text-muted-foreground mb-6">
          Drag and drop your document here, or click to browse
        </p>

        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleInputChange}
          disabled={uploading}
        />
        
        <Button
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={uploading}
          className="mb-6"
        >
          <FileText className="w-4 h-4 mr-2" />
          Select Document
        </Button>

        <div className="flex items-start gap-2 text-sm text-muted-foreground max-w-md mx-auto">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-left">
            Supported formats: PDF, DOC, DOCX, TXT (Max 10MB). Documents are automatically deleted after analysis.
          </p>
        </div>
      </div>
    </Card>
  );
}
