# Health Advisor - Technical Architecture (Implemented State)

This document reflects the architecture currently implemented in the codebase as of the latest updates. It replaces earlier planning-oriented architecture notes with implementation-accurate details.

## Audience Guide

- For engineering onboarding, start with `3. Runtime Flow (Implemented)`, then `9. Routing Structure (Current)`, then `10. Core Source Layout (Current)`.
- For security/compliance review, start with `6. Data Architecture`, then `7. Cloud Architecture (Supabase)`, then `7.4 Security and Compliance Control Map`.

---

## 1. System Summary

Health Advisor is an Expo + React Native application that performs on-device product analysis and health guidance with a multi-agent pipeline. The app uses:

- On-device multimodal inference for product detection (`llama.rn` + SmolVLM2 assets managed by `QwenModelManager`)
- On-device SLM inference for recommendation generation (`Qwen2.5-1.5B-Instruct` via `SLMModelManager`)
- OCR via ML Kit (`@react-native-ml-kit/text-recognition`)
- Local-first health data persistence using WatermelonDB
- Supabase for auth + metadata-only sync

---

## 2. High-Level Implemented Architecture

```text
+--------------------------------------------------------------+
|                        UI / ROUTING                         |
|  Expo Router routes: auth, onboarding, tabs, scan detail   |
+--------------------------------------------------------------+
                              |
                              v
+--------------------------------------------------------------+
|                    APP SHELL + GATING                       |
|  app/_layout.tsx                                             |
|  - AuthProvider session guard                                |
|  - Onboarding/profile completion checks                      |
|  - ModelSetupScreen gate (Qwen + SLM download readiness)     |
+--------------------------------------------------------------+
                              |
                              v
+--------------------------------------------------------------+
|                 AGENT ORCHESTRATION PIPELINE                |
|  AgentOrchestrator.processImage()                           |
|  Vision -> OCR -> (Nutrition || Allergy) -> Advisor         |
|  -> async Voice + async Tracker + severe allergen notif     |
+--------------------------------------------------------------+
                              |
                    +--------------------+
                    |                    |
+------------------------------+  +-----------------------------+
|        LOCAL DATA LAYER      |  |      SUPABASE CLOUD        |
| WatermelonDB + SecureStore   |  | Auth + metadata-only sync  |
| health profiles/scans/reports|  | scan_metadata/report_summary|
+------------------------------+  +-----------------------------+
```

---

## 3. Runtime Flow (Implemented)

### 3.1 Route and startup flow

1. `app/_layout.tsx` hydrates settings and auth state.
2. App determines navigation target based on:
   - Supabase session presence
   - onboarding flag (`onboarding_complete` in storage)
   - profile completion flag (`profile_complete` cache + Supabase metadata)
3. Before normal use, app checks model readiness:
   - `QwenModelManager.areModelsReady()`
   - `SLMModelManager.isSLMReady()`
   - disk fallback probing + readiness rehydration
4. If models are not ready and not skipped, `ModelSetupScreen` is shown.

### 3.2 Scan flow

- Scan entry is `/scan/capture`, resolved by `app/scan/[id].tsx` where `id === "capture"` (or `"new"`) triggers capture mode.
- Capture mode supports:
  - Product image capture
  - Optional nutrition label image capture (or gallery pick)
  - Step-based flow with camera controls and back-navigation safeguards
- Pipeline execution uses `useAgentPipeline` + `agentOrchestrator.processImage()`.
- On success with detected product, result is routed to `/scan/result`.

### 3.3 Agent pipeline order

`AgentOrchestrator` (`src/agents/core/AgentOrchestrator.ts`) executes:

1. `VisionAgent`
2. `OCRAgent`
3. barcode lookup placeholder (currently returns `null`)
4. Parallel:
   - `NutritionAgent.analyze(...)`
   - `AllergyAgent.process(...)`
5. `HealthAdvisorAgent.process(...)`
6. Fire-and-forget:
   - `VoiceAgent.process(...)`
   - `HealthTrackerAgent.logScan(...)` (if user id exists)
7. If severe allergen matches exist, triggers `NotificationService.triggerSevereAllergenAlert(...)`

