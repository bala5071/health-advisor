# Health Advisor - Technical Architecture Document

## 1. System Overview

A React Native mobile application with edge-native multi-agent AI system that acts as a personalized health advisor. The app autonomously analyzes product photos, provides voice-based health recommendations, tracks user health patterns, and generates actionable health reports.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE APP LAYER (React Native)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Camera    │  │    Voice    │  │    UI/UX    │  │  Notification Svc   │ │
│  │   Module    │  │   Interface │  │  Components │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼────────────┘
          │                │                │                    │
          ▼                ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATION LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     AGENT ORCHESTRATOR                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐ │  │
│  │  │   Agent     │  │   Agent     │  │    Task     │  │   Context     │ │  │
│  │  │  Registry   │  │  Router     │  │   Queue     │  │   Manager     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MULTI-AGENT SYSTEM (Edge AI)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   VISION    │  │    OCR      │  │   HEALTH    │  │      VOICE          │ │
│  │   AGENT     │  │   AGENT     │  │  ADVISOR    │  │     AGENT           │ │
│  │             │  │             │  │   AGENT     │  │                     │ │
│  │ - Image     │  │ - Text      │  │             │  │ - TTS               │ │
│  │   Analysis  │  │   Extract   │  │ - Analyze   │  │ - STT               │ │
│  │ - Product   │  │ - Label     │  │   Health    │  │ - Natural           │ │
│  │   Detection │  │   Parsing   │  │   Context   │  │   Response          │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ NUTRITION   │  │  ALLERGY    │  │   HEALTH    │  │    REPORTING        │ │
│  │   AGENT     │  │   AGENT     │  │  TRACKER    │  │     AGENT           │ │
│  │             │  │             │  │   AGENT     │  │                     │ │
│  │ - Macro     │  │ - Allergen  │  │             │  │ - Weekly Report     │ │
│  │   Analysis  │  │   Detection │  │ - Pattern   │  │ - Monthly Report    │ │
│  │ - Dietary   │  │ - Cross     │  │   Analysis  │  │ - Alert Generation  │ │
│  │   Scoring   │  │   Reactivity│  │ - Trends    │  │ - Clinic Referral   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────┐   │
│  │        LOCAL STORAGE                │  │     SUPABASE (CLOUD)        │   │
│  │        (WatermelonDB + MMKV)        │  │                             │   │
│  ├─────────────────────────────────────┤  ├─────────────────────────────┤   │
│  │ - Health Profile (SENSITIVE)        │  │ - User Authentication       │   │
│  │ - Health Conditions                 │  │ - User Account              │   │
│  │ - Allergies & Medications           │  │ - Scan Metadata             │   │
│  │ - Dietary Preferences               │  │ - Reports (Generated)       │   │
│  │ - Health Goals                      │  │ - Sync Status               │   │
│  │ - Scan History (Offline Cache)      │  │ - Device Sessions           │   │
│  │ - Analysis Results                  │  │ - Notification Preferences  │   │
│  │ - Voice Audio Files                 │  │ - App Settings (Non-Sensitive)│
│  └─────────────────────────────────────┘  └─────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SYNC MANAGER (Bidirectional)                      │   │
│  │  - Offline-first with conflict resolution                            │   │
│  │  - Health data NEVER leaves device (privacy-first)                   │   │
│  │  - Only anonymized metadata synced to cloud                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Agent System Design

### 3.1 Agent Definitions

#### Vision Agent (PaliGemma)

```
Responsibilities:
- Product image capture and preprocessing
- Object detection with natural language queries (food items, medicine, cosmetics)
- Image quality assessment
- Product classification with visual grounding
- Visual question answering on product images

Technologies:
- PaliGemma 2 (2B/3B quantized) - Vision-Language Model
  - SigLIP vision encoder + Gemma 2 language model
  - Supports referring expressions and grounding
  - 4-bit/8-bit quantization for mobile deployment
- MediaPipe for image preprocessing
- ONNX Runtime for optimized inference

Model Size: ~1.5GB (4-bit quantized)
Inference Time: 300-600ms on modern mobile devices
```

#### OCR Agent

```
Responsibilities:
- Extract text from product labels
- Parse nutritional information
- Identify ingredients list
- Extract expiry dates, batch numbers

Technologies:
- Tesseract.js / ML Kit Text Recognition
- Custom NER model for nutrition facts
```

#### Nutrition Agent

