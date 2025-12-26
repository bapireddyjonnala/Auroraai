export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

export interface Clause {
  id: string;
  type: 'risk' | 'payment' | 'obligation' | 'expiry';
  text: string;
  risk_level: 'low' | 'medium' | 'high';
  position: number;
  explanation: string;
  recommendation: string;
}

export interface PaymentTerms {
  amount?: string;
  schedule?: string;
  penalties?: string;
}

export interface ExpiryTerms {
  date?: string;
  notice_period?: string;
  auto_renewal?: boolean;
}

export interface DocumentAnalysis {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'processing' | 'completed' | 'failed';
  plain_summary?: string;
  risk_level?: 'low' | 'medium' | 'high';
  risk_score?: number;
  contract_type?: string;
  clauses?: Clause[];
  compliance_issues?: string[];
  recommended_actions?: string[];
  key_obligations?: string[];
  payment_terms?: PaymentTerms;
  expiry_terms?: ExpiryTerms;
  processing_time_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface RiskIndicator {
  indicator: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

export interface ThreatScan {
  id: string;
  user_id: string;
  scan_type: 'fake_profile' | 'phishing' | 'scam_message' | 'url_analysis';
  content: string;
  is_threat: boolean;
  threat_level?: 'low' | 'medium' | 'high' | 'critical';
  threat_score?: number;
  threat_category?: string;
  detected_patterns?: string[];
  risk_indicators?: RiskIndicator[];
  explanation?: string;
  recommended_action?: string;
  processing_time_ms?: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  document_id?: string;
  role: 'user' | 'assistant';
  content: string;
  is_voice: boolean;
  created_at: string;
}

export interface ProcessingStage {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  message?: string;
}
