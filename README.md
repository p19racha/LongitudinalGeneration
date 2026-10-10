# PULSE: Patient Unified Longitudinal Signal Engine

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![PyTorch 1.9+](https://img.shields.io/badge/PyTorch-1.9+-ee4c2c.svg)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Nature Computational Science](https://img.shields.io/badge/Nature%20Computational%20Science-2026-brightgreen.svg)](https://doi.org/10.1038/s43588-026-01026-5)

> **Official Implementation** of the paper:  
> **"Longitudinal alignments and syntheses of multimodal clinical data for personalized medicine with the PULSE framework"**  
> *Nature Computational Science* (2026). DOI: [10.1038/s43588-026-01026-5](https://doi.org/10.1038/s43588-026-01026-5)

---

## Table of Contents

1. [Original Author & Paper Attribution](#original-author--paper-attribution)
2. [Executive Summary & Core Concept](#executive-summary--core-concept)
3. [Theoretical Foundations & Mathematical Formulation](#theoretical-foundations--mathematical-formulation)
   - [The Longitudinal Clinical Mosaic Challenge](#the-longitudinal-clinical-mosaic-challenge)
   - [Variational Modality Encoders & Past-State Integration](#1-variational-modality-encoders--past-state-integration)
   - [Distributional Soft Alignment via Jeffrey Divergence](#2-distributional-soft-alignment-via-jeffrey-divergence)
   - [Equal-Weight Visit-State Fusion](#3-equal-weight-visit-state-fusion)
   - [Temporal State Propagation: Recurrent vs. Transformer](#4-temporal-state-propagation-recurrent-vs-transformer)
   - [Active Masking Training Strategy](#5-active-masking-training-strategy)
   - [Modality-Wise Adversarial Regularization (GRL)](#6-modality-wise-adversarial-regularization-grl)
   - [Complete Training Objective & KL Annealing](#7-complete-training-objective--kl-annealing)
4. [Repository Architecture & Codebase Map](#repository-architecture--codebase-map)
5. [Clinical Applications & Empirical Benchmark Results](#clinical-applications--empirical-benchmark-results)
   - [Benchmark 1: UK Biobank Two-Visit Metabolomics Imputation](#benchmark-1-uk-biobank-two-visit-metabolomics-imputation)
   - [Benchmark 2: Physiological Aging Trajectories in Joint Latent Space](#benchmark-2-physiological-aging-trajectories-in-joint-latent-space)
   - [Benchmark 3: Plasma Proteomics Synthesis & Disease Prediction](#benchmark-3-plasma-proteomics-synthesis--disease-prediction)
   - [Benchmark 4: Multicenter Acute Care Trajectories (MIMIC-III & Wenzhou ICU)](#benchmark-4-multicenter-acute-care-trajectories-mimic-iii--wenzhou-icu)
   - [Benchmark 5: Cross-Body Alignment (Retinal Fundus Photography + Routine Labs)](#benchmark-5-cross-body-alignment-retinal-fundus-photography--routine-labs)
6. [Ablation Studies & Empirical Validations](#ablation-studies--empirical-validations)
7. [Installation & Setup](#installation--setup)
8. [Quick Start & Usage Guide](#quick-start--usage-guide)
   - [Python API Usage](#python-api-usage)
   - [Command-Line Training & Inference](#command-line-training--inference)
   - [Reproducing Single-Cell Imputation Benchmarks](#reproducing-single-cell-imputation-benchmarks)
   - [Reproducing EHR Proteomics Benchmarks](#reproducing-ehr-proteomics-benchmarks)
   - [Reproducing MIMIC-III ICU Benchmarks](#reproducing-mimic-iii-icu-benchmarks)
   - [Reproducing Ablations & Mask Sensitivity](#reproducing-ablations--mask-sensitivity)
9. [Data Format Specification](#data-format-specification)
10. [Citation & Acknowledgments](#citation--acknowledgments)

---

## Original Author & Paper Attribution

This codebase and research was conceived, designed, and implemented by:

* **Original Author & Lead Developer**: **Wei Wu** ([@ww20hust](https://github.com/ww20hust))  
  - **Affiliations**:  
    - Department of Big Data and Biomedical AI, College of Future Technology, Peking University & Peking-Tsinghua Center for Life Sciences, Beijing, China
    - Artificial Intelligence Cross Disciplinary Research Institute and Faculty of Medicine, Macau University of Science and Technology, Macau, China
    - Guangzhou National Laboratory, Guangzhou, China
  - **Profile & Contact**: PhD student at Peking University, focusing on AI in Medicine and Neuroscience.  
    - Email: `ww20ya@163.com`  
    - GitHub: [https://github.com/ww20hust](https://github.com/ww20hust)
* **Co-First Authors** *(contributed equally)*:  
  Wei Wu, Gen Li, Kai Wang, Hui Xu, Haodi Xiao, Changxi Hu, Sian Liu, Cheng Tang
* **Corresponding Author**:  
  **Prof. Kang Zhang** (`kang.zhang@gmail.com`), Macau University of Science and Technology, Wenzhou Medical University, and Guangzhou National Laboratory
* **Consortium**:  
  On behalf of the **International Consortium of Digital Twins in Healthcare and Medicine**
* **Companion PDF Paper**:  
  The complete published paper is bundled within this repository:  
  [`Longitudinal alignments and syntheses of multimodal clinical data for personalized medicine with the PULSE framework.pdf`](file:///home/racha/LongitudinalGeneration/Longitudinal%20alignments%20and%20syntheses%20of%20multimodal%20clinical%20data%20for%20personalized%20medicine%20with%20the%20PULSE%20framework.pdf)

---

## Executive Summary & Core Concept

In routine healthcare, high-throughput molecular phenotyping (such as mass spectrometry metabolomics or Olink/SomaScan plasma proteomics) provides unprecedented insight into human biology, but its extreme cost and logistical complexity prevent repeated collection at every clinical visit. Consequently, patient histories consist of **longitudinal mosaic measurements**: routine, inexpensive laboratory panels or vital signs collected frequently, accompanied only intermittently by deep omics profiles, imaging, or unstructured narrative notes.

```
Real-World Longitudinal Clinical Observations (Mosaic Data):
Visit 1:    [Modality A (Routine Labs)]  +  [Modality B (Metabolomics/Proteomics)]  --> Fully Paired
Visit 2:    [Modality A (Routine Labs)]  +  [        MISSING MODALITY B          ]  --> Partially Observed
Visit 3:    [Modality A (Routine Labs)]  +  [        MISSING MODALITY B          ]  --> Partially Observed

PULSE Solution:
Prior States ──> Temporal Autoregressive Module ──> Past-State Z_P ─┐
                                                                    ├─> Soft Alignment + Equal-Weight Fusion ─> Z_visit ─> Full Multimodal Synthesis
Current Labs ─────────────────────────────────────> Modality Z_A ──┘                                                      [Labs + Imputed Omics/Notes]
```

Existing multimodal integration frameworks from single-cell biology (such as **MIDAS**, **scVAEIT**, and **StabMap**) treat samples as static, isolated cross-sectional observations—suitable for single cells destroyed upon sequencing, but ill-suited for clinical medicine where repeated observations from the *same patient* reveal continuous physiological covariation. Conventional longitudinal sequence models (RNNs, Transformers) typically model only single modalities or rely on naive concatenation, failing to address mosaic missingness or cross-modal distributional alignment.

**PULSE** (**P**atient **U**nified **L**ongitudinal **S**ignal **E**ngine) formalizes each patient as an evolving dynamical system:
1. **Biological Coupling**: Distinct clinical modalities are complementary readouts of a shared, continuous latent physiological process.
2. **Personalized Set Points**: A lab measurement is most informative not simply by its cross-sectional absolute value, but by its **trajectory of change** relative to the patient's individual homeostatic baseline.
3. **Temporal Conditioning for Imputation**: Incorporating an explicitly propagated past state ($Z_P$) constrains the space of biologically plausible transitions, making cross-modal imputation from sparse observations significantly more accurate and physiologically grounded.

<p align="center">
  <img src="docs/pulse_missing_imputation_diagram.svg" alt="PULSE Imputation Workflow" width="900">
</p>

---

## Theoretical Foundations & Mathematical Formulation

### The Longitudinal Clinical Mosaic Challenge

Let patient $i$ have longitudinal records over visits $t = 1, \dots, T_i$. At visit $t$, let $x_{i,t}^{(m)} \in \mathbb{R}^{D_m}$ denote the observed feature vector for modality $m \in \mathcal{M}$. Due to mosaic data collection, only a subset of modalities $\mathcal{O}_{i,t} \subseteq \mathcal{M}$ is observed at visit $t$.

Each modality status is categorized by an indicator variable $s_{i,t}^{(m)} \in \{0, 1, 2\}$:
- $s_{i,t}^{(m)} = 0$: **Observed** and available as input.
- $s_{i,t}^{(m)} = 1$: **Actively Masked** during training (withheld from encoders to force cross-modal/temporal reconstruction, but supervised by ground-truth targets).
- $s_{i,t}^{(m)} = 2$: **Naturally Missing** (absent in clinical reality; decoded by the model, but generates no reconstruction loss gradient).

---

### 1. Variational Modality Encoders & Past-State Integration

For every available modality $m \in \mathcal{O}_{i,t}$, a modality-specific variational encoder $q_{\phi_m}$ projects heterogeneous clinical measurements into a shared $D$-dimensional latent Gaussian distribution (default $D = 16$):

$$q_{\phi_m}(z_{i,t}^{(m)} \mid x_{i,t}^{(m)}) = \mathcal{N}\left(\mu_{i,t}^{(m)}, \text{diag}\left((\sigma_{i,t}^{(m)})^2\right)\right)$$

Simultaneously, the patient's summarized historical trajectory up to visit $t - 1$, denoted by $h_{i,t}$, is processed by a dedicated **Past-State encoder** $q_{\phi_P}$:

$$q_{\phi_P}(z_{P, i,t} \mid h_{i,t}) = \mathcal{N}\left(\mu_{P, i,t}, \text{diag}\left((\sigma_{P, i,t})^2\right)\right)$$

This past-state prior injects individual-specific baseline context, transforming ill-posed cross-sectional imputation into well-conditioned trajectory completion.

---

### 2. Distributional Soft Alignment via Jeffrey Divergence

To establish semantic consistency across diverse modality branches without forcing an overly rigid geometric collapse (which would destroy modality-specific variation), PULSE applies a pairwise distributional alignment penalty.

For two diagonal Gaussian posteriors $q_a = \mathcal{N}(\mu_a, \text{diag}(\sigma_a^2))$ and $q_b = \mathcal{N}(\mu_b, \text{diag}(\sigma_b^2))$, the Kullback-Leibler (KL) divergence is:

$$D_{\text{KL}}(q_a \parallel q_b) = \frac{1}{2} \sum_{d=1}^D \left[ \log\left(\frac{\sigma_{b,d}^2}{\sigma_{a,d}^2}\right) + \frac{\sigma_{a,d}^2 + (\mu_{a,d} - \mu_{b,d})^2}{\sigma_{b,d}^2} - 1 \right]$$

The **Jeffrey divergence** is the symmetric sum of forward and reverse KL divergences:

$$J(q_a, q_b) = D_{\text{KL}}(q_a \parallel q_b) + D_{\text{KL}}(q_b \parallel q_a)$$

Let $\mathcal{B}_{i,t} = \{q_{\phi_m} : m \in \mathcal{O}_{i,t}\} \cup \{q_{\phi_P}\}$ denote all active latent branches at visit $t$. The alignment loss is computed over all unordered branch pairs $\mathcal{P}_{i,t}$:

$$\mathcal{L}_{\text{align}}^{(i,t)} = \frac{1}{|\mathcal{P}_{i,t}|} \sum_{(a,b) \in \mathcal{P}_{i,t}} J(q_a, q_b)$$

*Key Insight*: Distributional alignment preserves posterior variance and uncertainty, outperforming deterministic point-wise MSE alignment (which empirical ablations show degrades performance).

---

### 3. Equal-Weight Visit-State Fusion

PULSE integrates the available modality representations and historical context into a unified latent visit state $z_{i,t}$ via explicit equal-weight averaging:

$$z_{i,t} = \frac{\mu_{P, i,t} + \sum_{m \in \mathcal{O}_{i,t}} \mu_{i,t}^{(m)}}{M_{\text{total}} + 1}$$

where $M_{\text{total}} = |\mathcal{O}_{i,t}|$ is the count of **currently observed modalities**.
- **Important**: The denominator $+1$ accounts specifically for $\mu_{P, i,t}$. Current modalities are not double-counted, and history is integrated exactly once.
- If no current modality is observed ($M_{\text{total}} = 0$), the visit state defaults smoothly to the pure past-state: $z_{i,t} = \mu_{P, i,t}$.

---

### 4. Temporal State Propagation: Recurrent vs. Transformer

Once the visit state $z_{i,t}$ is synthesized, PULSE propagates it forward to construct the historical context $h_{i,t+1}$ for visit $t+1$:

- **Recurrent Engine (`temporal_model="recurrent"`)**:  
  Uses a Gated Recurrent Unit (GRU) cell:
  $$h_{i,t+1} = \text{GRUCell}(z_{i,t}, h_{i,t})$$
  Ideal for short-to-medium visit sequences (2–5 visits), providing rapid convergence and low compute footprint.

- **Causal Transformer Engine (`temporal_model="transformer"`)**:  
  Applies causal self-attention over the sequence of preceding visit states $(z_{i,1}, \dots, z_{i,t})$ with sinusoidal position encodings:
  $$h_{i,t+1} = \text{TransformerEncoder}(\text{CausalMask}([z_{i,1}, \dots, z_{i,t}]))_{t}$$
  Ideal for extended longitudinal trajectories (such as dense ICU monitoring with dozens of steps).

---

### 5. Active Masking Training Strategy

If models are trained solely on observed combinations, they may learn trivial within-visit shortcuts and ignore temporal context. PULSE uses a **single-modality active masking** protocol:
- At each visit with $M_{\text{total}} \ge 2$ observed modalities, an active masking event is triggered with probability $p_{\text{mask}} = 0.6$ (default).
- Exactly one observed modality is randomly selected and relabeled from $s=0$ to $s=1$.
- Modalities with $s=1$ are withheld from the encoder inputs, but their ground truth targets are retained for reconstruction supervision.
- A visit is **never left completely empty** by active masking.

---

### 6. Modality-Wise Adversarial Regularization (GRL)

To prevent the decoders from producing artifacts correlated with missingness patterns, each modality is equipped with a binary discriminator $D_m$ preceded by a **Gradient Reversal Layer (GRL)**:
- $D_m$ attempts to predict whether modality $m$ was missing ($s \in \{1, 2\}$) or observed ($s = 0$) from the reconstructed output $\hat{x}_{i,t}^{(m)}$.
- The GRL negates gradients ($-\lambda_{\text{grl}} \nabla$) during backpropagation into the generative decoders, encouraging the latent representations and reconstructions to reflect genuine physiology rather than missingness artifacts:

$$\mathcal{L}_{\text{adv}} = \sum_{i,t} \sum_{m} \text{BCE}\left(D_m\left(\hat{x}_{i,t}^{(m)}\right), y_{i,t}^{(m)}\right)$$

---

### 7. Complete Training Objective & KL Annealing

The comprehensive loss minimized during training is:

$$\mathcal{L} = \mathcal{L}_{\text{rec}} + \lambda_{\text{KL}} \cdot \alpha(e) \cdot \mathcal{L}_{\text{KL}} + \lambda_{\text{align}} \cdot \mathcal{L}_{\text{align}} + \lambda_{\text{adv}} \cdot \mathcal{L}_{\text{adv}}$$

where:
- **Reconstruction Loss**:
  $$\mathcal{L}_{\text{rec}} = \sum_{i,t} \sum_{m} \mathbb{I}[s_{i,t}^{(m)} \in \{0, 1\}] \cdot \text{MSE}\left(\hat{x}_{i,t}^{(m)}, x_{i,t}^{(m)}\right)$$
- **KL Regularization**: Standard Gaussian prior regularization $\mathcal{N}(0, I)$ across all active modality branches and the past-state branch:
  $$\mathcal{L}_{\text{KL}} = \sum_{b \in \mathcal{B}_{i,t}} D_{\text{KL}}(q_b \parallel \mathcal{N}(0, I))$$
- **KL Annealing Weight $\alpha(e)$**: Linearly warmed up from $0 \to 1$ over the first 50 epochs ($e \in [1, 50]$) to prevent early posterior collapse.

---

## Repository Architecture & Codebase Map

```
LongitudinalGeneration/
│
├── Longitudinal alignments and syntheses...pdf  # Full Nature Computational Science (2026) paper
├── ARCHITECTURE.md                              # Core design specifications & module details
├── README.md                                    # Comprehensive system documentation (this file)
├── requirements.txt                             # Python dependencies
├── setup.py                                     # Package installation script
│
├── pulse/                                       # Core PULSE library
│   ├── __init__.py                              # Public exports (PulseModel, Trainer, etc.)
│   ├── model.py                                 # Main PulseModel orchestration module
│   ├── losses.py                                # Loss functions: recon, KL, Jeffrey, GRL adversarial
│   ├── clinical_benchmark.py                   # Data pipeline for 2-visit tabular CSV benchmarks
│   ├── core/
│   │   ├── encoders.py                          # Modality-specific & Past-State variational encoders
│   │   ├── decoders.py                          # Modality decoders (Lab, Metabolomics, Generic)
│   │   ├── alignment.py                         # Jeffrey divergence & alternative alignment strategies
│   │   ├── fusion.py                            # Equal-weight visit state fusion
│   │   ├── temporal.py                          # Recurrent (GRU) & Causal Transformer temporal engines
│   │   └── adversarial.py                       # GRL & ModalityMissingnessAdversary
│   ├── data/
│   │   └── dataset.py                           # LongitudinalDataset, collate_visits, active masking
│   ├── training/
│   │   └── trainer.py                           # Training loop, KL annealing, early stopping, ckpts
│   └── utils/
│       └── distributions.py                     # Reparameterization trick & probability math
│
├── scripts/                                     # Reproducibility & Benchmark Suites
│   ├── train.py                                 # General training CLI on synthetic/custom datasets
│   ├── inference.py                             # General inference & imputation CLI
│   │
│   ├── Benchmark-single-cell-Method/            # Metabolomics Imputation Benchmark vs. Single-Cell
│   │   ├── run_pulse.py                         # PULSE longitudinal imputation runner
│   │   ├── pulse_adapter.py                     # Adapter bridging PulseModel to the benchmark harness
│   │   ├── run_midas.py                         # Adapted MIDAS (Product of Experts) baseline
│   │   ├── run_scvaeit.py                       # Adapted scVAEIT (Masked VAE) baseline
│   │   ├── run_stabmap_from_csv.py              # Adapted StabMap (MNN mosaic manifold) baseline
│   │   ├── prepare_tabular_benchmark.py         # Standardized patient-level train/test splitter
│   │   ├── evaluate_predictions.py             # Common metric evaluation script (r, MAE, MSE)
│   │   └── README.md                            # Benchmark documentation & installation guide
│   │
│   ├── Bencmark-EHR-Modeling/                   # Plasma Proteomics Benchmark vs. EHR Models
│   │   ├── pulse_benchmark.py                   # PULSE multimodal alignment runner
│   │   ├── transformer_benchmark.py             # End-to-end tokenized Transformer encoder baseline
│   │   ├── llama31_benchmark.py                 # Frozen Llama 3.1 8B narrative embedding baseline
│   │   ├── llama_embedding_backends.py          # HuggingFace & memory-efficient LLM backends
│   │   ├── common.py                            # Shared data loaders, tokenizers, evaluation
│   │   └── README.md                            # EHR proteomics benchmark documentation
│   │
│   ├── PULSE_MIMIC/                             # ICU Acute Care Trajectory Benchmark (MIMIC-III)
│   │   ├── run_pulse.py                         # PULSE 4-hour step trajectory model (labs + notes)
│   │   ├── run_notes_only.py                    # Unstructured clinical text only (Llama 3.1 8B)
│   │   ├── run_lab_transformer.py               # Structured lab time-series only (Transformer)
│   │   ├── run_simply_combined.py               # Late-fusion baseline (Labs Transformer + Note LLM)
│   │   ├── mimic_data_extract_preprocess.py     # SQL/Pandas extraction from raw MIMIC-III DB
│   │   ├── prepare_binary_benchmark.py          # Mortality & Readmission dataset builder
│   │   ├── precompute_vllm_embeddings.py        # High-throughput vLLM note embedding caching
│   │   ├── models.py                            # Model architectures for ICU tasks
│   │   ├── common.py                            # Utilities and metric calculations
│   │   └── README.md                            # MIMIC-III benchmark documentation
│   │
│   └── Ablation/                                # Empirical Ablations & Sensitivity Suite
│       ├── run_metabolomics_ablations.py        # History, alignment variants, and loss ablations
│       ├── run_mask_probability_sensitivity.py  # Active masking rate sweep (p in [0.0, 1.0])
│       ├── common.py                            # Shared ablation utilities
│       └── README.md                            # Ablation documentation
│
└── docs/                                        # Diagrams & Interactive Visualizations
    ├── pulse_missing_imputation_diagram.svg     # SVG diagram of mosaic input-output flow
    ├── pulse_demo.svg                           # Architectural vector graphic
    ├── ehr-frameworks-overview.html             # Interactive HTML comparing EHR input paradigms
    └── pulse-demo.html                          # Interactive animated HTML demo of PULSE imputation
```

---

## Clinical Applications & Empirical Benchmark Results

### Benchmark 1: UK Biobank Two-Visit Metabolomics Imputation

- **Cohort**: 10,000 UK Biobank participants (7,000 train, 3,000 held-out test).
- **Task**: Reconstruct full Follow-up Visit ($t=1$) metabolomic profile (**251 biomarkers**) using only routine blood tests (**61 laboratory tests**) at follow-up, conditioned on baseline ($t=0$) history.
- **Fairness Protocol**: All methods share the identical 70/30 patient split. Single-cell baselines treat all visits as static paired samples; only PULSE receives baseline history as temporal context.

| Model / Framework | Type | Context Used | Pearson's $r$ ($\uparrow$) | MAE ($\downarrow$) | MSE ($\downarrow$) |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **PULSE (Ours)** | Longitudinal Variational | History ($t=0$) + Current Labs ($t=1$) | **0.781 ± 0.012** | **0.312 ± 0.008** | **0.201 ± 0.009** |
| **scVAEIT** | Static Masked VAE | Current Labs ($t=1$) only | 0.654 ± 0.015 | 0.405 ± 0.010 | 0.324 ± 0.012 |
| **MIDAS** | Static Product-of-Experts | Current Labs ($t=1$) only | 0.638 ± 0.016 | 0.418 ± 0.011 | 0.341 ± 0.013 |
| **StabMap** | Static MNN Manifold | Current Labs ($t=1$) only | 0.589 ± 0.018 | 0.462 ± 0.013 | 0.410 ± 0.015 |

*Key Findings*:
- PULSE outperforms all static single-cell models across all 251 metabolites ($P < 0.0001$).
- Top reconstructed features are **lipid ratios** and lipoprotein subfractions (e.g., free cholesterol-to-total lipid ratio in large LDL particles).
- **Longitudinal Trajectory Concordance**: On predicting longitudinal *change* ($\Delta = \text{Follow-up} - \text{Baseline}$), PULSE achieves **$r = 0.850$**, confirming that it models dynamic within-person physiological trajectories rather than population mean reversion.

---

### Benchmark 2: Physiological Aging Trajectories in Joint Latent Space

To evaluate representation robustness under extreme mosaic missingness:
1. An artificially unpaired cohort was created: 50% fully paired, 25% lab tests only, 25% metabolomics only.
2. Trained on paired data, PULSE inferred joint latent coordinates for all test individuals.
3. **UMAP Manifold & Trajectory Analysis**:
   - Despite partial observations, all sample types mapped to a single unified physiological manifold.
   - **UMAP1** naturally captured a smooth chronological age gradient ($P < 0.0001$).
   - **UMAP2** captured profound biological heterogeneity independent of chronological age.
   - Using **CellRank** vector-field stream analysis, the high-dimensional latent space revealed three distinct physiological aging trajectories.
   - Individuals in the accelerated-aging branch (Group 3) exhibited significantly elevated 10-year cumulative incidence of **COPD, Type 2 Diabetes, Heart Failure, and Ischemic Stroke** ($P < 0.0001$, log-rank test).

---

### Benchmark 3: Plasma Proteomics Synthesis & Disease Prediction

- **Cohort**: UK Biobank Pharma Proteomics Project (UKB-PPP; $n = 50,000$ participants; 35,000 train, 15,000 test).
- **Task**: Synthesize **2,923 plasma protein abundances** from 61 routine blood markers and encoded prior medical history (ICD diagnosis trajectories).
- **Competitors**:
  - **Delphi**: Transformer-based disease trajectory model.
  - **Llama 3.1 8B**: LLM text embedding from narrative patient histories.
  - **Structured Transformer**: Tokenized diagnosis + discretized lab sequence encoder.

| Method | Mean Per-Protein Pearson $r$ | Pleiotropic Protein $r$ |
| :--- | :---: | :---: |
| **PULSE** | **0.468** | **0.612** |
| **Structured Transformer** | 0.392 | 0.518 |
| **Llama 3.1 8B** | 0.365 | 0.485 |
| **Delphi** | 0.311 | 0.402 |

*Downstream 10-Year Clinical Incident Disease Prediction*:
Models trained on **PULSE-synthesized proteomics** achieved disease prediction AUROCs virtually identical to models trained on **true measured proteomics**:
- Dementia: AUROC **0.831** (Synthesized) vs. **0.835** (Measured)
- Heart Failure: AUROC **0.798** (Synthesized) vs. **0.801** (Measured)
- Myocardial Infarction: AUROC **0.784** (Synthesized) vs. **0.789** (Measured)
- COPD: AUROC **0.772** (Synthesized) vs. **0.775** (Measured)
- Stroke: AUROC **0.745** (Synthesized) vs. **0.749** (Measured)
- Type 2 Diabetes: AUROC **0.728** (Synthesized) vs. **0.731** (Measured)

---

### Benchmark 4: Multicenter Acute Care Trajectories (MIMIC-III & Wenzhou ICU)

- **Cohorts**:
  - **MIMIC-III (US)**: 44,265 adult ICU stays (3,025 30-day readmissions).
  - **Wenzhou ICU (China)**: 13,816 adult ICU stays (793 30-day readmissions).
- **Task**: 30-day post-discharge readmission prediction from the first 48 hours of ICU admission, aggregated into twelve 4-hour temporal steps combining structured labs and unstructured clinical notes.

| Cohort | Metric | Lab Transformer Only | Clinical Notes (Llama 3) Only | Directly Combined (Late Fusion) | **PULSE (Ours)** |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **MIMIC-III** | **AUROC** | 0.639 | 0.647 | 0.663 | **0.713** (0.691–0.732) |
| | **AUPRC** | 0.110 | 0.127 | 0.130 | **0.193** (0.167–0.224) |
| **Wenzhou ICU** | **AUROC** | 0.647 | 0.691 | 0.706 | **0.735** (0.683–0.789) |
| | **AUPRC** | 0.116 | 0.273 | 0.317 | **0.388** (0.298–0.480) |

---

### Benchmark 5: Cross-Body Alignment (Retinal Fundus Photography + Routine Labs)

- **Pediatric Myopia Progression** ($n = 24,605$ children; 50,043 visits):  
  Pretraining PULSE cross-modally on retinal fundus images + routine blood panels enabled lab-only representations to forecast **Axial Length (AL)** and **Spherical Equivalent (SE)** trajectories 1–5 years into the future with significantly reduced error compared to lab-only baselines ($P < 0.001$).
- **Systemic Disease Prediction** ($n = 127,731$ adults; 657,103 visits):  
  Aligning fundus images with systemic blood panels produced a vision encoder capable of predicting 5-year incident myocardial infarction, stroke, dementia, and heart failure directly from retinal photographs with AUROCs of **0.76–0.82**.

---

## Ablation Studies & Empirical Validations

Extensive ablation experiments on the two-visit UK Biobank metabolomics task confirm the essential role of each architectural component:

| Model Configuration / Variant | Pearson's $r$ | MAE | MSE | Analysis & Conclusion |
| :--- | :---: | :---: | :---: | :--- |
| **Full PULSE Framework** | **0.781** | **0.312** | **0.201** | Default complete model |
| **w/o Historical State ($Z_P$)** | 0.662 | 0.401 | 0.315 | Demonstrates that longitudinal history is critical |
| **Directional Stop-Gradient** | 0.774 | 0.319 | 0.210 | Treating current visit as fixed reference slightly harms alignment |
| **Point-wise Alignment (MSE)** | 0.729 | 0.354 | 0.252 | Forcing deterministic point identity degrades distribution modeling |
| **w/o Alignment Loss ($\mathcal{L}_{\text{align}}$)** | 0.698 | 0.378 | 0.281 | Without Jeffrey divergence, latent spaces decouple |
| **w/o Adversarial Loss ($\mathcal{L}_{\text{adv}}$)** | 0.763 | 0.324 | 0.218 | GRL adversary removes missingness-dependent inductive bias |

### Active Masking Probability Sensitivity

Scanning active-mask probability $p_{\text{mask}} \in [0.0, 1.0]$:
- $p_{\text{mask}} = 0.0$ (no active masking): Model overfits to trivial within-visit correlations ($r = 0.684$).
- $p_{\text{mask}} \in [0.4, 0.6]$: Optimal balance between within-visit structure and historical conditioning (**$r = 0.781$** at $p = 0.6$).
- $p_{\text{mask}} = 1.0$: Slight degradation due to insufficient observed multimodal co-occurrence during encoding.

---

## Installation & Setup

### Environment Requirements
- Linux OS (Ubuntu 20.04+ recommended)
- Python 3.8+ (Python 3.9–3.11 recommended)
- PyTorch 1.9+ (CUDA 11.8 / 12.1+ recommended for GPU acceleration)

### Basic Installation

```bash
# Clone the repository
git clone https://github.com/p19racha/LongitudinalGeneration.git
cd LongitudinalGeneration

# Create and activate a clean conda environment
conda create -n pulse python=3.9 -y
conda activate pulse

# Install base package dependencies
pip install -r requirements.txt

# Install PULSE in editable development mode
pip install -e .
```

Verify the installation:
```python
import pulse
print(pulse.__version__)
# Successfully imports PulseModel, Trainer, LongitudinalDataset
```

---

## Quick Start & Usage Guide

### Python API Usage

```python
import torch
from torch.utils.data import DataLoader
from pulse.data.dataset import LongitudinalDataset, collate_visits, create_synthetic_data
from pulse.model import PulseModel
from pulse.training.trainer import Trainer

device = "cuda:0" if torch.cuda.is_available() else "cpu"

# 1. Define feature dimensions for your modalities
modality_dims = {
    "routine_labs": 61,
    "metabolomics": 251,
}

# 2. Instantiate PULSE
model = PulseModel(
    modality_dims=modality_dims,
    latent_dim=16,
    hidden_dim=128,
    lambda_kl=1.0,
    lambda_align=1.0,
    lambda_adv=1.0,
    temporal_model="recurrent",  # choose "recurrent" or "transformer"
).to(device)

# 3. Create or load longitudinal data
patient_ids, visits_data, missing_masks = create_synthetic_data(
    n_patients=500,
    n_visits=3,
    modality_dims=modality_dims,
    missing_rate=0.2,
)

# 4. Wrap with LongitudinalDataset (active masking enabled during training)
train_dataset = LongitudinalDataset(
    patient_ids=patient_ids,
    visits_data=visits_data,
    missing_masks=missing_masks,
    train_mask_rate=0.6,
)
train_loader = DataLoader(
    train_dataset,
    batch_size=16,
    shuffle=True,
    collate_fn=collate_visits,
)

# 5. Train with built-in KL annealing and early stopping
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-3)
trainer = Trainer(model, optimizer, device=device)
history = trainer.train(train_loader, n_epochs=50)

# 6. Impute missing modalities at inference
imputations = model.impute_missing(visits_data[0:1], missing_masks[0:1])
```

---

### Command-Line Training & Inference

#### Training with Active Masking & Recurrent Temporal Dynamics:
```bash
python scripts/train.py \
  --device cuda:0 \
  --n_patients 1000 \
  --n_visits 3 \
  --batch_size 16 \
  --epochs 50 \
  --train_mask_rate 0.6 \
  --temporal_model recurrent \
  --modality_a_name routine_labs --modality_a_dim 61 \
  --modality_b_name metabolomics --modality_b_dim 251 \
  --save_dir ./checkpoints
```

#### Training with Causal Transformer Dynamics:
```bash
python scripts/train.py \
  --device cuda:0 \
  --temporal_model transformer \
  --temporal_num_heads 4 \
  --temporal_num_layers 2 \
  --save_dir ./checkpoints_transformer
```

#### Running Imputation Inference from a Saved Checkpoint:
```bash
python scripts/inference.py \
  --device cuda:0 \
  --checkpoint ./checkpoints/checkpoint_epoch_50.pt
```

---

### Reproducing Single-Cell Imputation Benchmarks

Navigate to `scripts/Benchmark-single-cell-Method/`.  
To benchmark against external single-cell baselines, clone their repositories:

```bash
cd scripts/Benchmark-single-cell-Method
mkdir -p baseline-model
git clone https://github.com/jaydu1/scVAEIT.git baseline-model/scVAEIT
git clone https://github.com/labomics/midas.git baseline-model/midas
git clone https://github.com/MarioniLab/StabMap.git baseline-model/StabMap
cd ../..
```

Execute the comparisons:

```bash
# 1. Run PULSE (Longitudinal historical context)
python scripts/Benchmark-single-cell-Method/run_pulse.py \
  --csv data/clinical_two_visit.csv \
  --output-dir outputs/benchmark_pulse \
  --train-ratio 0.7 --split-seed 42

# 2. Run scVAEIT
python scripts/Benchmark-single-cell-Method/run_scvaeit.py \
  --csv data/clinical_two_visit.csv \
  --output-dir outputs/benchmark_scvaeit

# 3. Run MIDAS
python scripts/Benchmark-single-cell-Method/run_midas.py \
  --csv data/clinical_two_visit.csv \
  --output-dir outputs/benchmark_midas

# 4. Run StabMap
python scripts/Benchmark-single-cell-Method/run_stabmap_from_csv.py \
  --csv data/clinical_two_visit.csv \
  --output-dir outputs/benchmark_stabmap
```

---

### Reproducing EHR Proteomics Benchmarks

Navigate to `scripts/Bencmark-EHR-Modeling/`:

```bash
# 1. Standard Structured Transformer Baseline
python scripts/Bencmark-EHR-Modeling/transformer_benchmark.py \
  --device cuda:0 \
  --train_path data/proteomics_train.jsonl \
  --valid_path data/proteomics_valid.jsonl \
  --test_path data/proteomics_test.jsonl \
  --save_dir outputs/transformer_proteomics

# 2. Frozen Llama 3.1 8B LLM Baseline
python scripts/Bencmark-EHR-Modeling/llama31_benchmark.py \
  --device cuda:0 \
  --llama_model_name_or_path meta-llama/Llama-3.1-8B \
  --llama_dtype float16 \
  --train_path data/proteomics_train.jsonl \
  --test_path data/proteomics_test.jsonl \
  --save_dir outputs/llama_proteomics

# 3. PULSE Benchmark
python scripts/Bencmark-EHR-Modeling/pulse_benchmark.py \
  --device cuda:0 \
  --train_path data/proteomics_train.jsonl \
  --test_path data/proteomics_test.jsonl \
  --save_dir outputs/pulse_proteomics
```

---

### Reproducing MIMIC-III ICU Benchmarks

Navigate to `scripts/PULSE_MIMIC/`:

```bash
# 1. Extract & Prepare Binary Benchmark
python scripts/PULSE_MIMIC/prepare_binary_benchmark.py \
  --extracted_dir data/with_notes/readmission_48h_4h \
  --task readmission \
  --output_dir data/mimic_readmission_prepared

# 2. (Optional) High-Speed Note Embedding Precomputation via vLLM
python scripts/PULSE_MIMIC/precompute_vllm_embeddings.py \
  --train_path data/mimic_readmission_prepared/train.pkl \
  --valid_path data/mimic_readmission_prepared/valid.pkl \
  --test_path data/mimic_readmission_prepared/test.pkl \
  --cache_dir outputs/vllm_cache \
  --vllm_base_url http://localhost:8000/v1

# 3. Run PULSE on ICU Trajectories
python scripts/PULSE_MIMIC/run_pulse.py \
  --train_path data/mimic_readmission_prepared/train.pkl \
  --valid_path data/mimic_readmission_prepared/valid.pkl \
  --test_path data/mimic_readmission_prepared/test.pkl \
  --llama_cache_dir outputs/vllm_cache \
  --save_dir outputs/pulse_mimic_readmission
```

---

### Reproducing Ablations & Mask Sensitivity

```bash
# Comprehensive ablation suite
python scripts/Ablation/run_metabolomics_ablations.py \
  --csv data/clinical_two_visit.csv \
  --output-dir outputs/metabolomics_ablations

# Active masking rate sensitivity sweep (0.0 to 1.0)
python scripts/Ablation/run_mask_probability_sensitivity.py \
  --csv data/clinical_two_visit.csv \
  --mask-rates 0.0,0.2,0.4,0.6,0.8,1.0 \
  --output-dir outputs/mask_sensitivity
```

---

## Data Format Specification

### 1. In-Memory Python / DataLoader Format

- `visits_data`: `List[List[Dict[str, Optional[Tensor]]]]`  
  Shape: `[n_patients, n_visits, modalities]`.  
  Example for one patient with 3 visits:
  ```python
  visits_data = [
      {"routine_labs": torch.randn(61), "metabolomics": torch.randn(251)},  # Visit 1: Paired
      {"routine_labs": torch.randn(61), "metabolomics": None},              # Visit 2: Labs only
      {"routine_labs": torch.randn(61), "metabolomics": torch.randn(251)},  # Visit 3: Paired
  ]
  ```

- `missing_masks`: `List[List[Dict[str, int]]]`  
  Integer status flags per visit and modality:
  - `0`: **Available / Observed**
  - `1`: **Actively Masked** (withheld from encoder during training; supervised in reconstruction)
  - `2`: **Naturally Missing** (absent measurement)
  ```python
  missing_masks = [
      {"routine_labs": 0, "metabolomics": 0},
      {"routine_labs": 0, "metabolomics": 2},
      {"routine_labs": 0, "metabolomics": 0},
  ]
  ```

### 2. Tabular CSV Format (e.g. for Two-Visit Metabolomics)

```csv
eid,visit,lab_001,lab_002,...,lab_061,metab_001,metab_002,...,metab_251
10001,0,1.21,0.45,...,-0.12,0.89,-0.34,...,1.05
10001,1,1.18,0.51,...,-0.09,NaN,NaN,...,NaN
10002,0,0.95,-0.12,...,0.44,-0.22,0.11,...,-0.45
10002,1,1.02,-0.08,...,0.39,NaN,NaN,...,NaN
```

---

## Citation & Acknowledgments

If you use PULSE in your research or clinical studies, please cite the original publication:

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

### Authorship Note
We gratefully acknowledge **Wei Wu** ([@ww20hust](https://github.com/ww20hust), Peking University) for the original conceptualization, algorithmic design, and repository foundation of the PULSE engine, as well as the members of the International Consortium of Digital Twins in Healthcare and Medicine.

---

## License

This project is open-sourced under the [MIT License](LICENSE).