```
Responsibilities:
- Parse and normalize nutritional data
- Calculate dietary scores
- Compare against user's dietary goals
- Identify macro/micronutrient content

Technologies:
- Local nutrition database (WatermelonDB + embedded dataset)
- Rule-based scoring engine
- USDA FoodData Central (embedded, compressed)
```

#### Allergy Agent

```
Responsibilities:
- Match ingredients against user allergies
- Detect cross-reactivity patterns
- Flag potential allergens
- Severity classification (mild/moderate/severe)

Technologies:
- Allergen knowledge graph
- Fuzzy matching algorithms
```

#### Health Advisor Agent (Core)

```
Responsibilities:
- Integrate outputs from all agents
- Apply user health context (conditions, medications)
- Generate personalized recommendations
- Risk assessment and scoring
- Natural language explanation generation

Technologies:
- Qwen 2.5 1.5B Instruct (Recommended)
  - Excellent instruction following
  - 4-bit quantized: ~900MB
  - Strong reasoning for health decisions
- Alternative: Phi-3.5 Mini 3.8B
  - Microsoft's compact model
  - 4-bit quantized: ~2.2GB
  - Better complex reasoning
- Alternative: Gemma 2 2B
  - Google's lightweight model
  - 4-bit quantized: ~1.2GB
  - Good safety alignment
- RAG with local health knowledge base
- Decision tree for rule-based guardrails

Model Size: 900MB - 2.2GB (depending on model choice)
Inference Time: 200-500ms
```

#### Voice Agent

```
Responsibilities:
- Text-to-Speech output
- Speech-to-Text input (optional voice commands)
- Natural language response generation
- Conversational context management

Technologies:
- React Native Voice / Expo Speech
- Vosk (offline STT)
- Coqui TTS / Piper TTS (offline)
```

#### Health Tracker Agent

```
Responsibilities:
- Log all product scans and recommendations
- Track user compliance (accepted/rejected advice)
- Monitor health metric trends
- Pattern recognition in user behavior

Technologies:
- WatermelonDB with lazy collections
- Statistical analysis module
- AsyncStorage for quick access data
```

#### Reporting Agent

```
Responsibilities:
- Generate weekly/monthly health reports
- Identify health risk patterns
- Trigger clinic/hospital visit recommendations
- Export reports (PDF, email)

Technologies:
- Report templates engine
- Scheduled job runner
- Push notification triggers
```

### 3.2 Agent Communication Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      AUTONOMOUS PROCESSING PIPELINE                       │
└──────────────────────────────────────────────────────────────────────────┘

User Captures Photo
        │
        ▼
┌───────────────────┐
│ Vision Agent      │ ──── Product Detected? ──── No ──▶ "Please scan a product"
│ (PaliGemma 2B)    │
│ (300-600ms)       │
│                   │
│ - Detect product  │
│ - Visual grounding│
│ - VQA for labels  │
└───────┬───────────┘
        │ Yes
        ▼
┌───────────────────┐
│  OCR Agent        │ ──── Text Extracted? ──── No ──▶ Use PaliGemma VQA
│  (ML Kit)         │
│ (200-400ms)       │
└───────┬───────────┘
        │ Yes
        ▼
┌───────────────────────────────────────────────────────────────┐
│              PARALLEL AGENT PROCESSING                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Nutrition   │  │  Allergy    │  │   Health    │           │
│  │   Agent     │  │   Agent     │  │  Tracker    │           │
│  │             │  │             │  │   Agent     │           │
│  │ (100-200ms) │  │ (100-200ms) │  │ (Async)     │           │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘           │
│         │                │                                    │
└─────────┼────────────────┼────────────────────────────────────┘
          │                │
          ▼                ▼
┌───────────────────────────────────────────────────────────────┐
│          HEALTH ADVISOR AGENT (SLM - Qwen 2.5 1.5B)           │
│                                                               │
│  Inputs:                                                      │
│  - User Health Profile (conditions, medications, allergies)   │
│  - Nutrition Analysis                                         │
│  - Allergy Detection Results                                  │
│  - Historical Context                                         │
│                                                               │
│  Processing:                                                  │
│  - Risk Assessment Algorithm                                  │
│  - Personalized Recommendation Generation                     │
│  - Confidence Scoring                                         │
│                                                               │
│  Output:                                                      │
│  - Recommendation: APPROVED / CAUTION / AVOID                 │
│  - Detailed Explanation                                       │
│  - Alternative Suggestions                                    │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────┐
│  Voice Agent  │ ──── Natural Language Response ────▶ Audio Output
│  (Piper TTS)  │
│ (200-400ms)   │
└───────────────┘
        │
        ▼
