# PULSE Clinical Decision Support System (CDSS)
## Master Implementation Plan

> **Application Goal**: Build an interactive, clinical-grade decision support platform that allows healthcare professionals to construct patient longitudinal profiles, persist them in a structured database, synthesize missing deep molecular profiles (metabolomics & proteomics), and forecast acute and chronic disease risks using the **PULSE** framework.

---

## 1. System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Web User Interface                            │
│                                                                        │
│  [ Patient Directory & Cohort Manager ]                                │
│  [ Patient Profile Builder & Lab Entry Wizard ]                        │
│  [ Longitudinal Trajectory & Biomarker Timeline ]                      │
│  [ Synthetic Omics Visualizer (Metabolomics / Proteomics) ]            │
│  [ Disease Risk Scorecard (10-Year Chronic & 30-Day ICU Alerts) ]      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST API (JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend Server                          │
│                                                                        │
│  ├── /api/patients       (CRUD: Profiles, Demographics, Metadata)     │
│  ├── /api/visits         (CRUD: Encounters, Lab Panels, Notes)         │
│  ├── /api/pulse/impute   (PULSE Forward Pass: Missing Omics Synthesis) │
│  ├── /api/pulse/predict  (Risk Score Computation & Trajectory Models)  │
│  └── /api/reports        (Clinical Summary & PDF Export)               │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Relational Database (SQL)      │  │     PULSE Engine Worker      │
│                                      │  │                              │
│ • Patients (Demographics & Type)     │  │ • Modality Encoders (Labs)   │
│ • Visits (Chronological Sequence)    │  │ • Past-State Autoregression  │
│ • Measurements (Observed & Synthetic)│  │ • Equal-Weight Fusion        │
│ • Clinical Notes (ICU Text Steps)    │  │ • Molecular Decoders         │
│ • Latent States (16-dim Vectors)     │  │ • Risk Prediction Heads      │
│ • Risk Assessments & XAI Scores      │  │ • Uncertainty Estimators     │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 2. Database Schema Design

The database stores both structured raw clinical inputs and PULSE-inferred latent states and synthetic predictions.

### Entities & Relationships

1. **`patients`**
   - `id`: Primary key (UUID / string)
   - `mrn`: Medical Record Number (string, indexed)
   - `full_name`: Patient name or anonymized alias (string)
   - `date_of_birth` / `age`: Baseline age (float)
   - `sex`: Biological sex (`M` / `F`)
   - `cohort_type`: `OUTPATIENT_CHRONIC` or `INPATIENT_ICU`
   - `created_at`, `updated_at`: Timestamps

2. **`visits`**
   - `id`: Primary key (UUID / integer)
   - `patient_id`: Foreign key $\to$ `patients.id`
   - `visit_index`: Sequence order (0, 1, 2, ...)
   - `visit_date`: Clinical timestamp
   - `hours_from_baseline`: Time delta (e.g., 0, 4, 8, ... 48h for ICU; or years for outpatient)
   - `visit_summary`: Clinician notes / encounter type

3. **`measurements`**
   - `id`: Primary key
   - `visit_id`: Foreign key $\to$ `visits.id`
   - `modality`: `routine_labs`, `metabolomics`, `proteomics`, `vitals`
   - `feature_name`: Standardized clinical identifier (e.g., `ALT`, `HbA1c`, `LDL_C_TL_pct`)
   - `feature_value`: Numerical value (float)
   - `is_synthetic`: Boolean (`False` = measured in lab, `True` = synthesized by PULSE)
   - `unit`: Clinical measurement unit (e.g., `mg/dL`, `mmol/L`, `Z-score`)
   - `confidence_lower`, `confidence_upper`: Uncertainty intervals for synthesized values

4. **`clinical_notes`**
   - `id`: Primary key
   - `visit_id`: Foreign key $\to$ `visits.id`
   - `step_hour`: Temporal step (e.g., 4-hour window)
   - `note_type`: `NURSING`, `PHYSICIAN`, `DISCHARGE`, `PROGRESS`
   - `note_text`: Raw narrative text

5. **`latent_states`**
   - `id`: Primary key
   - `visit_id`: Foreign key $\to$ `visits.id` (unique)
   - `z_state_vector`: Serialized 16-dimensional integrated visit state vector
   - `past_state_vector`: Serialized 16-dimensional past-state vector ($Z_P$)
   - `temporal_context`: Serialized GRU hidden state / Transformer context

6. **`risk_predictions`**
   - `id`: Primary key
   - `visit_id`: Foreign key $\to$ `visits.id`
   - `task_type`: `10Y_CHRONIC_DISEASE` or `30D_ICU_READMISSION` or `30D_ICU_MORTALITY`
   - `disease_name`: (e.g., `heart_failure`, `dementia`, `stroke`, `myocardial_infarction`, `copd`, `diabetes`)
   - `risk_probability`: Calculated probability $\in [0, 1]$
   - `risk_category`: `LOW`, `MODERATE`, `HIGH`, `CRITICAL`
   - `top_drivers_json`: Key driving biomarkers with feature attribution weights

---

## 3. Phased Implementation Roadmap

### Phase 1: Core Database & Data Access Layer (Completed)
- [x] Define SQLAlchemy database models (`Patient`, `Visit`, `Measurement`, `ClinicalNote`, `LatentState`, `RiskPrediction`).
- [x] Implement SQLite engine with database migration/initialization utilities (`server/db/session.py`, `scripts/init_database.py`).
- [x] Build Repository / CRUD service classes for patient management, visit sequences, and measurement storage (`server/crud/`).
- [x] Create preloaded clinically realistic patient profiles (`server/demo_data/seed_data.py`):
  - Outpatient Profile A (Cardiovascular & Metabolic trajectory with routine labs across 3 annual visits).
  - Outpatient Profile B (Neurodegenerative / Dementia early-divergence profile).
  - Inpatient Profile C (ICU 48-hour septic trajectory with 4-hour lab steps and clinical progress notes).
- [x] Write automated tests validating schema constraints and CRUD operations (`tests/test_phase1_db.py` - 4/4 passed).
- [x] **Push to Git**.

### Phase 2: PULSE Engine Service & Adaptation Layer (Completed)
- [x] Build `PulseInferenceService` (`server/services/pulse_engine.py`):
  - Wrapped `pulse.model.PulseModel` for single-patient and batch inference.
  - Implemented tensor formatting between database measurement rows and PULSE tensor inputs (`visits_data`, `missing_masks`).
  - Implemented continuous standardization & inverse transformation scalers based on clinical reference bounds.
- [x] Build Outpatient Omics Generator:
  - Synthesized **Metabolomics panel** (top lipid ratio biomarkers: large LDL free cholesterol ratio, TG/PG ratio, small VLDL-TG%, ApoB/ApoA1).
  - Synthesized **Proteomics panel** (top disease-predictive plasma proteins: GFAP, NEFL/NfL, GDF15, NT-proBNP, hs-Troponin T, Cystatin C).
- [x] Build ICU Acute Care Engine:
  - Processed 4-hour step-level structured laboratory time series (Lactate, WBC, Platelets, Creatinine, MAP, PaO2/FiO2).
  - Integrated note narrative text across temporal steps.
- [x] Build Downstream Disease Risk Scoring Heads (`server/services/risk_models.py`):
  - 10-year chronic disease risk estimators (Dementia, Heart Failure, MI, Stroke, Diabetes).
  - 30-day post-discharge ICU readmission and mortality scorecards.
- [x] Computed uncertainty 95% confidence intervals for synthesized biomarkers.
- [x] Tested with automated test suite (`tests/test_phase2_engine.py` - 9/9 total tests passed).
- [x] **Push to Git**.

### Phase 3: REST API Backend (FastAPI) (Completed)
- [x] Implement robust FastAPI application structure:
  - `GET /api/features`: Biomarker catalogue with reference bounds and category filters.
  - `GET /api/patients`: List patients with pagination, search by name/MRN, and filter by cohort.
  - `POST /api/patients`: Create a new patient profile.
  - `GET /api/patients/{id}`: Full patient record with chronological visits, measurements, and predictions.
  - `PUT /api/patients/{id}`: Update patient demographics and clinical metadata.
  - `DELETE /api/patients/{id}`: Remove patient record.
  - `POST /api/patients/{id}/visits`: Add a new clinical encounter/visit.
  - `POST /api/visits/{visit_id}/measurements`: Add or update lab test results.
  - `POST /api/visits/{visit_id}/notes`: Add clinical narrative note.
  - `POST /api/patients/{id}/run-pulse`: Execute PULSE inference on patient trajectory:
    - Automatically builds missing masks (measured vs missing).
    - Propagates historical latent state $Z_P$.
    - Imputes missing metabolomics/proteomics.
    - Saves latent vectors and risk predictions to the database.
  - `GET /api/patients/{id}/trajectories`: Retrieve longitudinal trend curves with measured vs. synthetic overlays.
  - `GET /api/patients/{id}/report`: Generate structured clinical summary JSON.
- [x] Include interactive Swagger UI (`/docs`) and OpenAPI documentation.
- [x] Write integration test suite verifying end-to-end API workflows (`tests/test_phase3_api.py` - 16/16 total tests passed).
- [x] **Push to Git**.

### Phase 4: Interactive Web Interface (Clinical Frontend with shadcn/ui) (Completed)
- [x] Initialize Next.js (App Router, TypeScript, Tailwind CSS) with **shadcn/ui**:
  - Configured `components.json`, Tailwind color system, typography, and dark/light clinical mode.
  - Installed core shadcn/ui components (`Card`, `Button`, `Dialog`, `Tabs`, `Badge`, `Progress`, `Select`, `Input`, `Table`, `Tooltip`, `Separator`, `ScrollArea`).
  - Added `lucide-react` icons and Recharts for interactive clinical trajectory visualizations.
- [x] Build clinical UI modules with shadcn/ui:
  - **Header & Navigation**: Quick switch between Outpatient Omics Screening and ICU Acute Monitoring with theme toggle and Nature paper citation.
  - **Patient Directory & Registry**: Search bar, MRN lookup, risk status badges, and "New Patient" modal dialog.
  - **Interactive Patient Profile Builder**:
    - Demographics & baseline data input form.
    - Visit history manager (add new visit, date picker, encounter type).
    - Lab Entry Wizard:
      - Quick-fill preset buttons ("Normal Adult Panel", "Elevated Lipid / Metabolic Syndrome", "Cardiac Alert Panel", "ICU 48h Septic Labs").
      - Numerical entry for routine blood markers with clinical validation.
      - Free-text area for clinical progress notes.
    - "Run PULSE Synthesis & Risk Analysis" action button with live progress indicator.
  - **Longitudinal Trajectory Visualization**:
    - Interactive timeline chart showing measured labs across time with Recharts.
    - Visual trajectory divergence indicator showing patient deviation from personal baseline.
  - **Synthetic Omics Panel**:
    - Card grid of synthesized biomarkers (lipids, proteins, inflammatory markers).
    - Clear visual distinction: Green badge for `[Measured in Lab]` vs. Purple badge for `[PULSE Synthesized]`.
    - Normal reference range bar with patient's predicted value and 95% confidence interval indicator.
  - **Clinical Decision Support & Risk Scorecard**:
    - Probability meters for 10-year chronic diseases and 30-day ICU readmission.
    - Risk categorization: Low (Green), Moderate (Yellow), High (Orange), Critical (Red).
    - Feature Attribution breakdown (top biological drivers of the risk score).
- [x] **Push to Git**.

### Phase 5: Exporting, Safety Guardrails & Validation (Completed)
- [x] Clinical Safety Disclaimers & SaMD Guardrails:
  - Explicit warning banner: "Software as a Medical Device (SaMD) Notice: PULSE Decision Support Engine is an investigational clinical decision-support tool. Synthesized profiles represent statistical reconstructions and must be reviewed alongside direct laboratory testing."
  - Clinician override & 21 CFR Part 11 audit log trail (`server/services/audit_logger.py`, `GET /api/audit-trail`).
- [x] Export Capabilities:
  - Generate printable Clinical Decision Summary PDF / formatted HTML report (`ReportModal.tsx` with window.print()).
  - Export patient record and synthesized omics as HL7 FHIR R4-compatible JSON bundle (`GET /api/patients/{id}/export/fhir`).
  - Export longitudinal trajectory time-series as downloadable CSV (`GET /api/patients/{id}/export/csv`).
- [x] Performance and latency optimization (caching latent state representations in SQLite).
- [x] Full integration test suite passing (`tests/test_phase5_export.py` - 19/19 total tests passed).
- [x] Production build verification (`npm run build` in Next.js frontend succeeded with 0 errors).
- [x] **Push to Git**.

### Phase 6: Clinical Digital Twin "What-If" Simulation & Deep shadcn/ui Refinement (Completed)
- [x] Implement backend counterfactual simulation endpoint (`POST /api/patients/{id}/simulate-intervention`):
  - Ingest hypothetical clinical target interventions (e.g. LDL statin reduction, HbA1c control, septic fluid resuscitation MAP/lactate goals).
  - Forward-propagate intervened trajectory through PULSE latent state.
  - Project counterfactual trajectory curves and projected risk reduction delta.
- [x] Comprehensive **shadcn UI** component refactoring across all views:
  - Migrated all modal dialogs (`NewPatientModal`, `AddVisitModal`, `ReportModal`) to official shadcn `<Dialog>`, `<DialogContent>`, `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>`, `<DialogFooter>`.
  - Migrated navigation and category tabs to official shadcn `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`.
  - Migrated lab entry tables, report tables, and trajectory tables to official shadcn `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableHead>`, `<TableBody>`, `<TableCell>`.
  - Implemented Interactive Digital Twin Simulation Sandbox in the frontend (`DigitalTwinView.tsx`) with shadcn sliders/inputs, before/after risk comparison meters, and counterfactual trajectory overlays.
- [x] Write automated tests for counterfactual simulation (`tests/test_phase6_simulation.py` - 21/21 total tests passed).
- [x] Remake whole frontend architecture using official `npx shadcn@latest init -t next`:
  - Scaffolding re-created directly using official `npx shadcn@latest init -t next` template (`pulse-frontend`).
  - Next.js 16 + React 19 + Tailwind CSS v4 + Base UI + tw-animate-css + class-variance-authority + Lucide React.
  - Official shadcn components installed via `npx shadcn@latest add`: `card`, `dialog`, `tabs`, `table`, `badge`, `progress`, `input`, `button`, `separator`, `scroll-area`, `tooltip`, `select`.
  - Re-integrated full clinical decision support views (`PatientDirectory`, `PatientDetailView`, `DigitalTwinView`, `RiskScorecardView`, `SyntheticOmicsView`, `TrajectoriesView`, `TimelineNotesView`, `Header`, `AddVisitModal`, `NewPatientModal`, `ReportModal`).
  - Full TypeScript type-checking (`npm run typecheck`) and Turbopack production compilation (`npm run build`) passing with 0 errors.
- [x] **Push to Git**.

---

## 4. Technology Stack Specification

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | **FastAPI** (Python 3.9+) | Asynchronous, auto-generating OpenAPI schemas, native Pydantic validation, seamless PyTorch integration. |
| **Deep Learning Engine** | **PyTorch 1.9+** (`PulseModel`) | Reuses repository's core PULSE module (`pulse/model.py`, `pulse/core/`). |
| **Database & ORM** | **SQLite + SQLAlchemy 2.0** | Zero-dependency, portable, persistent SQL database with robust relation modeling and JSON vector support. |
| **Data Processing** | **NumPy, Pandas, Scikit-learn** | Standard clinical scaling, normalization, and evaluation metrics. |
| **Frontend Framework** | **Next.js (App Router / React) + TypeScript** | Production-grade typed components with fast client navigation. |
| **UI Components** | **shadcn/ui + Radix UI + Tailwind CSS** | Accessible, customizable, modern clinical design system with dark/light themes. |
| **Icons & Charts** | **Lucide React + Recharts** | Medical icons and interactive longitudinal trajectory curves. |

---

## 5. Execution Workflow & Review Checkpoints

Each phase will be executed systematically:
1. Implementation of code, schemas, and endpoints.
2. Verification via automated test scripts or live command execution.
3. Review of git diff and status.
4. Git commit and push to remote `https://github.com/p19racha/LongitudinalGeneration.git`.