Pipeline step states surfaced to UI:
`starting`, `detecting_product`, `extracting_text`, `barcode_lookup`, `checking_nutrition`, `checking_allergies`, `generating_recommendation`, `speaking`, `saving`, `complete`.

### 3.4 Engineering onboarding quick path

Use this sequence for a fast codebase walkthrough:

1. Route entry + app shell: `app/_layout.tsx`
2. Auth/session + startup jobs: `src/components/AuthProvider.tsx`
3. Scan UI flow: `app/scan/[id].tsx` and `app/scan/result.tsx`
4. Pipeline state hook: `src/hooks/useAgentPipeline.ts`
5. Orchestration core: `src/agents/core/AgentOrchestrator.ts`
6. Agent implementations: `src/agents/*.ts`
7. Persistence + repositories: `src/database/*`
8. Sync/privacy boundaries: `src/supabase/sync/SyncManager.ts`

Expected first-run behavior to verify manually:

- auth gate -> onboarding/profile gate -> model setup gate -> tabs
- scan capture -> pipeline progress messaging -> result screen -> saved scan history

---

## 4. AI / Agent Layer

### 4.1 Vision agent

- File: `src/agents/VisionAgent.ts`
- Uses:
  - `ImageProcessor` quality checks and resizing
  - `qwenVLMRunner` (`src/ai/inference/QwenVLMRunner.ts`)
- Execution pattern:
  - quality gate
  - image-size gate (`MAX_SAFE_VLM_IMAGE_BYTES`)
  - sequential VQA prompts to determine:
    - product presence
    - product name
    - product type
  - unloads VLM model after run to free memory

### 4.2 OCR agent

- File: `src/agents/OCRAgent.ts`
- Uses dynamic ML Kit text recognition import.
- Parses:
  - ingredient text
  - nutrition facts (heuristic extraction)
  - expiry dates
  - allergen hints

### 4.3 Nutrition agent

- File: `src/agents/NutritionAgent.ts`
- Converts OCR nutrition facts into normalized nutrient fields.
- Computes:
  - Daily Value comparisons
  - flags (`highSodium`, `highSugar`, `highSaturatedFat`)
  - dietary score with optional personalization from health goals
- Includes local USDA subset seeding into `usda_foods` table for lightweight lookup.

### 4.4 Allergy agent

- File: `src/agents/AllergyAgent.ts`
- Loads user allergies from local DB.
- Decrypts stored allergy names via `EncryptionService`.
- Uses allergen graph + alias + fuzzy matching + cross-reactivity rules.
- Returns matched allergens + cross-reactivity warnings + user allergy context.

### 4.5 Health advisor agent

- File: `src/agents/HealthAdvisorAgent.ts`
- Builds prompt with:
  - user profile
  - analysis outputs
  - retrieved knowledge context (`HealthKnowledgeBase`)
- Uses `slmInference` (`src/ai/inference/SLMInference.ts`) for JSON-structured recommendation output.
- Streams tokens when supported.
- Unloads model after inference.

### 4.6 Voice agent

- Files: `src/agents/VoiceAgent.ts`, `src/voice/VoiceManager.ts`, `src/voice/TTSProvider.ts`
- `TTSProvider` prefers Piper-compatible native modules when available, falls back to `expo-speech`.
- `VoiceManager` manages speaking state + subscription updates for UI.

### 4.7 Reporting + tracking agents

- `HealthTrackerAgent`
  - writes scan payload snapshots and user action outcomes into local `scans` table JSON
  - computes snapshots/compliance/trend windows from stored scans
- `ReportingAgent`
  - derives weekly/monthly trend summaries from scan snapshots
  - stores report in local DB
  - pushes summary-only report metadata to Supabase

---

## 5. Model Management

### 5.1 Managed models

- Vision artifacts via `QwenModelManager` (`src/ai/models/QwenModelManager.ts`):
  - main GGUF model URL (SmolVLM2 variant)
  - mmproj file
- Health advisor model via `SLMModelManager` (`src/ai/models/SLMModelManager.ts`):
  - Qwen2.5-1.5B-Instruct GGUF URL