┌───────────────┐
│ Reporting     │ ──── Log Interaction ────▶ Update Analytics
│ Agent         │
│ (Async)       │
└───────────────┘

Total Pipeline Time: 1.2s - 2.5s (target: < 2.5 seconds)
```

---

## 4. Technology Stack

### 4.1 Mobile Framework

```
React Native (Expo managed workflow)
├── expo-camera          - Camera access
├── expo-av              - Audio playback
├── expo-speech          - TTS capabilities
├── expo-notifications   - Push notifications
├── expo-file-system     - File management
├── expo-secure-store    - Secure credential storage
├── expo-apple-authentication - Apple Sign In
└── expo-constants       - App configuration
```

### 4.2 Edge AI / ML

```
On-Device Inference
├── @aspect-ratio/react-native-fast-tflite - TensorFlow Lite
├── onnxruntime-react-native               - ONNX models
├── react-native-vision-camera             - Advanced camera
├── mediapipe                              - Image preprocessing
└── @react-native-ml-kit/text-recognition - Google ML Kit OCR

Vision-Language Model (PaliGemma)
├── paligemma-react-native                 - PaliGemma integration
├── @anthropic-ai/paligemma-mobile         - Alternative wrapper
└── Custom ONNX conversion                 - For optimized inference

SLM for Recommendations
├── @aspect-ratio/llama.rn                 - Qwen/Phi models (llama.cpp)
├── react-native-llama                     - GGUF model support
├── gemma-react-native                     - Gemma models
└── ONNX Runtime GenAI                     - Microsoft Phi support
```

### 4.3 Data Storage

```
Local Storage (Privacy-First for Health Data)
├── @nozbe/watermelondb                    - Primary local database
│   - Lazy loading (reduces initial memory)
│   - Observable queries (reactive UI)
│   - Stores ALL health-related data locally
│   - ~50KB library size
├── @react-native-async-storage            - Simple key-value
├── react-native-mmkv                      - Ultra-fast key-value
│   - For caching and session data
│   - Auth tokens (encrypted)
│   - ~100KB library size
└── expo-file-system                       - File management

Supabase (Cloud - Authentication & Non-Sensitive Data)
├── @supabase/supabase-js                  - Supabase client
├── @supabase/auth-helpers-react           - Auth utilities
├── Authentication Methods:
│   ├── Email/Password
│   ├── Google OAuth
│   ├── Apple Sign In (iOS)
│   └── Magic Link (Passwordless)
├── Cloud Storage:
│   ├── User accounts & profiles
│   ├── Scan metadata (NOT health data)
│   ├── Generated reports (anonymized)
│   ├── Notification preferences
│   └── Device sessions
└── Realtime subscriptions for sync

Data Split Strategy:
┌────────────────────────────────────────────────────────────────┐
│                    LOCAL ONLY (Private)                        │
├────────────────────────────────────────────────────────────────┤
│ - Health conditions, medications, allergies                    │
│ - Detailed nutrition analysis results                          │
│ - Voice recordings & transcripts                               │
│ - Full scan images & extracted text                            │
│ - Personal health goals & dietary preferences                  │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Cloud)                            │
├────────────────────────────────────────────────────────────────┤
│ - User authentication (email, OAuth)                           │
│ - Scan timestamps & product names (metadata only)              │
│ - Generated report summaries (anonymized)                      │
│ - App settings & preferences                                   │
│ - Push notification tokens                                     │
│ - Multi-device sync state                                      │
└────────────────────────────────────────────────────────────────┘
```

### 4.4 Authentication (Supabase)

```
Supabase Auth Flow
├── Sign Up Methods
│   ├── Email/Password with email verification
│   ├── Google OAuth (react-native-google-signin)
│   ├── Apple Sign In (expo-apple-authentication)
│   └── Magic Link (passwordless email)
│
├── Session Management
│   ├── JWT token handling (auto-refresh)
│   ├── Secure token storage (MMKV encrypted)
│   ├── Session persistence across app restarts
│   └── Multi-device session support
│
├── Protected Routes
│   ├── Auth state listener
│   ├── Automatic redirect to login
│   └── Guest mode for first-time users
│
└── Security Features
    ├── Row Level Security (RLS) policies
    ├── PKCE flow for OAuth
    ├── Rate limiting
    └── Email confirmation required
