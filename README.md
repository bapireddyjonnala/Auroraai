# Aurora.ai

**Real-Time Legal Intelligence & Cybersecurity Threat Detection Platform with Voice AI**

Aurora.ai is a production-ready AI platform that combines legal document analysis with cybersecurity threat detection, powered by advanced AI models and voice interaction capabilities.

---

## 🎯 Features

### 📄 Legal Document Intelligence
- **Real-time Document Analysis** - Upload PDF, DOC, DOCX files for instant AI analysis (< 10s)
- **Smart Clause Detection** - Automatically identifies and categorizes:
  - 🔴 Risk clauses
  - 🟢 Payment terms
  - 🔵 Obligations
  - 🟠 Expiry/termination clauses
- **Risk Assessment** - Intelligent scoring (Low/Medium/High) with explanations
- **Plain-Language Summaries** - Converts complex legal jargon into understandable insights
- **Contract Type Recognition** - Employment, Rental, NDA, Business contracts
- **Compliance Analysis** - Identifies potential compliance issues

### 🎙️ Voice AI Assistant
- **Voice Questions** - Ask questions using your voice
- **Automated Risk Reading** - AI reads out high-risk clauses with explanations
- **Recommended Actions** - Voice-delivered guidance on what to do
- **Document Q&A** - Ask anything about your uploaded document
- **Text-to-Speech** - All responses delivered via voice
- **Multilingual Support** - Browser-based speech recognition

### 🛡️ Cybersecurity Threat Detection
- **Scam Message Analysis** - Detect lottery scams, tech support fraud, impersonation
- **Phishing Detection** - Email and message analysis using NLP patterns
- **Fake Profile Detection** - Behavioral and metadata analysis
- **URL Analysis** - Malicious link detection
- **Risk Scoring** - 0-100 threat score with severity levels
- **Pattern Recognition** - Identifies urgency tactics, financial requests, suspicious links
- **Actionable Insights** - Clear recommendations on how to respond

---

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for blazing-fast builds
- **Tailwind CSS** with custom aurora theme
- **Zustand** for state management
- **React Router** for navigation
- **shadcn/ui** component library

### Backend Stack (OnSpace Cloud)
- **PostgreSQL Database** - Document analyses, threat scans, chat history
- **Storage Buckets** - Temporary document uploads (auto-deleted)
- **Edge Functions** - Serverless AI processing
- **Row Level Security** - User data isolation
- **Real-time Polling** - Status updates during processing

### AI Integration (OnSpace AI)
- **google/gemini-2.5-pro** - Deep legal analysis
- **google/gemini-3-flash-preview** - Fast threat detection & voice responses
- **Browser Speech APIs** - Voice input/output

---

## 📂 Project Structure

```
aurora.ai/
├── src/
│   ├── components/
│   │   ├── features/
│   │   │   ├── ModuleSelector.tsx       # Landing page module selection
│   │   │   ├── DocumentUpload.tsx       # Drag & drop file upload
│   │   │   ├── ProcessingPipeline.tsx   # Real-time progress visualization
│   │   │   ├── AnalysisResults.tsx      # Document analysis display
│   │   │   ├── VoiceAssistant.tsx       # Voice AI interface
│   │   │   ├── LegalIntelligence.tsx    # Legal module orchestrator
│   │   │   └── ThreatDetection.tsx      # Cybersecurity module
│   │   ├── layout/
│   │   │   └── Header.tsx               # Navigation header
│   │   └── ui/                          # shadcn components
│   ├── pages/
│   │   ├── AuthPage.tsx                 # OTP + Password authentication
│   │   └── HomePage.tsx                 # Main app page
│   ├── hooks/
│   │   └── useAuth.tsx                  # Authentication hook
│   ├── stores/
│   │   ├── authStore.ts                 # Auth state
│   │   └── analysisStore.ts             # Document analysis state
│   ├── types/
│   │   └── index.ts                     # TypeScript definitions
│   └── lib/
│       ├── supabase.ts                  # Supabase client
│       └── utils.ts                     # Utilities
├── supabase/
│   └── functions/
│       ├── _shared/
│       │   └── cors.ts                  # CORS headers
│       ├── analyze-document/            # Legal AI analysis
│       ├── voice-assistant/             # Voice Q&A processing
│       └── detect-threat/               # Threat detection AI
└── public/
```

---

## 🚀 Getting Started

### Prerequisites
- Modern browser with Speech API support (Chrome, Edge recommended)
- OnSpace account (backend automatically configured)

