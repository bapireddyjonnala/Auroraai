import { create } from 'zustand';
import { DocumentAnalysis, ProcessingStage } from '@/types';

interface AnalysisState {
  currentAnalysis: DocumentAnalysis | null;
  analyses: DocumentAnalysis[];
  processingStages: ProcessingStage[];
  isProcessing: boolean;
  setCurrentAnalysis: (analysis: DocumentAnalysis | null) => void;
  setAnalyses: (analyses: DocumentAnalysis[]) => void;
  addAnalysis: (analysis: DocumentAnalysis) => void;
  updateAnalysis: (id: string, updates: Partial<DocumentAnalysis>) => void;
  setProcessingStages: (stages: ProcessingStage[]) => void;
  updateStage: (id: string, updates: Partial<ProcessingStage>) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentAnalysis: null,
  analyses: [],
  processingStages: [],
  isProcessing: false,
  
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  
  setAnalyses: (analyses) => set({ analyses }),
  
  addAnalysis: (analysis) => set((state) => ({
    analyses: [analysis, ...state.analyses],
  })),
  
  updateAnalysis: (id, updates) => set((state) => ({
    analyses: state.analyses.map((a) => a.id === id ? { ...a, ...updates } : a),
    currentAnalysis: state.currentAnalysis?.id === id 
      ? { ...state.currentAnalysis, ...updates }
      : state.currentAnalysis,
  })),
  
  setProcessingStages: (stages) => set({ processingStages: stages }),
  
  updateStage: (id, updates) => set((state) => ({
    processingStages: state.processingStages.map((s) => 
      s.id === id ? { ...s, ...updates } : s
    ),
  })),
  
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  
  reset: () => set({
    currentAnalysis: null,
    processingStages: [],
    isProcessing: false,
  }),
}));