```

### 4.5 Voice Processing

```
Speech-to-Text (Offline)
├── @react-native-voice/voice             - Voice recognition
├── vosk                                  - Offline STT
└── whisper.rn                            - Whisper model

Text-to-Speech (Offline)
├── expo-speech                           - Basic TTS
├── react-native-tts                      - Advanced TTS
└── coqui-tts / piper-tts                 - Neural TTS
```

### 4.6 State Management

```
├── Zustand                               - Lightweight state
├── React Query / TanStack Query          - Server state (Supabase)
└── React Context                         - Simple state
```

---

## 5. Data Models

### 5.0 Supabase User Account (Cloud)

```typescript
// Supabase Auth User (Managed by Supabase)
interface AuthUser {
  id: string; // Supabase auth UID
  email: string;
  email_verified: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

// Supabase Profile Table
interface UserProfile {
  id: string; // Same as auth UID
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;

  // Sync metadata
  last_sync_at?: string;
  device_count: number;

  // Preferences (non-sensitive)
  notification_enabled: boolean;
  report_frequency: "weekly" | "monthly" | "none";
  theme: "light" | "dark" | "system";
}

// Supabase Scan Metadata (Cloud - anonymized)
interface ScanMetadata {
  id: string;
  user_id: string;
  local_scan_id: string; // Reference to local WatermelonDB record
  product_name?: string;
  scan_timestamp: string;
  verdict: "approved" | "caution" | "avoid";

  // NO health data, allergies, or conditions stored here
}
```

### 5.1 User Health Profile (Local Only - Private)

```typescript
interface UserHealthProfile {
  id: string;
  userId?: string; // Optional link to Supabase UID
  personalInfo: {
    age: number;
    biologicalSex: "male" | "female" | "other";
    weight?: number;
    height?: number;
  };
  healthConditions: HealthCondition[];
  medications: Medication[];
  allergies: Allergy[];
  dietaryPreferences: DietaryPreference[];
  healthGoals: HealthGoal[];
  createdAt: Date;
  updatedAt: Date;

  // NEVER synced to cloud - stays local
  syncStatus: "local_only";
}

interface HealthCondition {
  id: string;
  name: string; // e.g., "Type 2 Diabetes"
  severity: "mild" | "moderate" | "severe";
  diagnosedDate?: Date;
  restrictions: string[]; // Dietary restrictions
  notes?: string;
}

interface Allergy {
  id: string;
  allergen: string; // e.g., "Peanuts", "Gluten"
  severity: "mild" | "moderate" | "severe" | "life_threatening";
  reaction: string; // Description of reaction
  crossReactivity: string[]; // Related allergens
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  dietaryInteractions: string[]; // Foods to avoid
  active: boolean;
}
```

### 5.2 Product Scan Record

```typescript
interface ProductScan {
  id: string;
  timestamp: Date;
  imageData: string; // Local path to image

  extractedInfo: {
    productName?: string;
    brand?: string;
    barcode?: string;
    ingredients: string[];
    nutritionFacts: NutritionFacts;
    allergens: string[];
    expiryDate?: Date;
  };

  analysis: {
    nutritionScore: number; // 0-100
    healthRisks: HealthRisk[];
    allergenWarnings: AllergenWarning[];
    conditionWarnings: ConditionWarning[];
  };

  recommendation: {
    verdict: "approved" | "caution" | "avoid";
    confidence: number; // 0-1
    explanation: string;
    alternatives?: string[];
  };

  userAction: "accepted" | "rejected" | "ignored";
  voiceResponse: string; // Path to audio file
}

interface NutritionFacts {
  servingSize: string;
  calories: number;
  totalFat: number;
  saturatedFat: number;
  transFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbs: number;
  dietaryFiber: number;
  sugars: number;
  addedSugars: number;
  protein: number;
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
}
```

### 5.3 Health Report

```typescript
interface HealthReport {
  id: string;
  type: "weekly" | "monthly" | "alert";
  period: {
    start: Date;
    end: Date;
  };

  summary: {
    totalScans: number;
    approvedCount: number;
    cautionCount: number;
    avoidCount: number;
    complianceRate: number; // % of accepted recommendations
  };

  nutritionAnalysis: {
    averageDailyCalories: number;
    macroDistribution: {
      protein: number;
      carbs: number;
      fat: number;
    };
    sodiumIntake: "low" | "moderate" | "high";
    sugarIntake: "low" | "moderate" | "high";
    nutrientDeficiencies: string[];
  };