### 5.2 Download behavior

- Downloads are resumable and persisted with MMKV resume metadata.
- Readiness flags are stored in MMKV and can be rehydrated from disk-size checks.
- `ModelSetupScreen` supports:
  - WiFi-only downloads
  - model deletion
  - skip setup flag (`models_setup_skipped`)

---

## 6. Data Architecture

### 6.1 Local database (WatermelonDB)

Schema version: `3` (`src/database/schema.ts`)

Tables:
- `health_profiles`
- `scans`
- `reports`
- `allergies`
- `medications`
- `conditions`
- `usda_foods`

Runtime handling:
- SQLite adapter in app runtime
- LokiJS adapter in Jest runtime
- Defensive handling when native WatermelonDB bridge is unavailable (e.g., Expo Go)

### 6.2 Local secure key/value storage

- File: `src/services/storage.ts`
- Uses `expo-secure-store` for key/value persistence
- Large values spill to file-backed storage with marker indirection (`__file__:` prefix)

### 6.3 Field-level encryption

- File: `src/services/EncryptionService.ts`
- AES-GCM encryption using `@noble/ciphers`
- 32-byte key stored in SecureStore
- Used by health-related repositories/agents for sensitive values (e.g., allergy names)

### 6.4 Data classification and residency

Data classes currently implemented:

- Sensitive local health data (local-only by design):
  - full scan payload JSON, OCR text, ingredient text, detailed nutrition analysis, allergy detail records, conditions, medications
  - storage locations: WatermelonDB tables + encrypted fields where applicable
- Local operational app state:
  - onboarding/model setup flags, cached preferences, download resume metadata
  - storage locations: SecureStore/MMKV/file spill path via `storage.ts`
- Cloud-synced metadata (restricted):
  - `scan_metadata` allowlisted fields and `report_summaries` summary fields
  - storage location: Supabase tables via explicit upsert paths

---

## 7. Cloud Architecture (Supabase)

### 7.1 Auth and session

- Supabase client initialized in `src/supabase/client.ts`
- Auth storage adapter uses local `storage` service
- Supported flows in app:
  - email/password
  - magic link (`signInWithOtp`)
  - OAuth via `expo-web-browser` (`google`, `apple`)

### 7.2 Metadata-only sync

- File: `src/supabase/sync/SyncManager.ts`
- Sync target: `scan_metadata`
- Enforces allowlist payload shape and blocks forbidden sensitive keys.
- Conflict strategy: last-write-wins by `updated_at` (`ConflictResolver`).
- Sync hooks:
  - on sign-in
  - on app open

### 7.3 Report metadata sync

- `ReportingAgent` upserts summary rows to `report_summaries`.
- Payload excludes sensitive health profile and raw scan analysis content.

### 7.4 Security and compliance control map

| Control objective | Implemented mechanism | Primary modules |
|---|---|---|
| Data minimization in cloud sync | Sync only metadata/summary payloads, block sensitive keys | `src/supabase/sync/SyncManager.ts`, `src/agents/ReportingAgent.ts` |
| Local-first processing | Vision/OCR/nutrition/allergy/advisor run on-device | `src/agents/*`, `src/ai/inference/*` |
| Sensitive field protection at rest | AES-GCM encryption + secure key storage | `src/services/EncryptionService.ts`, `src/services/storage.ts` |
| Authenticated access to cloud resources | Supabase session-based auth flows | `src/components/AuthProvider.tsx`, `src/supabase/client.ts` |
| Conflict determinism during sync | Last-write-wins by `updated_at` | `src/supabase/sync/ConflictResolver.ts` |
| Exposure alerting | Severe allergen alert scheduling and trigger | `src/services/NotificationService.ts`, `src/agents/core/AgentOrchestrator.ts` |

Current documented non-goals/limits:

- No cloud upload path for raw scan images or full local scan JSON.
- No bidirectional sync for full health profile entities in current implementation.
- Background scheduling is best-effort and runtime-capability dependent.

---

## 8. Notification & Scheduling

### 8.1 Notification service

- File: `src/services/NotificationService.ts`
- Handles:
  - permission requests
  - local preference caching
  - Supabase preference sync (`notification_prefs`)
  - Android channel setup

