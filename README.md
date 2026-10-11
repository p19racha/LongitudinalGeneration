# PULSE: Patient Unified Longitudinal Signal Engine & Clinical Decision Support System

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![PyTorch 1.9+](https://img.shields.io/badge/PyTorch-1.9+-ee4c2c.svg)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Nature Computational Science](https://img.shields.io/badge/Nature%20Computational%20Science-2026-brightgreen.svg)](https://doi.org/10.1038/s43588-026-01026-5)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-24C8DB.svg)](https://tauri.app/)
[![Release](https://img.shields.io/github/v/release/p19racha/LongitudinalGeneration?color=386DF4)](https://github.com/p19racha/LongitudinalGeneration/releases/latest)

> **Implementation and Clinical Decision Support System** based on the research:  
> **"Longitudinal alignments and syntheses of multimodal clinical data for personalized medicine with the PULSE framework"**  
> *Nature Computational Science* (2026). DOI: [10.1038/s43588-026-01026-5](https://doi.org/10.1038/s43588-026-01026-5)

---

## Table of Contents

1. [Executive Overview & Clinical Rationale](#executive-overview--clinical-rationale)
2. [Theoretical Foundations & Mathematical Formulations](#theoretical-foundations--mathematical-formulations)
   - [The Longitudinal Clinical Mosaic Challenge](#the-longitudinal-clinical-mosaic-challenge)
   - [1. Variational Modality Encoders & Past-State Integration ($Z_P$)](#1-variational-modality-encoders--past-state-integration-z_p)
   - [2. Distributional Soft Alignment via Jeffrey Divergence](#2-distributional-soft-alignment-via-jeffrey-divergence)
   - [3. Equal-Weight Visit-State Fusion ($Z_{\text{visit}}$)](#3-equal-weight-visit-state-fusion-z_textvisit)
   - [4. Temporal State Propagation: Recurrent (GRU) vs. Causal Transformer](#4-temporal-state-propagation-recurrent-gru-vs-causal-transformer)
   - [5. Single-Modality Active Masking Protocol](#5-single-modality-active-masking-protocol)
   - [6. Modality-Wise Adversarial Regularization (GRL)](#6-modality-wise-adversarial-regularization-grl)
   - [7. Complete Training Objective & Annealed ELBO](#7-complete-training-objective--annealed-elbo)
3. [Clinical Applications & Empirical Benchmark Results](#clinical-applications--empirical-benchmark-results)
   - [Benchmark 1: UK Biobank Two-Visit Metabolomics Imputation (251 Biomarkers)](#benchmark-1-uk-biobank-two-visit-metabolomics-imputation-251-biomarkers)
   - [Benchmark 2: Physiological Aging Trajectories in Joint Latent Space](#benchmark-2-physiological-aging-trajectories-in-joint-latent-space)
   - [Benchmark 3: Plasma Proteomics Synthesis (2,923 Proteins) & Disease Prediction](#benchmark-3-plasma-proteomics-synthesis-2923-proteins--disease-prediction)
   - [Benchmark 4: Multicenter Acute Care Trajectories (MIMIC-III & Wenzhou ICU)](#benchmark-4-multicenter-acute-care-trajectories-mimic-iii--wenzhou-icu)
   - [Benchmark 5: Cross-Body Alignment (Retinal Fundus Photography + Routine Blood Panels)](#benchmark-5-cross-body-alignment-retinal-fundus-photography--routine-blood-panels)
4. [Ablation Studies & Empirical Validations](#ablation-studies--empirical-validations)
5. [Clinical Decision Support System (CDSS) & Desktop Application](#clinical-decision-support-system-cdss--desktop-application)
   - [Grouped Longitudinal Biomarker Panels (Lipid, Metabolic, Neuro, Renal)](#grouped-longitudinal-biomarker-panels)
   - [Generative Deep Omics Synthesis Workspace](#generative-deep-omics-synthesis-workspace)
   - [Structured Clinical Encounter Workspace](#structured-clinical-encounter-workspace)
   - [Calibrated 10-Year & 30-Day Risk Forecasting](#calibrated-10-year--30-day-risk-forecasting)
   - [Multi-Platform Standalone Desktop App (AppImage, DEB, RPM, EXE, DMG)](#multi-platform-standalone-desktop-app)
6. [Repository Architecture & Codebase Map](#repository-architecture--codebase-map)
7. [Installation & Setup](#installation--setup)
8. [Quick Start & Usage Guide](#quick-start--usage-guide)
9. [Original Author & Paper Attribution](#original-author--paper-attribution)
10. [Domain & Medico-Technical Advisory Acknowledgments](#domain--medico-technical-advisory-acknowledgments)
11. [Citation & References](#citation--references)
12. [License](#license)

---

## Executive Overview & Clinical Rationale

In contemporary medical surveillance, high-throughput molecular phenotyping—such as nuclear magnetic resonance (NMR) metabolomics, mass spectrometry, and high-plex affinity proteomics (Olink Proximity Extension Assay, SomaScan aptamers)—unveils subclinical disease drivers years before manifest symptoms arise. However, exorbitant assay costs and logistical barriers prevent collecting comprehensive omics assays at every patient encounter.

As a consequence, real-world electronic health records (EHRs) constitute **longitudinal mosaic data**:
- **Frequent, inexpensive routine tests**: Complete blood counts (CBC), basic metabolic panels (BMP), and vital signs recorded at every clinic visit.
- **Intermittent, high-dimensional molecular tests**: Deep metabolomic and proteomic profiles collected only rarely (e.g., at a study baseline or during acute hospitalization).

```
Real-World Longitudinal Clinical Mosaic Observations:
Visit 1 (Baseline):   [Modality A: Routine Labs]  +  [Modality B: Deep Omics]   --> Fully Paired
Visit 2 (Follow-up):  [Modality A: Routine Labs]  +  [      MISSING OMICS    ]   --> Partially Observed
Visit 3 (Follow-up):  [Modality A: Routine Labs]  +  [      MISSING OMICS    ]   --> Partially Observed

PULSE Inference Engine:
Prior Trajectories ──> Autoregressive Dynamics ──> Past Latent State Z_P ─┐
                                                                          ├─> Jeffrey Soft Alignment ─> Z_visit ─> Full Multimodal Synthesis
Current Encounter ───────────────────────────────> Modality Latent Z_A ──┘   + Equal-Weight Fusion                 [Labs + Imputed Omics + Risk]
```

Existing multimodal integration methods developed for single-cell genomics (e.g., **MIDAS**, **scVAEIT**, **StabMap**) treat biological samples as static, isolated cross-sectional observations—an assumption tailored for cells destroyed during lysis, but inadequate for human clinical medicine. Conversely, classical longitudinal sequence architectures (recurrent neural networks, temporal Transformers) are either restricted to unimodal signals or rely on naive concatenation, failing to address mosaic missingness or cross-modal distributional shifts.

**PULSE** (**P**atient **U**nified **L**ongitudinal **S**ignal **E**ngine) formalizes each individual as an evolving dynamical biological system:
1. **Multimodal Biological Coupling**: Routine laboratory tests, clinical notes, and high-plex omics are distinct outward manifestations of a common, continuous underlying latent physiological state.
2. **Personalized Homeostatic Set Points**: A clinical parameter is most informative not through its population-wide absolute value, but through its **temporal deviation** relative to the patient's individual baseline.
3. **Temporal Conditioning for Imputation**: Propagating an explicit historical state ($Z_P$) mathematically constrains the space of physiologically plausible trajectories, transforming ill-posed cross-sectional estimation into well-conditioned, dynamic trajectory synthesis.

<p align="center">
  <img src="docs/pulse_missing_imputation_diagram.svg" alt="PULSE Imputation Workflow" width="900">
</p>

---

## Theoretical Foundations & Mathematical Formulations

### The Longitudinal Clinical Mosaic Challenge

Let patient $i$ be characterized by a sequence of encounters indexed chronologically by $t = 1, \dots, T_i$.  
Let $x_{i,t}^{(m)} \in \mathbb{R}^{D_m}$ denote the observed feature vector belonging to clinical modality $m \in \mathcal{M}$ at encounter $t$. Because of mosaic collection, only a subset of modalities $\mathcal{O}_{i,t} \subseteq \mathcal{M}$ is measured at visit $t$.

Each modality encounter is indexed by an operational mask indicator $s_{i,t}^{(m)} \in \{0, 1, 2\}$:
- $s_{i,t}^{(m)} = 0$ (**Observed**): Recorded in clinic, passed directly into the respective modality encoder.
- $s_{i,t}^{(m)} = 1$ (**Actively Masked**): Available in truth, but withheld from encoders during training to force the model to infer it from co-occurring modalities and prior history, supervised via reconstruction loss.
- $s_{i,t}^{(m)} = 2$ (**Naturally Missing**): Absent in clinical practice; synthesized by generative decoders, but contributing zero gradient to reconstruction loss.

---

### 1. Variational Modality Encoders & Past-State Integration ($Z_P$)

For each currently observed modality $m \in \mathcal{O}_{i,t}$, a dedicated variational encoder neural network $q_{\phi_m}$ projects heterogeneous clinical data into a unified $D$-dimensional latent Gaussian space (default latent dimension $D = 16$):

$$q_{\phi_m}\left(z_{i,t}^{(m)} \mid x_{i,t}^{(m)}\right) = \mathcal{N}\left(\mu_{i,t}^{(m)}, \text{diag}\left((\sigma_{i,t}^{(m)})^2\right)\right)$$

Simultaneously, the patient's accumulated temporal state up to visit $t - 1$, denoted as hidden history $h_{i,t}$, is transformed by a dedicated **Past-State Variational Encoder** $q_{\phi_P}$:

$$q_{\phi_P}\left(z_{P, i,t} \mid h_{i,t}\right) = \mathcal{N}\left(\mu_{P, i,t}, \text{diag}\left((\sigma_{P, i,t})^2\right)\right)$$

This formulation enforces individual-level temporal memory: even when expensive modalities are missing at encounter $t$, the past-state latent prior $Z_P$ carries forward the patient's baseline molecular profile, constraining the decoder's solution space.

---

### 2. Distributional Soft Alignment via Jeffrey Divergence

To establish semantic interoperability between diverse clinical encoders without forcing a rigid deterministic collapse (which would eradicate modality-specific physiological nuance), PULSE applies a pairwise distributional alignment penalty.

For two diagonal multivariate Gaussian posteriors $q_a = \mathcal{N}(\mu_a, \text{diag}(\sigma_a^2))$ and $q_b = \mathcal{N}(\mu_b, \text{diag}(\sigma_b^2))$, the directed Kullback-Leibler (KL) divergence in $\mathbb{R}^D$ is:

$$D_{\text{KL}}(q_a \parallel q_b) = \frac{1}{2} \sum_{d=1}^D \left[ \log\left(\frac{\sigma_{b,d}^2}{\sigma_{a,d}^2}\right) + \frac{\sigma_{a,d}^2 + (\mu_{a,d} - \mu_{b,d})^2}{\sigma_{b,d}^2} - 1 \right]$$

The **Jeffrey divergence** $J(q_a, q_b)$ is the symmetric sum of forward and reverse KL divergences:

$$J(q_a, q_b) = D_{\text{KL}}(q_a \parallel q_b) + D_{\text{KL}}(q_b \parallel q_a)$$

Evaluating the sum yields an interpretable closed-form formulation:

$$J(q_a, q_b) = \frac{1}{2} \sum_{d=1}^D \left[ \frac{\sigma_{a,d}^2}{\sigma_{b,d}^2} + \frac{\sigma_{b,d}^2}{\sigma_{a,d}^2} + (\mu_{a,d} - \mu_{b,d})^2 \left(\frac{1}{\sigma_{a,d}^2} + \frac{1}{\sigma_{b,d}^2}\right) - 2 \right]$$

Let $\mathcal{B}_{i,t} = \{q_{\phi_m} : m \in \mathcal{O}_{i,t}\} \cup \{q_{\phi_P}\}$ denote the complete set of active latent branches at encounter $t$. The alignment loss is the average Jeffrey divergence across all unordered pairs $\mathcal{P}_{i,t}$:

$$\mathcal{L}_{\text{align}}^{(i,t)} = \frac{1}{|\mathcal{P}_{i,t}|} \sum_{(a,b) \in \mathcal{P}_{i,t}} J(q_a, q_b)$$

*Key Mathematical Insight*: Unlike mean-squared error (MSE) point-matching, Jeffrey divergence accounts for epistemic posterior uncertainty. Modalities that are inherently noisy or variable expand their variance without destabilizing other branches.

---

### 3. Equal-Weight Visit-State Fusion ($Z_{\text{visit}}$)

PULSE integrates the active modality latent states and the past-state prior into a single representative visit coordinate $z_{i,t}$ via explicit equal-weight averaging:

$$z_{i,t} = \frac{\mu_{P, i,t} + \sum_{m \in \mathcal{O}_{i,t}} \mu_{i,t}^{(m)}}{|\mathcal{O}_{i,t}| + 1}$$

- The denominator $+1$ explicitly accounts for the past-state representation $\mu_{P, i,t}$. History is never double-counted, and observed modalities maintain equal voting power.
- In the boundary condition where no modalities are recorded at encounter $t$ ($|\mathcal{O}_{i,t}| = 0$), the fused latent state defaults smoothly to pure history: $z_{i,t} = \mu_{P, i,t}$.

---

### 4. Temporal State Propagation: Recurrent (GRU) vs. Causal Transformer

Once the encounter representation $z_{i,t}$ is established, PULSE autoregressively updates the historical representation for encounter $t+1$:

- **Recurrent Engine (`temporal_model="recurrent"`)**:  
  Employs a Gated Recurrent Unit (GRU) cell:
  $$h_{i,t+1} = \text{GRUCell}(z_{i,t}, h_{i,t})$$
  Suited for outpatient encounters with 2–5 visits, offering minimal computational overhead and fast convergence.

- **Causal Transformer Engine (`temporal_model="transformer"`)**:  
  Applies multi-head causal self-attention over the sequence of preceding latent coordinates $(z_{i,1}, \dots, z_{i,t})$ with sinusoidal temporal positional embeddings:
  $$h_{i,t+1} = \text{TransformerEncoder}\left(\text{CausalMask}\left([z_{i,1}, \dots, z_{i,t}]\right)\right)_{t}$$
  Optimized for dense, high-frequency encounters (e.g., multi-day hourly ICU monitoring).

---

### 5. Single-Modality Active Masking Protocol

If a variational autoencoder is trained strictly on complete observations, it readily defaults to identity mappings within a visit while disregarding temporal history. PULSE incorporates **single-modality active masking**:
- At each encounter with $|\mathcal{O}_{i,t}| \ge 2$ observed modalities, active masking is triggered with probability $p_{\text{mask}} = 0.6$ (empirically determined optimum).
- Exactly one observed modality $m^*$ is uniformly chosen at random and relabeled from $s=0$ to $s=1$.
- Modality $m^*$ is withheld from the encoders, compelling the remaining branches and past-state $Z_P$ to reconstruct $x_{i,t}^{(m^*)}$.
- Ground-truth supervision is enforced during decoding: $\hat{x}_{i,t}^{(m^*)}$ is evaluated against the true measured values.

---

### 6. Modality-Wise Adversarial Regularization (GRL)

To prevent decoders from encoding identifiable artifacts caused by missingness patterns, each modality is paired with a binary discriminator $D_m$ connected via a **Gradient Reversal Layer (GRL)**:
- $D_m$ attempts to distinguish whether modality $m$ was observed ($s=0$) or missing/masked ($s \in \{1, 2\}$) based on the reconstructed output $\hat{x}_{i,t}^{(m)}$.
- The GRL negates gradients ($-\lambda_{\text{grl}} \nabla$) during backpropagation into the generative decoders:

$$\mathcal{L}_{\text{adv}} = \sum_{i,t} \sum_{m} \text{BCE}\left(D_m\left(\hat{x}_{i,t}^{(m)}\right), y_{i,t}^{(m)}\right)$$

This minimax game forces decoders to generate physiologically authentic outputs indistinguishable from true measurements.

---

### 7. Complete Training Objective & Annealed ELBO

The unified optimization target is:

$$\mathcal{L} = \mathcal{L}_{\text{rec}} + \lambda_{\text{KL}} \cdot \alpha(e) \cdot \mathcal{L}_{\text{KL}} + \lambda_{\text{align}} \cdot \mathcal{L}_{\text{align}} + \lambda_{\text{adv}} \cdot \mathcal{L}_{\text{adv}}$$

where:
1. **Reconstruction Loss**:
   $$\mathcal{L}_{\text{rec}} = \sum_{i,t} \sum_{m} \mathbb{I}[s_{i,t}^{(m)} \in \{0, 1\}] \cdot \text{MSE}\left(\hat{x}_{i,t}^{(m)}, x_{i,t}^{(m)}\right)$$
2. **Prior Regularization**: Standard Gaussian prior $\mathcal{N}(0, I)$ across all active branches:
   $$\mathcal{L}_{\text{KL}} = \sum_{b \in \mathcal{B}_{i,t}} D_{\text{KL}}(q_b \parallel \mathcal{N}(0, I))$$
3. **KL Annealing Schedule $\alpha(e)$**: Linearly scaled from $0 \to 1$ across the initial 50 epochs ($e \in [1, 50]$) to protect against premature posterior collapse.

---

## Clinical Applications & Empirical Benchmark Results

### Benchmark 1: UK Biobank Two-Visit Metabolomics Imputation (251 Biomarkers)

- **Cohort**: 10,000 UK Biobank participants (7,000 train, 3,000 held-out test).
- **Task**: Reconstruct full Follow-up Visit ($t=1$) NMR metabolomics (**251 biomarkers**) using only routine blood tests (**61 routine lab markers**) at follow-up, conditioned on baseline ($t=0$) history.

| Model / Framework | Architecture Type | Context Employed | Pearson's $r$ ($\uparrow$) | MAE ($\downarrow$) | MSE ($\downarrow$) |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **PULSE (Ours)** | **Longitudinal Variational** | **Baseline History ($t=0$) + Current Labs ($t=1$)** | **0.781 ± 0.012** | **0.312 ± 0.008** | **0.201 ± 0.009** |
| **scVAEIT** | Static Masked VAE | Current Labs ($t=1$) only | 0.654 ± 0.015 | 0.405 ± 0.010 | 0.324 ± 0.012 |
| **MIDAS** | Static Product-of-Experts | Current Labs ($t=1$) only | 0.638 ± 0.016 | 0.418 ± 0.011 | 0.341 ± 0.013 |
| **StabMap** | Static MNN Manifold | Current Labs ($t=1$) only | 0.589 ± 0.018 | 0.462 ± 0.013 | 0.410 ± 0.015 |

*Longitudinal Trajectory Concordance*:
On predicting dynamic within-person change ($\Delta = \text{Follow-up} - \text{Baseline}$), PULSE achieves **$r = 0.850$**, confirming that it tracks individual biological drift rather than regressing to the population average.

---

### Benchmark 2: Physiological Aging Trajectories in Joint Latent Space

When evaluating an artificially unpaired cohort (50% fully paired, 25% lab tests only, 25% metabolomics only):
- All samples mapped into a unified physiological coordinate system.
- **UMAP1** captured a continuous chronological aging gradient ($P < 0.0001$).
- **UMAP2** captured metabolic divergence independent of chronological age.
- **CellRank** vector-field stream analysis unveiled three distinct physiological aging trajectories; individuals in the accelerated-aging branch exhibited markedly elevated 10-year cumulative incidence of **COPD, Type 2 Diabetes, Heart Failure, and Ischemic Stroke** ($P < 0.0001$, log-rank test).

---

### Benchmark 3: Plasma Proteomics Synthesis (2,923 Proteins) & Disease Prediction

- **Cohort**: UK Biobank Pharma Proteomics Project (UKB-PPP; $n = 50,000$ participants; 35,000 train, 15,000 test).
- **Task**: Synthesize **2,923 plasma protein abundances** from 61 routine blood markers and encoded prior ICD medical histories.

| Method | Mean Per-Protein Pearson $r$ | Pleiotropic Protein $r$ |
| :--- | :---: | :---: |
| **PULSE** | **0.468** | **0.612** |
| **Structured Transformer** | 0.392 | 0.518 |
| **Llama 3.1 8B (Notes)** | 0.365 | 0.485 |
| **Delphi** | 0.311 | 0.402 |

*Downstream 10-Year Clinical Incident Disease Prediction*:
Models trained on **PULSE-synthesized proteomics** attained AUROCs statistically indistinguishable from models trained on **true measured laboratory proteomics**:
- **Dementia**: AUROC **0.831** (Synthesized) vs. **0.835** (Measured)
- **Heart Failure**: AUROC **0.798** (Synthesized) vs. **0.801** (Measured)
- **Myocardial Infarction**: AUROC **0.784** (Synthesized) vs. **0.789** (Measured)
- **COPD**: AUROC **0.772** (Synthesized) vs. **0.775** (Measured)

---

### Benchmark 4: Multicenter Acute Care Trajectories (MIMIC-III & Wenzhou ICU)

- **Cohorts**:
  - **MIMIC-III (US)**: 44,265 adult ICU stays (3,025 30-day readmissions).
  - **Wenzhou ICU (China)**: 13,816 adult ICU stays (793 30-day readmissions).
- **Task**: 30-day post-discharge readmission prediction from the initial 48 hours of ICU monitoring, segmented into twelve 4-hour temporal steps combining structured labs and unstructured nursing notes.

| Cohort | Metric | Lab Transformer Only | Clinical Notes (Llama 3) Only | Directly Combined (Late Fusion) | **PULSE (Ours)** |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **MIMIC-III** | **AUROC** | 0.639 | 0.647 | 0.663 | **0.713** (0.691–0.732) |
| | **AUPRC** | 0.110 | 0.127 | 0.130 | **0.193** (0.167–0.224) |
| **Wenzhou ICU** | **AUROC** | 0.647 | 0.691 | 0.706 | **0.735** (0.683–0.789) |
| | **AUPRC** | 0.116 | 0.273 | 0.317 | **0.388** (0.298–0.480) |

---

### Benchmark 5: Cross-Body Alignment (Retinal Fundus Photography + Routine Blood Panels)

- **Pediatric Myopia Progression** ($n = 24,605$ children; 50,043 visits):  
  Cross-modal pretraining between retinal fundus imaging and blood panels enabled forecasting **Axial Length (AL)** and **Spherical Equivalent (SE)** trajectories 1–5 years into the future ($P < 0.001$).
- **Systemic Vascular Disease Prediction** ($n = 127,731$ adults; 657,103 visits):  
  Fundus-to-systemic alignment produced a vision encoder capable of predicting 5-year incident myocardial infarction, stroke, dementia, and heart failure directly from retinal photographs with AUROCs of **0.76–0.82**.

---

## Ablation Studies & Empirical Validations

Empirical ablations on the two-visit UK Biobank metabolomics task demonstrate the necessity of each component:

| Model Configuration / Variant | Pearson's $r$ | MAE | MSE | Empirical Conclusion |
| :--- | :---: | :---: | :---: | :--- |
| **Full PULSE Framework** | **0.781** | **0.312** | **0.201** | Complete reference model |
| **w/o Historical State ($Z_P$)** | 0.662 | 0.401 | 0.315 | Longitudinal conditioning is indispensable |
| **Directional Stop-Gradient** | 0.774 | 0.319 | 0.210 | Treating current visit as fixed reference degrades alignment |
| **Point-wise Alignment (MSE)** | 0.729 | 0.354 | 0.252 | Forcing deterministic point equality collapses variance |
| **w/o Alignment Loss ($\mathcal{L}_{\text{align}}$)** | 0.698 | 0.378 | 0.281 | Latent spaces decouple without Jeffrey divergence |
| **w/o Adversarial Loss ($\mathcal{L}_{\text{adv}}$)** | 0.763 | 0.324 | 0.218 | GRL removes missingness-dependent artifact bias |

---

## Clinical Decision Support System (CDSS) & Desktop Application

In addition to the research engine, this repository includes an interactive **Clinical Decision Support System (CDSS)** application.

### Grouped Longitudinal Biomarker Panels
Longitudinal trajectories are categorized into logical physiological panels with side-by-side comparative trend visualization and reference threshold overlays:
- **Lipid Panel**: Total Cholesterol, LDL-C, HDL-C, Triglycerides.
- **Metabolic Panel**: Fasting Plasma Glucose, Glycated Hemoglobin (HbA1c), Fasting Insulin.
- **Neurological & Inflammatory Panel**: Neurofilament Light (NfL), High-Sensitivity C-Reactive Protein (hs-CRP).
- **Renal & Hepatic Panel**: Serum Creatinine, Estimated Glomerular Filtration Rate (eGFR), Blood Urea Nitrogen (BUN), Alanine Aminotransferase (ALT).

### Generative Deep Omics Synthesis Workspace
- Synthesizes dense 25+ feature metabolomics and proteomics trajectories directly from routine clinical encounters.
- Visualizes measured vs. imputed confidence bounds with trajectory comparison.

### Structured Clinical Encounter Workspace
- Dedicated modal for recording physical exams, vitals, routine laboratory panels, and clinical notes.
- Quick scenario presets: **Outpatient Cardiovascular Risk** and **ICU Sepsis / Acute Kidney Injury**.

### Calibrated 10-Year & 30-Day Risk Forecasting
- Calibrated prognostic risk models for cardiovascular events, chronic kidney disease, metabolic decompensation, and neurodegeneration.
- Cohort-level **Triage Radar** for stratifying patient populations by clinical urgency.

### Multi-Platform Standalone Desktop App
Built with **Tauri v2** and **Next.js**, packaged into standalone installers:
- **Linux**: `.AppImage` (Universal bundle with automatic virtualenv backend management), `.deb`, and `.rpm`.
- **Windows**: `.exe` and `.msi` installers with asynchronous GUI initialization and headless WSL bridging.
- **macOS**: Universal Apple Silicon / Intel `.dmg` package.
- **Dual-Mode Launcher**: Toggle between native desktop workspace and multi-tab browser portal (`http://localhost:8000`).

---

## Repository Architecture & Codebase Map

```
LongitudinalGeneration/
│
├── Longitudinal alignments and syntheses...pdf  # Original Nature Computational Science (2026) paper
├── README.md                                    # Comprehensive system documentation (this file)
├── requirements.txt                             # Python dependencies
├── setup.py                                     # Python package installation script
│
├── pulse/                                       # Core PULSE algorithmic library
│   ├── __init__.py                              # Public exports (PulseModel, Trainer, etc.)
│   ├── model.py                                 # Main PulseModel orchestration module
│   ├── losses.py                                # Loss functions (Recon, KL, Jeffrey, GRL Adversarial)
│   ├── clinical_benchmark.py                   # Data pipeline for tabular CSV benchmarks
│   ├── core/
│   │   ├── encoders.py                          # Modality-specific & Past-State variational encoders
│   │   ├── decoders.py                          # Modality decoders (Lab, Metabolomics, Generic)
│   │   ├── alignment.py                         # Jeffrey divergence & alignment strategies
│   │   ├── fusion.py                            # Equal-weight visit-state fusion
│   │   ├── temporal.py                          # Recurrent (GRU) & Causal Transformer engines
│   │   └── adversarial.py                       # GRL & ModalityMissingnessAdversary
│   ├── data/
│   │   └── dataset.py                           # LongitudinalDataset, active masking, collate_visits
│   └── training/
│       └── trainer.py                           # Training loop, KL annealing, early stopping
│
├── server/                                      # Clinical Decision Support System REST API
│   ├── main.py                                  # FastAPI entrypoint & CORS middleware
│   ├── api/routes/                              # Endpoints: patients, visits, pulse, analytics, reports
│   ├── services/                                # PULSE synthesis engine, risk models, CDS hooks
│   └── db/                                      # SQLAlchemy models, SQLite persistence, demo cohort
│
├── frontend/                                    # Interactive Clinical Next.js Interface
│   ├── app/page.tsx                             # Application workspace shell
│   ├── components/views/                        # OverviewView, TrajectoriesView, PatientRegistryView
│   ├── components/dialogs/                      # LaunchModeDialog, AboutResearchDialog
│   └── lib/api.ts                               # Resilient REST client with retry logic
│
├── src-tauri/                                   # Tauri v2 Desktop Native Layer
│   ├── tauri.conf.json                          # Desktop window, bundle, and asset configuration
│   ├── Cargo.toml                               # Rust dependencies
│   └── src/lib.rs                               # Non-blocking async process manager & WSL bridge
│
├── .github/workflows/                           # CI/CD Automation
│   └── release.yml                              # Multi-platform release matrix (Linux, macOS, Windows)
│
└── scripts/                                     # Benchmarks & Validation Suites
    ├── Benchmark-single-cell-Method/            # UK Biobank Metabolomics benchmark vs. MIDAS/scVAEIT
    ├── Bencmark-EHR-Modeling/                   # Plasma Proteomics benchmark vs. Delphi/Llama 3
    ├── PULSE_MIMIC/                             # ICU acute care trajectory benchmark on MIMIC-III
    └── Ablation/                                # History, alignment variants, and mask probability sweep
```

---

## Installation & Setup

### Requirements
- **OS**: Linux (Ubuntu 20.04+), Windows 10/11, or macOS.
- **Python**: 3.8+ (Python 3.9–3.12 supported).
- **Node.js**: 18+ (for frontend development).
- **Rust toolchain**: 1.80+ (for Tauri desktop builds).

### Python Library Installation

```bash
# Clone the repository
git clone https://github.com/p19racha/LongitudinalGeneration.git
cd LongitudinalGeneration

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -e .
```

---

## Quick Start & Usage Guide

### 1. Python API

```python
import torch
from pulse.model import PulseModel
from pulse.data.dataset import LongitudinalDataset, collate_visits, create_synthetic_data

device = "cuda" if torch.cuda.is_available() else "cpu"

# Define modality dimensions
modality_dims = {
    "routine_labs": 61,
    "metabolomics": 251,
}

# Instantiate PULSE model
model = PulseModel(
    modality_dims=modality_dims,
    latent_dim=16,
    hidden_dim=64,
    temporal_model="recurrent",  # or "transformer"
    kl_weight=1e-3,
    align_weight=1.0,
    active_mask_prob=0.6,
).to(device)

# Forward pass on patient batch
synthetic_data, masks = create_synthetic_data(num_patients=16, max_visits=3, modality_dims=modality_dims)
dataset = LongitudinalDataset(synthetic_data, masks)
batch = collate_visits([dataset[i] for i in range(16)])

output = model(batch["visits_data"], batch["missing_masks"], return_loss=True)
print(f"Total Loss: {output['loss']:.4f}")
print(f"Reconstruction Loss: {output['losses']['loss_recon']:.4f}")
```

### 2. Launching the Clinical Decision Support System (CDSS)

#### Option A: Run Native Desktop Application
Download the installer for your platform from the [Releases](https://github.com/p19racha/LongitudinalGeneration/releases/latest) page:
- **Linux**: `./PULSE-CDSS_1.0.1_amd64.AppImage`
- **Windows**: Run `PULSE-CDSS_1.0.1_x64-setup.exe`
- **macOS**: Mount `PULSE-CDSS_1.0.1_universal.dmg`

#### Option B: Run in Web Browser
```bash
# Terminal 1: Start FastAPI backend
source .venv/bin/activate
uvicorn server.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Start Next.js frontend
cd frontend
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

---

## Original Author & Paper Attribution

This codebase and research were conceived, developed, and published by:

* **Lead Author & Originator**: **Wei Wu** ([@ww20hust](https://github.com/ww20hust))  
  - **Affiliations**:  
    - Department of Big Data and Biomedical AI, College of Future Technology, Peking University & Peking-Tsinghua Center for Life Sciences, Beijing, China
    - Artificial Intelligence Cross Disciplinary Research Institute and Faculty of Medicine, Macau University of Science and Technology, Macau, China
    - Guangzhou National Laboratory, Guangzhou, China
  - **Email**: `ww20ya@163.com`  
  - **GitHub**: [https://github.com/ww20hust](https://github.com/ww20hust)
* **Co-First Authors** *(contributed equally)*:  
  Wei Wu, Gen Li, Kai Wang, Hui Xu, Haodi Xiao, Changxi Hu, Sian Liu, Cheng Tang
* **Corresponding Author**:  
  **Prof. Kang Zhang** (`kang.zhang@gmail.com`), Macau University of Science and Technology, Wenzhou Medical University, and Guangzhou National Laboratory
* **Consortium**:  
  On behalf of the **International Consortium of Digital Twins in Healthcare and Medicine**
* **Companion PDF**:  
  The full published paper is included in this repository:  
  [`Longitudinal alignments and syntheses of multimodal clinical data for personalized medicine with the PULSE framework.pdf`](file:///home/racha/LongitudinalGeneration/Longitudinal%20alignments%20and%20syntheses%20of%20multimodal%20clinical%20data%20for%20personalized%20medicine%20with%20the%20PULSE%20framework.pdf)

---

## Domain & Medico-Technical Advisory Acknowledgments

Special gratitude and formal acknowledgment are extended to:

* **Perugupalli Lakshmi Harika**  
  - **Email**: `91197503046@dnu.edu.vn`  
  - **Contribution**: Substantive advisory support in comprehending the clinical project requirements, deciphering the underlying physiological disease mechanisms, and bridging the complex medico-technical concepts formulated in the *Nature Computational Science* publication into an intuitive clinical decision support system.

---

## Citation & References

If you utilize the PULSE engine, clinical benchmarks, or CDSS implementation in your research, please cite:

```bibtex
@article{wu2026pulse,
  title     = {Longitudinal alignments and syntheses of multimodal clinical data for personalized medicine with the PULSE framework},
  author    = {Wu, Wei and Li, Gen and Wang, Kai and Xu, Hui and Xiao, Haodi and Hu, Changxi and Liu, Sian and Tang, Cheng and Liu, Fei and Zou, Zixing and Li, Bingzhou and Li, Jinghang and Zhang, Charlotte L. and Wong, Hang and Chong, Ieng and Lu, Wenyang and Sun, Zhuo and Yin, Yun and Loupy, Alexandre and Oermann, Eric and Al Dajani, Saleem A. and Zhu, Hao and Gootenberg, Jonathan and Abudayyeh, Omar O. and Gladyshev, Vadim N. and Rasko, John E. J. and Zhang, Kang},
  journal   = {Nature Computational Science},
  year      = {2026},
  doi       = {10.1038/s43588-026-01026-5},
  url       = {https://doi.org/10.1038/s43588-026-01026-5}
}
```

---

## License

This project is licensed under the [MIT License](LICENSE).