  healthInsights: {
    riskTrends: RiskTrend[];
    improvements: string[];
    concerns: string[];
    patterns: BehaviorPattern[];
  };

  recommendations: {
    dietaryChanges: string[];
    clinicVisitRequired: boolean;
    clinicVisitReason?: string;
    urgencyLevel?: "low" | "medium" | "high";
  };
}
```

---

## 6. Project Directory Structure

```
health-advisor/
├── app/                           # Expo Router pages
│   ├── (auth)/                    # Auth screens (unprotected)
│   │   ├── login.tsx              # Login screen
│   │   ├── signup.tsx             # Sign up screen
│   │   ├── forgot-password.tsx    # Password reset
│   │   └── oauth-callback.tsx     # OAuth redirect handler
│   ├── (tabs)/                    # Tab navigation (protected)
│   │   ├── index.tsx              # Home/Scan screen
│   │   ├── history.tsx            # Scan history
│   │   ├── profile.tsx            # Health profile
│   │   └── reports.tsx            # Health reports
│   ├── onboarding/                # Onboarding flow
│   │   ├── welcome.tsx
│   │   ├── health-profile.tsx
│   │   └── permissions.tsx
│   ├── scan/                      # Scan-related screens
│   │   ├── [id].tsx               # Scan detail view
│   │   └── result.tsx             # Analysis result
│   ├── settings/                  # Settings screens
│   │   ├── index.tsx              # Settings main
│   │   └── account.tsx            # Account management
│   └── _layout.tsx                # Root layout with auth guard
│
├── src/
│   ├── agents/                    # Multi-agent system
│   │   ├── core/
│   │   │   ├── AgentOrchestrator.ts
│   │   │   ├── AgentRegistry.ts
│   │   │   ├── TaskQueue.ts
│   │   │   └── types.ts
│   │   ├── VisionAgent.ts
│   │   ├── OCRAgent.ts
│   │   ├── NutritionAgent.ts
│   │   ├── AllergyAgent.ts
│   │   ├── HealthAdvisorAgent.ts
│   │   ├── VoiceAgent.ts
│   │   ├── HealthTrackerAgent.ts
│   │   └── ReportingAgent.ts
│   │
│   ├── ai/                        # AI/ML models
│   │   ├── models/                # Model files (on-demand download)
│   │   │   ├── vision/
│   │   │   │   └── paligemma-2b-q4.onnx
│   │   │   ├── llm/
│   │   │   │   ├── qwen-2.5-1.5b-q4.gguf
│   │   │   │   └── phi-3.5-mini-q4.gguf
│   │   │   └── voice/
│   │   │       ├── piper-tts-en.onnx
│   │   │       └── whisper-tiny.onnx
│   │   ├── inference/
│   │   │   ├── PaliGemmaRunner.ts
│   │   │   ├── ONNXInterpreter.ts
│   │   │   └── SLMInference.ts
│   │   └── preprocessing/
│   │       ├── ImageProcessor.ts
│   │       └── TextProcessor.ts
│   │
│   ├── voice/                     # Voice processing
│   │   ├── TTSProvider.ts
│   │   ├── STTProvider.ts
│   │   └── VoiceManager.ts
│   │
│   ├── database/                  # Data layer
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   ├── repositories/
│   │   │   ├── UserRepository.ts
│   │   │   ├── ScanRepository.ts
│   │   │   └── ReportRepository.ts
│   │   └── DatabaseManager.ts
│   │
│   ├── supabase/                  # Supabase client & auth
│   │   ├── client.ts              # Supabase client initialization
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx   # Auth context provider
│   │   │   ├── useAuth.ts         # Auth hook
│   │   │   ├── authService.ts     # Auth operations
│   │   │   └── oauth.ts           # Google/Apple OAuth
│   │   └── sync/
│   │       ├── SyncManager.ts     # Local <-> Cloud sync
│   │       └── ConflictResolver.ts
│   │
│   ├── services/                  # Business logic
│   │   ├── ScanService.ts
│   │   ├── HealthProfileService.ts
│   │   ├── ReportService.ts
│   │   └── NotificationService.ts
│   │
│   ├── stores/                    # State management
│   │   ├── useUserStore.ts
│   │   ├── useScanStore.ts
│   │   └── useSettingsStore.ts
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useCamera.ts
│   │   ├── useAgentPipeline.ts
│   │   ├── useVoice.ts
│   │   └── useHealthProfile.ts
│   │
│   ├── components/                # UI components
│   │   ├── camera/
│   │   │   └── CameraView.tsx
│   │   ├── scan/
│   │   │   ├── ScanResult.tsx
│   │   │   ├── RecommendationCard.tsx
│   │   │   └── NutritionLabel.tsx
│   │   ├── voice/
│   │   │   ├── VoiceButton.tsx
│   │   │   └── TranscriptDisplay.tsx
│   │   ├── reports/
│   │   │   ├── ReportCard.tsx
│   │   │   ├── HealthChart.tsx
│   │   │   └── ClinicAlert.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── utils/                     # Utilities
│   │   ├── nutritionCalculator.ts
│   │   ├── riskAssessment.ts
│   │   ├── formatters.ts
│   │   └── constants.ts
│   │
│   └── types/                     # TypeScript types
│       ├── agent.ts
│       ├── health.ts
│       ├── scan.ts
│       └── report.ts
│
├── assets/
│   ├── images/
│   ├── fonts/
│   └── sounds/
│
├── android/                       # Native Android (if needed)
├── ios/                           # Native iOS (if needed)
│
├── app.json                       # Expo config
├── package.json
├── tsconfig.json
├── babel.config.js
└── README.md
```

---

## 7. Key Implementation Details

### 7.1 Agent Orchestration Pattern

```typescript
// Pseudo-code for agent orchestration
class AgentOrchestrator {
  private agents: Map<AgentType, Agent>;
  private taskQueue: TaskQueue;