### 8.2 Scheduled notifications

- Weekly report recurring reminder (if enabled)
- Daily no-scan nudge (conditional)
- Immediate severe-allergen alert trigger from orchestrator

### 8.3 Report scheduling

- `ReportService.onAppOpen(userId)` triggers periodic weekly/monthly generation.
- Optional background task registration attempted via dynamic imports (`expo-background-fetch`, `expo-task-manager`) when available.

---

## 9. Routing Structure (Current)

```text
app/
|-- _layout.tsx
|-- (auth)/
|   |-- login.tsx
|   |-- signup.tsx
|   |-- forgot-password.tsx
|   |-- reset-password.tsx
|   |-- oauth-callback.tsx
|   `-- complete-profile.tsx
|-- onboarding/
|   |-- welcome.tsx
|   |-- health-profile.tsx
|   `-- permissions.tsx
|-- (tabs)/
|   |-- _layout.tsx
|   |-- home.tsx
|   |-- scan.tsx (redirects to /scan/capture)
|   |-- reports.tsx
|   |-- profile.tsx
|   |-- history.tsx (hidden tab route)
|   |-- emergency.tsx (hidden tab route)
|   `-- index.tsx
|-- scan/
|   |-- [id].tsx   (capture mode + detail mode)
|   `-- result.tsx
|-- settings/
|   |-- index.tsx
|   |-- account.tsx
|   `-- notifications.tsx
|-- reports/
|   `-- [id].tsx
`-- test/
    `-- vision-test.tsx
```

---

## 10. Core Source Layout (Current)

```text
src/
|-- agents/
|   |-- core/ (orchestrator, registry, queue, types, tests)
|   |-- VisionAgent.ts
|   |-- OCRAgent.ts
|   |-- NutritionAgent.ts
|   |-- AllergyAgent.ts
|   |-- HealthAdvisorAgent.ts
|   |-- VoiceAgent.ts
|   |-- HealthTrackerAgent.ts
|   `-- ReportingAgent.ts
|-- ai/
|   |-- inference/ (QwenVLMRunner, SLMInference, ONNXInterpreter)
|   |-- models/ (QwenModelManager, SLMModelManager)
|   |-- preprocessing/ (ImageProcessor, TextProcessor)
|   `-- knowledge/ (HealthKnowledgeBase)
|-- database/
|   |-- DatabaseManager.ts
|   |-- schema.ts
|   |-- models/
|   `-- repositories/
|-- supabase/
|   |-- client.ts
|   `-- sync/
|-- services/
|   |-- storage.ts
|   |-- EncryptionService.ts
|   |-- GDPRService.ts
|   |-- NotificationService.ts
|   `-- ReportService.ts
|-- hooks/
|-- stores/
|-- voice/
|-- components/
`-- theme/
```

---

## 11. Testing and Runtime Constraints

### 11.1 Tests present

- Jest-based tests exist for:
  - `AgentOrchestrator` integration behavior
  - repository-level database operations

### 11.2 Runtime constraints handled in code

- Many modules use lazy/dynamic imports to avoid crashing in runtimes missing native modules.
- WatermelonDB unavailable runtime is explicitly detected and gracefully handled in several paths.
- Inference modules assume development builds with native `llama.rn` support for full AI functionality.

---

## 12. Implementation Notes and Boundaries

- The architecture is currently **local-first** for sensitive health data.
- Cloud sync is intentionally constrained to metadata and summary records.
- Route `/scan/capture` is implemented via dynamic route handling in `app/scan/[id].tsx` rather than a dedicated `capture.tsx` file.
- `AgentRegistry` and `TaskQueue` exist, but the active production scan flow is orchestrated directly in `AgentOrchestrator.processImage()`.
- Reports tab nutrition trends visualization chart is a planned future feature; `app/(tabs)/reports.tsx` currently presents this section as "Coming soon".

---

## 13. Revision Policy

When implementation changes are made to pipeline steps, route groups, model managers, storage schema, sync payload rules, or services, this document must be updated in the same PR to remain implementation-accurate.