### Usage Flow

1. **Sign Up / Sign In**
   - Email-based OTP verification
   - Set password and username
   - Secure authentication

2. **Legal Module**
   - Click "Legal Document Intelligence"
   - Upload document (PDF/DOC/DOCX, max 10MB)
   - Watch real-time processing pipeline
   - Review AI analysis results
   - Use voice assistant for questions

3. **Security Module**
   - Click "Cybersecurity Threat Detection"
   - Select scan type (Message/Email/Profile/URL)
   - Paste content to analyze
   - Review threat assessment
   - Follow security recommendations

---

## 🧠 AI Models & Algorithms

### Legal Analysis Pipeline
1. **Document Upload** → Storage Bucket
2. **OCR Extraction** → Gemini Flash (text extraction)
3. **AI Analysis** → Gemini Pro (deep analysis)
   - Contract type classification
   - Clause detection & categorization
   - Risk scoring algorithm
   - Plain-language translation
4. **Results Storage** → PostgreSQL
5. **Auto-Cleanup** → Delete uploaded file

### Threat Detection Pipeline
1. **Content Input** → User submits text/URL
2. **AI Analysis** → Gemini Flash
   - Pattern matching (urgency, impersonation, finance requests)
   - NLP classification
   - Risk indicator extraction
   - Threat categorization
3. **Scoring Algorithm**
   - Severity weighting
   - Pattern count
   - Context analysis
4. **Results Storage** → PostgreSQL

### Voice Assistant Pipeline
1. **Voice Input** → Browser Speech Recognition API
2. **Transcription** → Text conversion
3. **Context Building** → Combine with document data
4. **AI Response** → Gemini Flash (conversational)
5. **TTS Output** → Browser Speech Synthesis API

---

## 🎨 Design System

### Theme
- **Primary Color**: Aurora Blue (#3b82f6)
- **Gradients**: Blue → Cyan → Purple
- **Effects**: Glassmorphism, aurora glows
- **Typography**: Inter (body), Space Grotesk (headings)

### Components
- Glass cards with backdrop blur
- Animated processing pipeline
- Color-coded clause highlights
- Voice waveform visualization
- Risk badges (Low/Medium/High/Critical)

---

## 🔐 Security & Privacy

### Data Protection
- **Temporary Storage**: Documents deleted immediately after analysis
- **No Retention**: Zero document storage policy
- **RLS Policies**: Users can only access their own data
- **Encrypted Transport**: HTTPS only
- **JWT Authentication**: Secure API access

### Backend Security
- Service role for Edge Functions
- Row Level Security on all tables
- Private storage buckets
- Input validation
- Rate limiting ready

---

## 📊 Database Schema

### Tables
- **user_profiles** - User account data
- **document_analyses** - Legal analysis results
- **threat_scans** - Security scan results
- **chat_messages** - Voice/chat history

### Storage
- **legal-documents** - Temporary file uploads (auto-deleted)

---

## 🛠️ Development

### Key Technologies
- **React Query** - Server state management
- **Zustand** - Client state
- **Browser APIs** - Speech Recognition & Synthesis
- **Supabase Client** - Database & auth
- **Edge Functions** - Serverless computing
- **OnSpace AI** - Google Gemini models

### Environment Variables
- `VITE_SUPABASE_URL` - Auto-configured
- `VITE_SUPABASE_ANON_KEY` - Auto-configured
- `ONSPACE_AI_BASE_URL` - Edge Function env
- `ONSPACE_AI_API_KEY` - Edge Function env

---

## 📈 Future Enhancements

- [ ] Multi-document comparison
- [ ] Export reports to PDF
- [ ] Real-time collaboration
- [ ] Advanced search & filtering
- [ ] Webhook integrations
- [ ] Mobile app version
- [ ] Batch processing
- [ ] Custom AI training

---

## 📝 License

Built with OnSpace Cloud for hackathons and production use.

---

## 🌟 Features Highlight

✅ **Production-Ready** - Real AI integrations, no mocks
✅ **Voice-First** - Natural language interaction
✅ **Fast Processing** - < 10s document analysis
✅ **Privacy-Focused** - Zero data retention
✅ **User-Friendly** - Plain-language explanations
✅ **Comprehensive** - Legal + Security in one platform
✅ **Scalable** - Serverless architecture
✅ **Beautiful UI** - Modern aurora-themed design

---

**Aurora.ai** - Making legal documents understandable and detecting threats in real-time. 🚀