  async processImage(imageUri: string): Promise<Recommendation> {
    // Step 1: Vision Agent - Detect product
    const visionResult = await this.agents.get("vision").analyze(imageUri);

    // Step 2: OCR Agent - Extract text (parallel with nutrition lookup if barcode)
    const [ocrResult, barcodeData] = await Promise.all([
      this.agents.get("ocr").extract(imageUri),
      visionResult.barcode ? this.lookupBarcode(visionResult.barcode) : null,
    ]);

    // Step 3: Merge data and run parallel analysis
    const productData = this.mergeProductData(
      visionResult,
      ocrResult,
      barcodeData,
    );

    const [nutritionAnalysis, allergyCheck] = await Promise.all([
      this.agents.get("nutrition").analyze(productData),
      this.agents.get("allergy").check(productData, userProfile),
    ]);

    // Step 4: Health Advisor - Generate recommendation
    const recommendation = await this.agents.get("healthAdvisor").evaluate({
      productData,
      nutritionAnalysis,
      allergyCheck,
      userProfile,
    });

    // Step 5: Voice Agent - Convert to speech (async)
    this.agents.get("voice").speak(recommendation.summary);

    // Step 6: Log to tracker (async)
    this.agents.get("tracker").log({ productData, recommendation });

    return recommendation;
  }
}
```

### 7.2 Authentication Flow (Supabase)

```typescript
// Auth state management
const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === "SIGNED_IN") {
        // Store session token securely
        await MMKV.setItem("auth_token", session.access_token);
        // Link local health profile to user account
        await linkLocalProfile(session.user.id);
      }

      if (event === "SIGNED_OUT") {
        await MMKV.removeItem("auth_token");
        // Keep local health data, just unlink
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user };
};

// Auth methods
const authService = {
  signUp: (email: string, password: string) =>
    supabase.auth.signUp({ email, password }),

  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithGoogle: async () => {
    await GoogleSignin.signIn();
    const idToken = await GoogleSignin.getTokens();
    return supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken.idToken,
    });
  },

  signInWithApple: async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    return supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
  },

  signOut: () => supabase.auth.signOut(),

  resetPassword: (email: string) => supabase.auth.resetPasswordForEmail(email),
};
```

### 7.3 Offline-First Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OFFLINE-FIRST DESIGN                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  All core features work without internet:                   │
│  ├── Image capture and analysis                             │
│  ├── Text extraction (OCR)                                  │
│  ├── Product classification                                 │
│  ├── Health recommendation generation                       │
│  ├── Voice output                                           │
│  └── Local data storage                                     │
│                                                             │
│  Optional online features:                                  │
│  ├── Barcode database lookup (fallback to OCR)              │
│  ├── Cloud sync for reports                                 │
│  ├── Model updates                                          │
│  └── User profile backup                                    │
│                                                             │
│  Data sync strategy:                                        │
│  ├── Local-first writes                                     │
│  ├── Background sync when online                            │
│  ├── Conflict resolution (server wins for profile)          │
│  └── Delta sync for efficiency                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Health Alert Triggers

```typescript
// Conditions that trigger clinic visit recommendations
const ALERT_TRIGGERS = {
  // Frequency-based
  HIGH_SODIUM_INTAKE: {
    threshold: "daily sodium > 2300mg for 7 consecutive days",
    urgency: "medium",
    message:
      "Your sodium intake has been consistently high. Consider consulting a nutritionist.",
  },

  HIGH_SUGAR_INTAKE: {
    threshold: "added sugar > 50g daily for 14 days",
    urgency: "medium",
    message:
      "Elevated sugar consumption detected. This may affect blood glucose levels.",
  },

  // Pattern-based
  ALLERGEN_EXPOSURE: {
    threshold: "3+ allergen warnings ignored in 7 days",
    urgency: "high",
    message:
      "Repeated allergen exposure detected. Please review your allergy management plan.",
  },

  // Risk accumulation
  CARDIOVASCULAR_RISK: {
    threshold: "high saturated fat + high sodium + low fiber for 30 days",
    urgency: "high",
    message:
      "Your dietary pattern suggests increased cardiovascular risk. Schedule a checkup.",
  },

  // Compliance-based
  LOW_COMPLIANCE: {
    threshold: "compliance rate < 30% over 14 days",
    urgency: "low",
    message:
      "Many recommendations have been ignored. Would you like to review your health goals?",
  },
};
```

---

## 8. Additional Feature Suggestions

### 8.1 Core Feature Extensions

| Feature                  | Description                                                          | Priority |
| ------------------------ | -------------------------------------------------------------------- | -------- |
| **Meal Planning**        | AI-generated meal plans based on health profile and scanned products | High     |
| **Medication Reminders** | Integration with medication schedule + food-drug interaction alerts  | High     |
| **Barcode History**      | Quick re-scan of previously analyzed products                        | Medium   |
| **Social Sharing**       | Share reports with family members or healthcare providers            | Medium   |
| **Wearable Integration** | Sync with Apple Health / Google Fit for holistic tracking            | Medium   |
| **Recipe Scanner**       | Scan recipe cards and get health-adapted versions                    | Low      |

### 8.2 Advanced AI Features

| Feature                        | Description                                             | Priority |
| ------------------------------ | ------------------------------------------------------- | -------- |
| **Predictive Health Insights** | ML model predicts future health risks based on patterns | High     |
| **Natural Language Queries**   | "Can I eat this if I have diabetes?" voice questions    | High     |
| **Personalized Learning**      | Model adapts to user preferences over time              | Medium   |
| **Community Insights**         | Anonymized comparison with similar health profiles      | Low      |
| **Drug-Nutrient Interaction**  | Check if nutrients interact with medications            | High     |

### 8.3 User Experience Features

| Feature             | Description                                  | Priority |
| ------------------- | -------------------------------------------- | -------- |
| **Dark Mode**       | Eye-friendly interface for evening use       | Medium   |
| **Accessibility**   | Voice navigation for visually impaired users | High     |
| **Multi-Language**  | Support for regional languages               | Medium   |
| **Family Profiles** | Manage health profiles for family members    | Medium   |
| **Emergency Mode**  | Quick access to allergy info for emergencies | High     |
| **Gamification**    | Health streaks, achievements, and rewards    | Low      |

### 8.4 Integration Features

| Feature                     | Description                                         | Priority |
| --------------------------- | --------------------------------------------------- | -------- |
| **EHR Integration**         | Sync with electronic health records (FHIR standard) | Medium   |
| **Pharmacy Integration**    | Link with pharmacy apps for medication tracking     | Low      |
| **Grocery App Integration** | Export shopping lists based on recommendations      | Medium   |
| **Restaurant Menu Scanner** | Scan menus when dining out                          | Low      |
| **Smart Home Integration**  | Voice assistant (Alexa, Google) integration         | Low      |

---

## 9. Security & Privacy Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                   SECURITY ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Data Protection:                                           │
│  ├── All health data stored encrypted at rest               │
│  ├── AES-256 encryption for sensitive fields                │
│  ├── Secure Enclave / Keystore for keys                     │
│  └── No PII sent to external servers (edge AI)              │
│                                                             │
│  User Consent:                                              │
│  ├── Explicit consent for each data category                │
│  ├── Granular permission controls                           │
│  ├── Data deletion on request                               │
│  └── Export functionality (GDPR compliance)                 │
│                                                             │
│  Compliance:                                                │
│  ├── HIPAA-ready architecture                               │
│  ├── GDPR compliant data handling                           │
│  └── Local processing minimizes data exposure               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Performance Targets

| Metric                     | Target        | Notes                     |
| -------------------------- | ------------- | ------------------------- |
| Image Analysis (PaliGemma) | < 600ms       | Vision + grounding        |
| SLM Recommendation         | < 500ms       | Qwen 2.5 1.5B             |
| Full Pipeline              | < 2.5s        | End-to-end recommendation |
| Voice Response             | < 400ms       | TTS output start          |
| App Launch                 | < 1.5s        | Cold start                |
| Memory Usage               | < 400MB       | During analysis           |
| Battery Impact             | < 3% per scan | Optimized inference       |
| App Bundle Size            | < 50MB        | Without AI models         |
| Model Download             | On-demand     | First launch or WiFi      |

### Model Sizes (Quantized 4-bit)

| Model                   | Size       | Use Case                             |
| ----------------------- | ---------- | ------------------------------------ |
| PaliGemma 2 (2B)        | ~1.5GB     | Vision + Detection                   |
| Qwen 2.5 1.5B Instruct  | ~900MB     | Health recommendations (recommended) |
| Phi-3.5 Mini 3.8B       | ~2.2GB     | Complex reasoning (alternative)      |
| Gemma 2 2B              | ~1.2GB     | Health recommendations (alternative) |
| Whisper Tiny (STT)      | ~75MB      | Voice input (optional)               |
| Piper TTS EN            | ~30MB      | Voice output                         |
| **Total (Recommended)** | **~2.5GB** | PaliGemma + Qwen + Voice             |

### Storage Strategy

```
Model Management:
├── Core models (bundled with app)
│   └── Piper TTS (~30MB)
├── On-demand download (first use)
│   ├── PaliGemma (~1.5GB)
│   └── SLM (~900MB - 2.2GB)
├── WiFi-only download option
├── Model versioning & updates
└── Delete unused models to free space
```

---

## 11. Development Phases

### Phase 1: Foundation (Weeks 1-3)

- Project setup with Expo
- Supabase project setup & authentication
- Basic UI/navigation structure
- Camera integration
- WatermelonDB database setup
- User health profile management (local)
- Auth flow implementation (login, signup, OAuth)

### Phase 2: Core Agents (Weeks 4-7)

- Vision Agent implementation
- OCR Agent implementation
- Nutrition Agent implementation
- Allergy Agent implementation
- Basic recommendation logic

### Phase 3: Voice & Intelligence (Weeks 8-10)

- Voice Agent (TTS/STT)
- Health Advisor Agent with SLM
- Agent orchestration pipeline
- Integration testing
- Supabase sync for non-sensitive data

### Phase 4: Tracking & Reporting (Weeks 11-13)

- Health Tracker Agent
- Reporting Agent
- Weekly/monthly report generation
- Alert system implementation
- Multi-device sync testing

### Phase 5: Polish & Launch (Weeks 14-16)

- Performance optimization
- Security audit (auth + data privacy)
- User testing
- App store submission

---

## 12. Dependencies & Risks

### Technical Risks

| Risk              | Mitigation                                |
| ----------------- | ----------------------------------------- |
| Large model sizes | Use quantized models, lazy loading        |
| Battery drain     | Optimize inference, batch processing      |
| OCR accuracy      | Multiple OCR engines, fallback logic      |
| LLM hallucination | RAG with verified health data, guardrails |

### Dependencies

| Dependency       | Alternatives          |
| ---------------- | --------------------- |
| PaliGemma (ONNX) | Florence-2, BLIP-2    |
| Qwen 2.5 1.5B    | Phi-3.5 Mini, Gemma 2 |
| WatermelonDB     | Realm, PouchDB        |
| Expo             | Bare React Native     |
| Supabase         | Firebase, AWS Cognito |

---

## Approval Checklist

Before proceeding to implementation, please review and confirm:

- [ ] Architecture diagram is clear and understood
- [ ] Multi-agent system design meets requirements
- [ ] Technology stack choices are acceptable (PaliGemma, Qwen 2.5, Supabase)
- [ ] Data storage split (local health data / cloud auth) is acceptable
- [ ] Authentication methods (Email, Google, Apple) are sufficient
- [ ] Data models cover all necessary information
- [ ] Directory structure is appropriate
- [ ] Additional features are prioritized correctly
- [ ] Development timeline is realistic
- [ ] Security requirements are addressed (privacy-first, health data stays local)

**Please review and provide feedback or approval to proceed with implementation.**
