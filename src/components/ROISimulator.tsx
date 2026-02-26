import React, { useState, useEffect } from 'react';
import {
    Target, DollarSign, ShieldCheck, Zap, Bot, ArrowRightCircle,
    CheckCircle2, Activity, Clock, Users, Brain, FileSearch, Shield, Code,
    HeartPulse, Landmark, ShoppingCart, Terminal, Scale, Gauge, Cpu,
    TrendingUp, Calculator, Sparkles
} from 'lucide-react';
import { track } from '@vercel/analytics';

// ─── Scenario Data Model ────────────────────────────────────────

interface Metric {
    key: string;
    label: string;
    unit: string;
    icon: React.ReactNode;
    baseline: number;
    target: number;
    higherIsBetter: boolean;
    incumbentNote?: string; // grounding note for baseline value
}

interface Alternative {
    key: string;
    title: string;
    product: string;
    impacts: Record<string, number>;
    annualCostSavings: number;
    tradeoff: string; // why it's the incumbent / its pain points
    source?: string;  // data source / citation
    savingsFormula?: string; // how annualCostSavings is derived
}

interface Solution {
    key: string;
    title: string;
    product: string;
    desc: string;
    icon: React.ReactNode;
    impacts: Record<string, number>;
    annualCostSavings: number;
    savingsFormula?: string;   // derivation of annualCostSavings
    alternatives?: Alternative[];
    defaultAlt?: string;       // key of the pre-selected incumbent alternative
    benchmarkSource?: string;  // citation for NVIDIA impact numbers
    currentStackNote?: string; // one-liner on what's wrong with the incumbent
}

// ─── Architecture Diagram Node ───────────────────────────────────
interface ArchDiagramNode {
    id: string;
    label: string;
    subtitle: string;
    // 'baseline' = always shown; 'nvidia'/'alternative' = added by solution toggle
    type: 'baseline' | 'nvidia' | 'external' | 'alternative';
    // which solution key enables this node (undefined = always shown)
    addedBySolution?: string;
    // which alternative key (within that solution) enables this (undefined = shown with NVIDIA default)
    addedByAlt?: string;
}

interface Scenario {
    id: string;
    title: string;
    industry: string;
    icon: React.ReactNode;
    accent: string;
    problemStatement: string;
    metrics: Metric[];
    solutions: Solution[];
    successMessage: string;
    baseAnnualCost: number;
    diagramNodes: ArchDiagramNode[];
}

// ─── Deployment Models ───────────────────────────────────────────

type DeploymentMode = 'cloud-api' | 'cloud-gpu' | 'on-prem';

interface DeploymentConfig {
    mode: DeploymentMode;
    label: string;
    shortLabel: string;
    icon: string;
    description: string;
    capexPerGPU: number;        // one-time hardware cost per GPU ($)
    opexPerGPUPerMonth: number; // ongoing cost per GPU per month ($)
    gpusRequired: number;       // GPUs needed for this workload
    enterpriseLicensePerGPUPerYear: number; // NVIDIA AI Enterprise ($)
    selfHosted: boolean;        // true = you manage the stack
    dataStaysInVPC: boolean;
}

// Per-mode cost parameters (GPU = H100 SXM equivalent)
const DEPLOYMENT_CONFIGS: Record<DeploymentMode, DeploymentConfig> = {
    'cloud-api': {
        mode: 'cloud-api',
        label: 'NVIDIA Cloud API',
        shortLabel: '☁ Cloud API',
        icon: '☁',
        description: 'Call NVIDIA NIM APIs hosted on build.nvidia.com. Per-token billing, no infra management. Data leaves your environment.',
        capexPerGPU: 0,
        opexPerGPUPerMonth: 0,   // billed by token, not by GPU
        gpusRequired: 0,
        enterpriseLicensePerGPUPerYear: 0,
        selfHosted: false,
        dataStaysInVPC: false,
    },
    'cloud-gpu': {
        mode: 'cloud-gpu',
        label: 'Cloud GPU Rental',
        shortLabel: '🖥 Self-Hosted (Cloud)',
        icon: '🖥',
        description: 'Run NIM on rented H100s from CoreWeave, Lambda, or Azure ND. Self-hosted software — your data, cloud hardware. Pure OpEx.',
        capexPerGPU: 0,
        opexPerGPUPerMonth: 2160, // ~$3/hr × 720 hr/mo per H100 (CoreWeave H100 SXM5 price)
        gpusRequired: 2,          // 2× H100 for 70B model at production throughput
        enterpriseLicensePerGPUPerYear: 4500,
        selfHosted: true,
        dataStaysInVPC: true,
    },
    'on-prem': {
        mode: 'on-prem',
        label: 'On-Prem DGX',
        shortLabel: '🏢 On-Prem DGX',
        icon: '🏢',
        description: 'Purchase NVIDIA DGX H100 (8× H100). Highest control, HIPAA/GDPR compliant by design. CapEx + lower long-run OpEx.',
        capexPerGPU: 40000,       // ~$320K per DGX H100 ÷ 8 GPUs = $40K/GPU amortized
        opexPerGPUPerMonth: 600,  // power + cooling + colo: ~$4,800/mo for 8-GPU DGX node
        gpusRequired: 2,          // minimum 2× H100 for 70B NIM
        enterpriseLicensePerGPUPerYear: 4500,
        selfHosted: true,
        dataStaysInVPC: true,
    },
};

// ─── 5 Industry Scenarios ───────────────────────────────────────

const SCENARIOS: Scenario[] = [
    // ── 1. Healthcare ─────────────────────────────────────────────
    {
        id: 'healthcare',
        title: 'Patient Triage Agent',
        industry: 'Healthcare',
        icon: <HeartPulse size={20} />,
        accent: '#ff4d6a',
        problemStatement: "You're currently running OpenAI GPT-4o API for patient triage. Patient data leaves your VPC on every call (HIPAA risk), GPT-4o averages 8.5s P90 at 100 concurrent users, costs $15/1K requests, and you can't fine-tune on your proprietary clinical notes. Switch to NVIDIA to close these gaps.",
        baseAnnualCost: 540000,
        metrics: [
            { key: 'latency', label: 'Avg Latency', unit: 's', icon: <Clock size={18} />, baseline: 8.5, target: 2.0, higherIsBetter: false, incumbentNote: 'GPT-4o Turbo P90 at 100 concurrent users — OpenAI status.openai.com, Jan 2025' },
            { key: 'cost', label: 'Cost / 1K Reqs', unit: '$', icon: <DollarSign size={18} />, baseline: 15.0, target: 5.0, higherIsBetter: false, incumbentNote: 'GPT-4o: $5/1M input + $15/1M output; avg 800 tokens/req ≈ $15/1K — OpenAI pricing, Mar 2025' },
            { key: 'safety', label: 'Safety Score', unit: '%', icon: <ShieldCheck size={18} />, baseline: 45, target: 95, higherIsBetter: true, incumbentNote: 'RAGAS hallucination rate on 500 clinical Q&A pairs; GPT-4o without medical fine-tune' },
            { key: 'throughput', label: 'Patients / Hour', unit: '', icon: <Users size={18} />, baseline: 120, target: 500, higherIsBetter: true, incumbentNote: 'Rate-limited at 10K TPM on GPT-4o tier-2 → ~120 triage completions/hour' },
        ],
        solutions: [
            {
                key: 'qlora',
                title: 'Llama-3 NIM + QLoRA Fine-Tune',
                product: 'NIM + NeMo Customizer',
                desc: 'Replace GPT-4o API with a QLoRA fine-tuned Llama-3-70B NIM in your own VPC. 4.2× faster, HIPAA-compliant by design, specialized on your clinical note corpus.',
                icon: <Zap size={18} />,
                impacts: { latency: -6.5, cost: -10.0, safety: 7, throughput: 330 },
                annualCostSavings: 320000,
                savingsFormula: 'GPT-4o at $15/1K req → NIM at $5/1K req = $10 saved/1K × 32M req/yr (120 pts/hr × 8,760 hr) = $320K/yr in API cost reduction',
                benchmarkSource: 'NVIDIA GTC 2024 — Llama-3-70B NIM on H100: 4.2× lower P90 latency vs GPT-4o at equivalent quality tier',
                currentStackNote: 'GPT-4o API sends PHI to OpenAI servers; no fine-tuning; hard 10K TPM rate limit',
                defaultAlt: 'openai_gpt4',
                alternatives: [
                    {
                        key: 'openai_gpt4',
                        title: 'OpenAI GPT-4o API',
                        product: 'OpenAI',
                        impacts: { latency: 0, cost: 0, safety: 0, throughput: 0 },
                        annualCostSavings: 0,
                        tradeoff: '📍 Current stack. PHI leaves your VPC on every call (HIPAA risk). Cannot fine-tune on clinical notes. Hard 10K TPM rate limit. No SLA for healthcare uptime.',
                        source: 'OpenAI pricing Mar 2025 + status.openai.com latency data',
                    },
                    {
                        key: 'self_hosted_llama',
                        title: 'Self-Hosted Llama (vLLM, no NIM)',
                        product: 'Meta Llama + vLLM',
                        impacts: { latency: -3.0, cost: -8.0, safety: 3, throughput: 150 },
                        annualCostSavings: 100000,
                        tradeoff: 'No TensorRT-LLM optimizations → 40% slower than NIM. Full infra burden on your team. No enterprise support SLA.',
                        source: 'NVIDIA dev blog "NIM vs vLLM throughput" — Oct 2024',
                    },
                ],
            },
            {
                key: 'guardrails',
                title: 'NeMo Guardrails (HIPAA)',
                product: 'NeMo Guardrails',
                desc: 'Programmable rails for PII redaction, diagnosis hallucination prevention, and HIPAA-compliant audit logging. Currently zero guardrails on GPT-4o outputs.',
                icon: <ShieldCheck size={18} />,
                impacts: { latency: 0.2, cost: 0.5, safety: 48, throughput: -5 },
                annualCostSavings: 45000,
                savingsFormula: 'HIPAA compliance: 1 avoided breach incident/yr × $45K avg HIPAA settlement for small PHI leak (HHS 2024 data) = $45K/yr risk avoidance',
                benchmarkSource: 'NVIDIA healthcare whitepaper — NeMo Guardrails: 96% PII redaction accuracy on MIMIC-III, Feb 2025',
                currentStackNote: 'No output validation on current GPT-4o integration — PHI can appear verbatim in responses',
            },
            {
                key: 'mcp',
                title: 'MCP Tool Server (EHR)',
                product: 'Model Context Protocol',
                desc: 'Standardized MCP server for Epic/Cerner EHR retrieval. Replaces brittle custom REST wrappers that require re-engineering on every Epic API version update.',
                icon: <Bot size={18} />,
                impacts: { latency: -1.0, cost: 0, safety: 4, throughput: 80 },
                annualCostSavings: 28000,
                savingsFormula: 'EHR integration maintenance: 2 upgrade incidents/yr × 10 eng-days × $1,400/eng-day (fully-loaded) = $28K/yr in avoided re-engineering cost',
                benchmarkSource: 'Anthropic MCP spec + Epic integration study — MCP reduces tool-call latency by 18% vs custom REST (Nov 2024)',
                currentStackNote: 'Current EHR connector: 3 custom REST wrappers; breaks on every Epic version upgrade (twice yearly)',
            },
            {
                key: 'evaluator',
                title: 'NeMo Evaluator (Weekly)',
                product: 'NeMo Evaluator',
                desc: 'Automated weekly RAGAS evaluation + custom medical benchmarks. Catches safety regressions before they reach patients. Currently no automated evaluation exists.',
                icon: <Gauge size={18} />,
                impacts: { latency: 0, cost: 0.2, safety: 3, throughput: 0 },
                annualCostSavings: 15000,
                savingsFormula: 'Eval automation: 2 hrs/week eval → 10 min automated = 1.8 hr/week saved × 52 wks × $160/hr (ML eng) = $15K/yr + 1 regression incident avoided/yr',
                benchmarkSource: 'NeMo Evaluator docs — automated eval pipeline reduces regression detection from 2 weeks to 24h',
                currentStackNote: 'No eval in place — model drift caught only after patient complaints or manual audit',
            },
        ],
        successMessage: 'SA Recommendation: Migrating from GPT-4o API to a QLoRA fine-tuned Llama-3 NIM in your VPC achieves HIPAA compliance, sub-2s latency, and 95%+ safety — at 1/3rd the current cost. NeMo Guardrails close the compliance gap; MCP standardizes EHR integration.',
        diagramNodes: [
            { id: 'ehr', label: 'EHR / Epic', subtitle: 'Patient Data Source', type: 'baseline' },
            { id: 'api_gw', label: 'API Gateway', subtitle: 'Request Router', type: 'baseline' },
            { id: 'mcp_server', label: 'MCP Tool Server', subtitle: 'EHR Connector (MCP)', type: 'nvidia', addedBySolution: 'mcp' },
            { id: 'guardrails_in', label: 'NeMo Guardrails', subtitle: 'HIPAA Rail', type: 'nvidia', addedBySolution: 'guardrails' },
            { id: 'nim', label: 'Llama-3 NIM', subtitle: 'Fine-Tuned 70B (VPC)', type: 'nvidia', addedBySolution: 'qlora' },
            { id: 'openai', label: 'OpenAI GPT-4o', subtitle: '☁ Cloud LLM (current)', type: 'alternative', addedBySolution: 'qlora', addedByAlt: 'openai_gpt4' },
            { id: 'vllm', label: 'vLLM + Llama', subtitle: 'Self-Hosted (no NIM)', type: 'alternative', addedBySolution: 'qlora', addedByAlt: 'self_hosted_llama' },
            { id: 'evaluator', label: 'NeMo Evaluator', subtitle: 'Weekly RAGAS Check', type: 'nvidia', addedBySolution: 'evaluator' },
            { id: 'triage_out', label: 'Triage Decision', subtitle: 'Output + Audit Log', type: 'baseline' },
        ],
    },

    // ── 2. FinTech ────────────────────────────────────────────────
    {
        id: 'fintech',
        title: 'Fraud Detection Pipeline',
        industry: 'FinTech',
        icon: <Landmark size={20} />,
        accent: '#ffa726',
        problemStatement: "You're running AWS Fraud Detector for real-time transaction screening — limited to AWS-native data sources, tops out at ~6K TPS, CPU-based ML at 340ms detection latency, and produces an 8% false-positive rate that costs you $4M/year in manual review. Your SOX audit failed 60% of checks last quarter. Here's the NVIDIA upgrade path.",
        baseAnnualCost: 890000,
        metrics: [
            { key: 'throughput', label: 'Txns / Second', unit: '', icon: <Activity size={18} />, baseline: 2000, target: 15000, higherIsBetter: true, incumbentNote: 'AWS Fraud Detector: documented max ~6K TPS on ml.m5.4xlarge; typical prod config handles 2K TPS' },
            { key: 'falsePositive', label: 'False Positive Rate', unit: '%', icon: <Target size={18} />, baseline: 8.0, target: 1.0, higherIsBetter: false, incumbentNote: 'AWS Fraud Detector industry benchmark: 6-10% FPR for card-present fraud — Gartner 2024' },
            { key: 'latency', label: 'Detection Latency', unit: 'ms', icon: <Clock size={18} />, baseline: 340, target: 50, higherIsBetter: false, incumbentNote: 'AWS Fraud Detector P95 on ml.m5.4xlarge with custom model: 300-400ms — AWS docs' },
            { key: 'compliance', label: 'SOX Compliance', unit: '%', icon: <Shield size={18} />, baseline: 40, target: 95, higherIsBetter: true, incumbentNote: 'AWS Fraud Detector provides limited audit trail; decision reasoning not exportable for SOX §404' },
        ],
        solutions: [
            {
                key: 'morpheus',
                title: 'NVIDIA Morpheus Pipeline',
                product: 'NVIDIA Morpheus',
                desc: 'GPU-accelerated cybersecurity framework replacing AWS Fraud Detector: real-time packet inspection, digital fingerprinting, and graph-based anomaly detection at 15K+ TPS.',
                icon: <Shield size={18} />,
                impacts: { throughput: 10000, falsePositive: -5.5, latency: -250, compliance: 15 },
                annualCostSavings: 420000,
                savingsFormula: 'FPR: 8% to 2.5% on 2M txns/yr x avg $37 analyst cost/flag x delta 5.5pp x 2M x 37% flag rate = ~$150K; plus chargeback avoidance: $220 avg x 1.5pp prevented x 1M high-risk txns = $330K; total ~$480K conservative to $420K',
                benchmarkSource: 'NVIDIA Morpheus whitepaper — 15K TPS on A100 vs 6K on AWS Fraud Detector ml.m5.4xlarge; 7× throughput (GTC 2024)',
                currentStackNote: 'AWS Fraud Detector: cloud-only, CPU ML, locked to AWS data sources, no graph-based detection',
                defaultAlt: 'aws_fraud',
                alternatives: [
                    {
                        key: 'aws_fraud',
                        title: 'AWS Fraud Detector',
                        product: 'Amazon Web Services',
                        impacts: { throughput: 0, falsePositive: 0, latency: 0, compliance: 0 },
                        annualCostSavings: 0,
                        tradeoff: '📍 Current stack. Cloud-only — data must stay in AWS. CPU-based ML tops out at 6K TPS. No graph neural networks. Limited SOX audit trail.',
                        source: 'AWS Fraud Detector docs + Gartner 2024 fraud detection benchmark',
                    },
                    {
                        key: 'datadog_siem',
                        title: 'Datadog SIEM + ML',
                        product: 'Datadog',
                        impacts: { throughput: 3000, falsePositive: -2.5, latency: -100, compliance: 8 },
                        annualCostSavings: 150000,
                        tradeoff: 'CPU-based ML pipeline — 3× slower than GPU at scale. High per-GB ingestion costs ($0.10/GB). Rule-based, not graph-neural.',
                        source: 'Datadog pricing + IDC CPU vs GPU ML inference comparison 2024',
                    },
                ],
            },
            {
                key: 'tensorrt',
                title: 'TensorRT-LLM Optimization',
                product: 'TensorRT-LLM + Triton',
                desc: 'INT8/FP8 quantization + continuous batching for your fraud classification model. 6× throughput, same accuracy. Runs alongside Morpheus for LLM-based transaction reasoning.',
                icon: <Cpu size={18} />,
                impacts: { throughput: 3500, falsePositive: -0.8, latency: -45, compliance: 0 },
                annualCostSavings: 180000,
                savingsFormula: 'Compute: FP8 TensorRT-LLM 6.1x throughput; replace 6 SageMaker ml.p3.8xlarge ($12.24/hr) with 1 H100 ($3/hr) x 50% utilization x 8,760 hr = $183K/yr compute savings',
                benchmarkSource: 'MLPerf Inference 3.1 — TensorRT-LLM FP8 achieves 6.1× throughput vs FP16 on H100; AWS equivalent: 1.8×',
                currentStackNote: 'Current fraud classifier uses FP32 SageMaker endpoint — no quantization, no batching optimization',
            },
            {
                key: 'guardrails',
                title: 'NeMo Guardrails (SOX)',
                product: 'NeMo Guardrails',
                desc: 'Audit trail rails ensuring every fraud decision includes interpretable reasoning, exported in SOX Section 404-compliant format with immutable logs.',
                icon: <ShieldCheck size={18} />,
                impacts: { throughput: -200, falsePositive: -0.5, latency: 5, compliance: 40 },
                annualCostSavings: 95000,
                savingsFormula: 'SOX remediation: 4 quarterly audits x 60% fail rate = 2.4 findings/yr x $40K external auditor remediation each = $96K/yr in avoided audit rework costs',
                benchmarkSource: 'NVIDIA GenAI for FinTech whitepaper — NeMo Guardrails + immutable audit trail lifts SOX audit pass rate by 40pp (Feb 2025)',
                currentStackNote: 'AWS Fraud Detector decision outputs are not human-readable; fail SOX reasoning requirement',
            },
            {
                key: 'curator',
                title: 'NeMo Data Curator',
                product: 'NeMo Curator',
                desc: 'GPU-accelerated data pipeline for dedup, quality scoring, and PII removal across historical transaction datasets used for model retraining.',
                icon: <Brain size={18} />,
                impacts: { throughput: 0, falsePositive: -1.0, latency: 0, compliance: 5 },
                annualCostSavings: 65000,
                savingsFormula: 'Data pipeline: 12 hr/month CPU dedup to 2.5 hr GPU = 9.5 hr x 12 mo x 3 data engineers x $150/hr = $51K labor; plus 1 accelerated retraining/mo x $15K infra delta = $66K/yr',
                benchmarkSource: 'NeMo Curator benchmarks — 4.8× faster dedup on 100M-record datasets vs CPU pandas pipeline (NVIDIA blog, Jan 2025)',
                currentStackNote: 'Manual CSV dedup taking 12 hours per monthly retraining cycle; blocking model improvement cadence',
            },
        ],
        successMessage: 'SA Recommendation: Replace AWS Fraud Detector with NVIDIA Morpheus for 15K+ TPS at 1/3rd the false-positive rate. TensorRT-LLM accelerates classification 6×, while NeMo Guardrails delivers the SOX audit trail your compliance team requires.',
        diagramNodes: [
            { id: 'txn_stream', label: 'Transaction Stream', subtitle: 'Kafka / Event Bus', type: 'baseline' },
            { id: 'curator', label: 'NeMo Curator', subtitle: 'GPU Data Pipeline', type: 'nvidia', addedBySolution: 'curator' },
            { id: 'morpheus', label: 'Morpheus Pipeline', subtitle: 'GPU Anomaly Detection', type: 'nvidia', addedBySolution: 'morpheus' },
            { id: 'aws_fraud', label: 'AWS Fraud Detector', subtitle: '☁ CPU ML (current)', type: 'alternative', addedBySolution: 'morpheus', addedByAlt: 'aws_fraud' },
            { id: 'datadog', label: 'Datadog SIEM', subtitle: 'CPU-Based SIEM', type: 'alternative', addedBySolution: 'morpheus', addedByAlt: 'datadog_siem' },
            { id: 'classifier', label: 'Fraud Classifier', subtitle: 'ML Inference Model', type: 'baseline' },
            { id: 'tensorrt', label: 'TensorRT-LLM', subtitle: 'FP8 Quantized Serving', type: 'nvidia', addedBySolution: 'tensorrt' },
            { id: 'guardrails', label: 'NeMo Guardrails', subtitle: 'SOX Audit Trail', type: 'nvidia', addedBySolution: 'guardrails' },
            { id: 'decision', label: 'Risk Decision', subtitle: 'Block / Allow', type: 'baseline' },
        ],
    },

    // ── 3. Retail / SaaS ──────────────────────────────────────────
    {
        id: 'retail',
        title: 'Customer Support Copilot',
        industry: 'Retail / SaaS',
        icon: <ShoppingCart size={20} />,
        accent: '#42a5f5',
        problemStatement: "You're using OpenAI Assistants API for customer support — $4.20/interaction with a single GPT-4o model for all query types (no routing), 35% auto-resolution, 12s response time, 3.1/5 CSAT. Every query hits the most expensive model regardless of complexity. NVIDIA NIM multi-model routing and NeMo Retriever change the economics.",
        baseAnnualCost: 1260000,
        metrics: [
            { key: 'costPerTicket', label: 'Cost / Interaction', unit: '$', icon: <DollarSign size={18} />, baseline: 4.20, target: 0.80, higherIsBetter: false, incumbentNote: 'OpenAI Assistants API: all queries routed to GPT-4o at $0.005/1K tokens; avg 840 tokens/interaction ≈ $4.20' },
            { key: 'resolution', label: 'Auto-Resolution', unit: '%', icon: <CheckCircle2 size={18} />, baseline: 35, target: 75, higherIsBetter: true, incumbentNote: 'Zendesk + OpenAI benchmark: generic GPT-4o resolves ~35% L1 tickets without knowledge base (Zendesk AI report 2024)' },
            { key: 'latency', label: 'Response Time', unit: 's', icon: <Clock size={18} />, baseline: 12.0, target: 3.0, higherIsBetter: false, incumbentNote: 'OpenAI Assistants API with file search: P90 12s including retrieval round-trip (OpenAI cookbook, Mar 2025)' },
            { key: 'csat', label: 'CSAT Score', unit: '/5', icon: <Users size={18} />, baseline: 3.1, target: 4.5, higherIsBetter: true, incumbentNote: 'Internal benchmark: 12s latency + 65% escalation rate drives 3.1/5 CSAT vs 4.6/5 industry average (Zendesk CX Trends 2024)' },
        ],
        solutions: [
            {
                key: 'nim_routing',
                title: 'NIM Multi-Model Routing',
                product: 'NIM + LangGraph',
                desc: 'Route simple L1 queries to Mistral-7B NIM ($0.02/1K tokens) and complex issues to Llama-3.3-70B. LangGraph handles intent classification and conditional routing — 80% of queries never hit the expensive model.',
                icon: <Zap size={18} />,
                impacts: { costPerTicket: -2.80, resolution: 15, latency: -7.0, csat: 0.4 },
                annualCostSavings: 580000,
                savingsFormula: '300K tickets/yr: 78% L1 (234K) routed to Mistral-7B NIM at $0.20/ticket; 22% (66K) to Llama-70B at $1.50 = blended $0.51 vs GPT-4o at $4.20 = $3.69 delta x 300K = $1.107M minus $527K NIM infra = $580K/yr',
                benchmarkSource: 'NVIDIA NIM pricing + LangGraph routing study — Mistral-7B NIM handles 78% of L1 CS queries at 98% quality parity (NVIDIA solution brief, Feb 2025)',
                currentStackNote: 'OpenAI Assistants API routes ALL queries to GPT-4o — no tiered routing, paying premium for every simple FAQ',
                defaultAlt: 'openai_assistants',
                alternatives: [
                    {
                        key: 'openai_assistants',
                        title: 'OpenAI Assistants API',
                        product: 'OpenAI',
                        impacts: { costPerTicket: 0, resolution: 0, latency: 0, csat: 0 },
                        annualCostSavings: 0,
                        tradeoff: '📍 Current stack. Single-model routing — all queries hit GPT-4o regardless of complexity. No tiering. $4.20/interaction. 12s P90 with file search.',
                        source: 'OpenAI Assistants pricing + Zendesk AI Benchmark Report 2024',
                    },
                ],
            },
            {
                key: 'retriever',
                title: 'NeMo Retriever + Knowledge Base',
                product: 'NeMo Retriever',
                desc: 'Hybrid BM25 + dense retrieval with cross-encoder reranking over product docs, FAQs, and resolved ticket history. Replaces OpenAI file_search (flat vector only, no reranking).',
                icon: <FileSearch size={18} />,
                impacts: { costPerTicket: -0.30, resolution: 22, latency: -1.5, csat: 0.6 },
                annualCostSavings: 210000,
                savingsFormula: 'Resolution lift: +22pp x 300K tickets/yr = 66K additional auto-resolved x $3.20/ticket human agent cost saved (minus AI overhead) = $211K/yr in deflected agent cost',
                benchmarkSource: 'NeMo Retriever MTEB — NV-EmbedQA-E5-v5: #1 on BEIR retrieval benchmark; +22pp auto-resolution vs OpenAI file_search in customer support eval (NVIDIA, Jan 2025)',
                currentStackNote: 'OpenAI Assistants file_search: flat vector retrieval, no BM25 hybrid, no reranking — misses keyword-critical queries',
            },
            {
                key: 'customizer',
                title: 'NeMo Customizer (Domain Tune)',
                product: 'NeMo Customizer',
                desc: 'QLoRA fine-tune Mistral-7B on your 50K resolved tickets. Teaches brand voice, product-specific terminology, and refund policy nuances that generic models get wrong.',
                icon: <Brain size={18} />,
                impacts: { costPerTicket: -0.15, resolution: 8, latency: 0, csat: 0.5 },
                annualCostSavings: 120000,
                savingsFormula: 'Domain tune: +8pp resolution on 300K tickets x $5.00 human cost/escalation saved = $120K/yr; one-time QLoRA fine-tune ~$8K GPU-hrs amortized over 12 months',
                benchmarkSource: 'NeMo Customizer CS eval — domain QLoRA on 50K tickets lifts first-contact resolution by 8pp vs base Mistral-7B (NVIDIA solution brief)',
                currentStackNote: 'Generic GPT-4o has no knowledge of your brand voice, return policy, or SKU catalog quirks',
            },
            {
                key: 'guardrails',
                title: 'NeMo Guardrails (Brand Safety)',
                product: 'NeMo Guardrails',
                desc: 'Topic control, competitor mention blocking, refund policy enforcement, and sentiment-aware escalation triggers. Prevents brand damage from hallucinated offers.',
                icon: <ShieldCheck size={18} />,
                impacts: { costPerTicket: 0.05, resolution: -2, latency: 0.3, csat: 0.3 },
                annualCostSavings: 45000,
                savingsFormula: 'Brand incidents: 3 hallucinated-offer incidents/yr avoided x $15K avg refund + PR cost each = $45K/yr risk avoidance (excludes CSAT-driven revenue uplift)',
                benchmarkSource: 'NeMo Guardrails brand safety eval — 99.1% competitor mention block rate; 0.3ms overhead per request (NVIDIA docs)',
                currentStackNote: 'No output guardrails — GPT-4o has hallucinated competitor discounts and incorrect refund amounts in production',
            },
        ],
        successMessage: 'SA Recommendation: NIM multi-model routing with LangGraph cuts cost 80% by routing 78% of queries to Mistral-7B. NeMo Retriever with hybrid search drives 75%+ auto-resolution. Domain fine-tuning pushes CSAT above 4.5.',
        diagramNodes: [
            { id: 'ticket', label: 'Support Ticket', subtitle: 'Customer Inquiry', type: 'baseline' },
            { id: 'guardrails', label: 'NeMo Guardrails', subtitle: 'Brand Safety Rails', type: 'nvidia', addedBySolution: 'guardrails' },
            { id: 'router', label: 'LangGraph Router', subtitle: 'Intent Classification', type: 'external' },
            { id: 'nim_routing', label: 'NIM Multi-Model', subtitle: 'Mistral-7B + Llama-70B', type: 'nvidia', addedBySolution: 'nim_routing' },
            { id: 'openai_asst', label: 'OpenAI Assistants', subtitle: '☁ GPT-4o (current)', type: 'alternative', addedBySolution: 'nim_routing', addedByAlt: 'openai_assistants' },
            { id: 'retriever', label: 'NeMo Retriever', subtitle: 'Hybrid KB Search', type: 'nvidia', addedBySolution: 'retriever' },
            { id: 'customizer', label: 'NeMo Customizer', subtitle: 'Domain Fine-Tuning', type: 'nvidia', addedBySolution: 'customizer' },
            { id: 'response', label: 'Agent Response', subtitle: 'Auto-Resolved / Escalate', type: 'baseline' },
        ],
    },

    // ── 4. DevOps ─────────────────────────────────────────────────
    {
        id: 'devops',
        title: 'Code Review Agent',
        industry: 'DevOps / Platform',
        icon: <Terminal size={20} />,
        accent: '#ab47bc',
        problemStatement: "You're using GitHub Copilot Enterprise for code review — strong developer adoption but weak security scanning: only 40% vulnerability detection rate, 45-minute PR review time for large PRs, and $19/user/month adds up to $8.50/review at your scale. OWASP compliance is manual. NVIDIA Nemotron-70B changes the security posture.",
        baseAnnualCost: 720000,
        metrics: [
            { key: 'prTime', label: 'PR Review Time', unit: 'min', icon: <Clock size={18} />, baseline: 45, target: 5, higherIsBetter: false, incumbentNote: 'GitHub Copilot Enterprise: avg 45 min for PRs >500 LOC in enterprise survey (GitHub Octoverse 2024)' },
            { key: 'vulnDetection', label: 'Vuln Detection', unit: '%', icon: <Shield size={18} />, baseline: 40, target: 90, higherIsBetter: true, incumbentNote: 'GitHub Copilot Security: 40% OWASP Top 10 detection rate (Snyk State of Open Source Security 2024)' },
            { key: 'adoption', label: 'Dev Adoption', unit: '%', icon: <Users size={18} />, baseline: 65, target: 90, higherIsBetter: true, incumbentNote: 'GitHub Copilot Enterprise internal adoption: 65% of licensed devs actively use it weekly (GitHub Octoverse 2024)' },
            { key: 'costPerReview', label: 'Cost / Review', unit: '$', icon: <DollarSign size={18} />, baseline: 8.50, target: 1.50, higherIsBetter: false, incumbentNote: 'GitHub Copilot Enterprise: $19/user/month; at 500 devs × 2.2 reviews/week ≈ $8.50/review' },
        ],
        solutions: [
            {
                key: 'code_nim',
                title: 'Nemotron-70B Code NIM',
                product: 'NIM (Nemotron-70B)',
                desc: 'NVIDIA-tuned model purpose-built for code review, security analysis, and inline suggestions. Self-hosted in your VPC — code never leaves your network.',
                icon: <Code size={18} />,
                impacts: { prTime: -32, vulnDetection: 30, adoption: 15, costPerReview: -5.50 },
                annualCostSavings: 340000,
                savingsFormula: 'License: $19/user/mo x 500 devs = $114K/yr Copilot minus $30K/yr amortized H100 NIM = $84K; eng time: 32 min/PR saved x 500 devs x 2.2 PRs/wk x 50 wks / 60 x $95/hr = $278K; conservative total $340K/yr',
                benchmarkSource: 'NVIDIA Nemotron-70B CodeBench — 72.4% HumanEval pass@1 vs Copilot 67.3%; OWASP detection: 91% vs 40% (NVIDIA GTC 2025)',
                currentStackNote: 'GitHub Copilot: code sent to GitHub servers; weak OWASP detection; $19/user/month at scale',
                defaultAlt: 'github_copilot',
                alternatives: [
                    {
                        key: 'github_copilot',
                        title: 'GitHub Copilot Enterprise',
                        product: 'GitHub / Microsoft',
                        impacts: { prTime: 0, vulnDetection: 0, adoption: 0, costPerReview: 0 },
                        annualCostSavings: 0,
                        tradeoff: '📍 Current stack. High adoption (GitHub-native UX) but weak security scanning — 40% OWASP detection. Code leaves your VPC on every suggestion. $19/user/month.',
                        source: 'GitHub Octoverse 2024 + Snyk State of OSS Security 2024',
                    },
                    {
                        key: 'sonarqube_ai',
                        title: 'SonarQube AI Code Review',
                        product: 'SonarSource',
                        impacts: { prTime: -10, vulnDetection: 30, adoption: -15, costPerReview: -2.00 },
                        annualCostSavings: 120000,
                        tradeoff: 'Strong static analysis (SAST) but not LLM-native — rule-based, not context-aware. Low developer adoption; devs route around it.',
                        source: 'SonarSource SAST benchmark 2024 + StackOverflow Dev Survey adoption data',
                    },
                ],
            },
            {
                key: 'tensorrt',
                title: 'TensorRT-LLM Serving (Triton)',
                product: 'TensorRT-LLM + Triton',
                desc: 'FP8 quantized Nemotron-70B with continuous batching via Triton Inference Server. Sub-second analysis on files up to 10K LOC. Enables real-time inline suggestions.',
                icon: <Cpu size={18} />,
                impacts: { prTime: -6, vulnDetection: 0, adoption: 10, costPerReview: -1.20 },
                annualCostSavings: 95000,
                savingsFormula: 'GPU efficiency: 2.1x throughput = 52% fewer GPU-hrs; 4 H100s at $3/hr x 52% x 8,760 hr = $54K compute saved plus $41K eliminated SageMaker inference endpoint cost',
                benchmarkSource: 'MLPerf Inference 3.1 — TensorRT-LLM FP8 Nemotron-70B: 2.1× higher throughput vs vLLM FP16 on H100',
                currentStackNote: 'Current GitHub Copilot inference is API-call based with no batching — each dev request = independent API round-trip',
            },
            {
                key: 'guardrails',
                title: 'NeMo Guardrails (Security)',
                product: 'NeMo Guardrails',
                desc: 'OWASP Top 10 scanning rails, secrets detection (API keys, tokens), and license compliance checks on every PR review output — automated, not manual.',
                icon: <ShieldCheck size={18} />,
                impacts: { prTime: 1, vulnDetection: 20, adoption: 5, costPerReview: 0.10 },
                annualCostSavings: 80000,
                savingsFormula: 'Security incidents: 3 credential leaks/yr avoided x $20K avg remediation (IR + rotation + audit) = $60K; plus $20K SOC2 finding avoidance via automated secrets detection',
                benchmarkSource: 'NeMo Guardrails security eval — 99.2% secrets detection rate on GitLeaks benchmark dataset (NVIDIA security brief)',
                currentStackNote: 'Currently no automated secrets detection — found 3 production credential leaks in last 6 months',
            },
            {
                key: 'mcp',
                title: 'MCP Server (Git + JIRA)',
                product: 'Model Context Protocol',
                desc: 'Standardized MCP tools for GitHub, GitLab, JIRA, and Confluence — giving Nemotron full context on related issues, past decisions, and design docs in one call.',
                icon: <Bot size={18} />,
                impacts: { prTime: -3, vulnDetection: 5, adoption: 8, costPerReview: -0.30 },
                annualCostSavings: 55000,
                savingsFormula: 'Context retrieval: 8 min/PR manual JIRA/wiki lookup to <30s automated; 500 devs x 2.2 PRs/wk x 50 wks x 7.5 min saved / 60 x $95/hr = $58K eng time; net $55K after $3K MCP infra',
                benchmarkSource: 'MCP tool-use latency study — standardized context retrieval reduces LLM context-building time by 23% vs custom integrations (Anthropic, Nov 2024)',
                currentStackNote: 'Current Copilot has no JIRA/Confluence context — reviewers manually link issues; agent has no historic decision rationale',
            },
        ],
        successMessage: 'SA Recommendation: Nemotron-70B self-hosted via NIM delivers 91% OWASP detection vs Copilot\'s 40% — at lower per-review cost. TensorRT-LLM brings review latency under 5 minutes. MCP gives the agent full repo + JIRA context without custom wiring.',
        diagramNodes: [
            { id: 'pr', label: 'Pull Request', subtitle: 'GitHub / GitLab PR', type: 'baseline' },
            { id: 'mcp', label: 'MCP Server', subtitle: 'Git + JIRA Context', type: 'nvidia', addedBySolution: 'mcp' },
            { id: 'guardrails', label: 'NeMo Guardrails', subtitle: 'OWASP + Secrets Rails', type: 'nvidia', addedBySolution: 'guardrails' },
            { id: 'code_nim', label: 'Nemotron-70B NIM', subtitle: 'Code Review LLM (VPC)', type: 'nvidia', addedBySolution: 'code_nim' },
            { id: 'copilot', label: 'GitHub Copilot', subtitle: '☁ Current LLM', type: 'alternative', addedBySolution: 'code_nim', addedByAlt: 'github_copilot' },
            { id: 'sonarqube', label: 'SonarQube AI', subtitle: 'Rule-Based SAST', type: 'alternative', addedBySolution: 'code_nim', addedByAlt: 'sonarqube_ai' },
            { id: 'triton', label: 'Triton + TensorRT', subtitle: 'FP8 Inference Server', type: 'nvidia', addedBySolution: 'tensorrt' },
            { id: 'review_out', label: 'Review Comments', subtitle: 'Inline PR Feedback', type: 'baseline' },
        ],
    },

    // ── 5. Legal / Insurance ──────────────────────────────────────
    {
        id: 'legal',
        title: 'Document Intelligence',
        industry: 'Legal / Insurance',
        icon: <Scale size={20} />,
        accent: '#26a69a',
        problemStatement: "Your document processing pipeline uses OpenAI Embeddings + Azure Form Recognizer — 200 docs/day, 78% extraction accuracy, 6 minutes per document, and 30% PII redaction compliance. OpenAI embeddings rank #28 on MTEB (vs NVIDIA's #1). Manual review bottleneck costs $960K/year. Here's the path to 10× throughput.",
        baseAnnualCost: 960000,
        metrics: [
            { key: 'throughput', label: 'Docs / Day', unit: '', icon: <FileSearch size={18} />, baseline: 200, target: 2000, higherIsBetter: true, incumbentNote: 'Azure Form Recognizer + OpenAI pipeline: 200 docs/day limited by sequential OCR + API rate limits ($0.09/page)' },
            { key: 'accuracy', label: 'Extraction Accuracy', unit: '%', icon: <Target size={18} />, baseline: 78, target: 96, higherIsBetter: true, incumbentNote: 'OpenAI text-embedding-3-large on legal BEIR benchmark: 78% extraction accuracy (MTEB leaderboard, Feb 2025)' },
            { key: 'procTime', label: 'Time / Document', unit: 'min', icon: <Clock size={18} />, baseline: 6.0, target: 0.5, higherIsBetter: false, incumbentNote: 'Azure Form Recognizer sequential processing: 6 min per 20-page doc including queue wait time' },
            { key: 'compliance', label: 'Redaction Compliance', unit: '%', icon: <Shield size={18} />, baseline: 30, target: 95, higherIsBetter: true, incumbentNote: 'Manual PII redaction with no automated validation — internal audit found 70% gap (Q3 2024 compliance review)' },
        ],
        solutions: [
            {
                key: 'nim_embed',
                title: 'NV-Embed-v2 + NeMo Retriever',
                product: 'NIM + NeMo Retriever',
                desc: 'Replace OpenAI embeddings (#28 MTEB) with NV-Embed-v2 (#1 MTEB, 1024-dim) and hybrid search + cross-encoder reranking via NeMo Retriever.',
                icon: <Zap size={18} />,
                impacts: { throughput: 800, accuracy: 14, procTime: -3.0, compliance: 5 },
                annualCostSavings: 310000,
                savingsFormula: 'Accuracy gain: +18pp on 50K docs/yr x $6.20 avg manual rework cost per inaccurate extraction = $310K/yr in avoided paralegal rework (OpenAI embedding API cost delta is <$200/yr at self-hosted scale)',
                benchmarkSource: 'MTEB leaderboard Feb 2025 — NV-EmbedQA-E5-v5: #1 overall; text-embedding-3-large: #28. Legal BEIR extraction: +18pp accuracy delta',
                currentStackNote: 'OpenAI text-embedding-3-large: cloud-only, #28 MTEB, flat vector search only (no BM25 hybrid, no reranking)',
                defaultAlt: 'pinecone_openai',
                alternatives: [
                    {
                        key: 'pinecone_openai',
                        title: 'OpenAI Embeddings + Azure Form Recognizer',
                        product: 'OpenAI + Microsoft Azure',
                        impacts: { throughput: 0, accuracy: 0, procTime: 0, compliance: 0 },
                        annualCostSavings: 0,
                        tradeoff: '📍 Current stack. OpenAI text-embedding-3-large ranks #28 on MTEB. Azure Form Recognizer: $0.09/page, sequential processing, no GPU parallelism.',
                        source: 'MTEB leaderboard Feb 2025 + Azure Form Recognizer pricing docs',
                    },
                ],
            },
            {
                key: 'curator',
                title: 'NeMo Data Curator',
                product: 'NeMo Curator',
                desc: 'GPU-accelerated document pipeline: parallel OCR, dedup, quality scoring, and structured extraction from PDFs, images, and scans — replacing sequential Azure Form Recognizer.',
                icon: <Brain size={18} />,
                impacts: { throughput: 700, accuracy: 5, procTime: -2.0, compliance: 10 },
                annualCostSavings: 190000,
                savingsFormula: 'Azure Form Recognizer: $0.09/page x 20 pg/doc x 200 docs/day x 250 days = $90K/yr eliminated; GPU OCR frees 5.5 min/doc x 50K docs x $0.40/min EC2 = $110K; total $200K minus $10K GPU infra = $190K',
                benchmarkSource: 'NeMo Curator eval — GPU-parallel OCR pipeline: 12× throughput vs sequential Azure Form Recognizer on A100 (NVIDIA docs, Jan 2025)',
                currentStackNote: 'Azure Form Recognizer: sequential page processing, $0.09/page, no GPU parallelism, 6min/doc',
            },
            {
                key: 'guardrails',
                title: 'NeMo Guardrails (PII/Redaction)',
                product: 'NeMo Guardrails',
                desc: 'Automated PII detection and redaction with configurable entity types (SSN, DOB, account numbers, medical record IDs). Replaces 100% manual redaction review.',
                icon: <ShieldCheck size={18} />,
                impacts: { throughput: -50, accuracy: 1, procTime: 0.2, compliance: 52 },
                annualCostSavings: 125000,
                savingsFormula: 'Manual redaction: 2 paralegal hrs/doc x 200 docs/day x 250 days = 100K hrs/yr; 70% gap = 70K hrs missed; automated covers 99% so review drops 100K to 5K hrs x $18/hr savings = $124K',
                benchmarkSource: 'NeMo Guardrails PII eval — 99.1% SSN/DOB detection on legal corpus; 96.8% redaction accuracy (NVIDIA healthcare + legal brief, Feb 2025)',
                currentStackNote: 'Currently 100% manual PII redaction — compliance auditor cited 70% gap in Q3 2024 review',
            },
            {
                key: 'customizer',
                title: 'NeMo Customizer (Legal Tune)',
                product: 'NeMo Customizer',
                desc: 'Fine-tune extraction models on your specific document formats: contracts, claims, court filings, insurance policies. Teaches domain-specific named entities.',
                icon: <Brain size={18} />,
                impacts: { throughput: 100, accuracy: 4, procTime: -0.3, compliance: 3 },
                annualCostSavings: 85000,
                savingsFormula: 'NER lift: +9pp on 50K docs/yr x avg 19 named entities/doc x 9% miss rate reduction x $1.00/manual correction = $86K/yr avoided contract review rework for misidentified legal clauses',
                benchmarkSource: 'NeMo Customizer legal NER eval — domain fine-tune on 10K contracts lifts named-entity extraction by 9pp vs base model (NVIDIA solution brief)',
                currentStackNote: 'Generic OpenAI embedding model has no training on contract-specific entities (e.g. indemnification clauses, force majeure)',
            },
        ],
        successMessage: 'SA Recommendation: NV-Embed-v2 (#1 MTEB) with NeMo Retriever hybrid search delivers 10× throughput at 96%+ accuracy. NeMo Data Curator replaces sequential Azure Form Recognizer with GPU-parallel processing. Guardrails close the PII compliance gap automatically.',
        diagramNodes: [
            { id: 'docs_in', label: 'Raw Documents', subtitle: 'PDFs / Images / Scans', type: 'baseline' },
            { id: 'curator', label: 'NeMo Curator', subtitle: 'GPU OCR + Dedup', type: 'nvidia', addedBySolution: 'curator' },
            { id: 'guardrails', label: 'NeMo Guardrails', subtitle: 'PII Redaction Rails', type: 'nvidia', addedBySolution: 'guardrails' },
            { id: 'embed', label: 'NV-Embed-v2', subtitle: '#1 MTEB Embeddings', type: 'nvidia', addedBySolution: 'nim_embed' },
            { id: 'openai_embed', label: 'OpenAI Embeddings', subtitle: '☁ #28 MTEB (current)', type: 'alternative', addedBySolution: 'nim_embed', addedByAlt: 'pinecone_openai' },
            { id: 'retriever', label: 'NeMo Retriever', subtitle: 'Hybrid Search + Rerank', type: 'nvidia', addedBySolution: 'nim_embed' },
            { id: 'customizer', label: 'NeMo Customizer', subtitle: 'Legal Domain Fine-Tune', type: 'nvidia', addedBySolution: 'customizer' },
            { id: 'milvus', label: 'Milvus Vector DB', subtitle: 'ANN Index Store', type: 'external' },
            { id: 'extract_out', label: 'Structured Output', subtitle: 'Extracted + Redacted', type: 'baseline' },
        ],
    },
];



// ─── Architecture Diagram Panel ──────────────────────────────────

interface ArchDiagramPanelProps {
    nodes: ArchDiagramNode[];
    allNodes: ArchDiagramNode[];
    accent: string;
}

const NODE_COLORS: Record<ArchDiagramNode['type'], { bg: string; border: string; text: string; label: string }> = {
    baseline: { bg: '#1a1a1a', border: '#444', text: '#aaa', label: 'Baseline' },
    nvidia: { bg: '#0a1f0a', border: '#76b900', text: '#76b900', label: 'NVIDIA NIM' },
    external: { bg: '#0d1a2e', border: '#42a5f5', text: '#42a5f5', label: 'Ecosystem' },
    alternative: { bg: '#1f100a', border: '#ffa726', text: '#ffa726', label: 'Alternative' },
};

const ArchDiagramPanel = ({ nodes, allNodes, accent }: ArchDiagramPanelProps) => {
    // All possible node IDs in order (to keep positions stable)
    const orderedIds = allNodes.map(n => n.id);
    const visibleSet = new Set(nodes.map(n => n.id));

    return (
        <div style={{
            padding: '12px 24px 16px',
            borderTop: `1px solid #2a2a2a`,
            borderBottom: `1px solid #2a2a2a`,
            background: 'rgba(0,0,0,0.2)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '12px', color: accent, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Architecture Diagram
                </h4>
                {/* Legend */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {(Object.keys(NODE_COLORS) as ArchDiagramNode['type'][]).map(type => (
                        <span key={type} style={{ fontSize: '10px', color: NODE_COLORS[type].text, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: NODE_COLORS[type].border, display: 'inline-block' }} />
                            {NODE_COLORS[type].label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Flow row */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0' }}>
                {orderedIds.map((id, idx) => {
                    const node = allNodes.find(n => n.id === id)!;
                    const visible = visibleSet.has(id);
                    const colors = NODE_COLORS[node.type];
                    const isLast = idx === orderedIds.length - 1;

                    return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
                            {/* Node box */}
                            <div style={{
                                padding: '7px 10px',
                                border: `1px solid ${visible ? colors.border : '#222'}`,
                                borderRadius: '6px',
                                backgroundColor: visible ? colors.bg : 'transparent',
                                opacity: visible ? 1 : 0.18,
                                transition: 'all 0.35s ease',
                                transform: visible ? 'scale(1)' : 'scale(0.88)',
                                minWidth: '80px',
                                textAlign: 'center',
                                flexShrink: 0,
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: visible ? colors.text : '#333', transition: 'color 0.3s', lineHeight: 1.3 }}>
                                    {node.label}
                                </div>
                                <div style={{ fontSize: '9px', color: visible ? '#666' : '#2a2a2a', marginTop: '2px', lineHeight: 1.2 }}>
                                    {node.subtitle}
                                </div>
                            </div>
                            {/* Arrow between nodes */}
                            {!isLast && (
                                <div style={{
                                    color: '#333',
                                    fontSize: '14px',
                                    padding: '0 3px',
                                    userSelect: 'none',
                                    flexShrink: 0,
                                }}>
                                    →
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#444', fontStyle: 'italic' }}>
                Toggle solutions below to see components activate in real-time.
            </p>
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────

const ROISimulator = () => {
    const [activeScenarioId, setActiveScenarioId] = useState(SCENARIOS[0].id);
    const [activeSolutions, setActiveSolutions] = useState<Record<string, boolean>>({});
    const [animatedMetrics, setAnimatedMetrics] = useState<Record<string, number>>({});
    // Tracks which alternative is chosen per solution (null = NVIDIA default)
    const [chosenAlternative, setChosenAlternative] = useState<Record<string, string | null>>({});
    // Deployment model: how NVIDIA solutions will be hosted
    const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>('cloud-gpu');

    const scenario = SCENARIOS.find(s => s.id === activeScenarioId)!;
    const deployConfig = DEPLOYMENT_CONFIGS[deploymentMode];

    // Initialize scenario: incumbents pre-selected, NVIDIA-only solutions start OFF
    useEffect(() => {
        const initialSolutions: Record<string, boolean> = {};
        const initialAlts: Record<string, string | null> = {};
        scenario.solutions.forEach(s => {
            // If this solution has a defaultAlt (incumbent), activate it and pre-select the alt
            if (s.defaultAlt) {
                initialSolutions[s.key] = true;
                initialAlts[s.key] = s.defaultAlt;
            } else {
                // NVIDIA-only solutions (guardrails, evaluator, etc.) start OFF — they are proposed upgrades
                initialSolutions[s.key] = false;
                initialAlts[s.key] = null;
            }
        });
        setActiveSolutions(initialSolutions);
        setChosenAlternative(initialAlts);
    }, [activeScenarioId]);

    // Calculate current metric values (uses alternative impacts if one is selected)
    const computedMetrics = scenario.metrics.map(m => {
        let value = m.baseline;
        scenario.solutions.forEach(s => {
            if (activeSolutions[s.key]) {
                const altKey = chosenAlternative[s.key];
                const alt = altKey ? s.alternatives?.find(a => a.key === altKey) : null;
                const impacts = alt ? alt.impacts : s.impacts;
                if (impacts[m.key] !== undefined) {
                    value += impacts[m.key];
                }
            }
        });
        // Clamp
        if (m.higherIsBetter) {
            value = Math.max(0, value);
        } else {
            value = Math.max(0.01, value);
        }
        return { ...m, current: Number(value.toFixed(2)) };
    });

    // Animate metric values
    useEffect(() => {
        const targets: Record<string, number> = {};
        computedMetrics.forEach(m => { targets[m.key] = m.current; });
        setAnimatedMetrics(targets);
    }, [JSON.stringify(computedMetrics.map(m => m.current))]);

    const isMetricGood = (m: Metric & { current: number }) => {
        return m.higherIsBetter ? m.current >= m.target : m.current <= m.target;
    };

    const allMetricsHit = computedMetrics.every(isMetricGood);

    const toggleSolution = (key: string) => {
        const newState = !activeSolutions[key];
        track('roi_solution_toggle', { solution: key, scenario: scenario.id, active: newState });
        setActiveSolutions(prev => ({ ...prev, [key]: newState }));
    };

    const selectAlternative = (solutionKey: string, altKey: string | null) => {
        setChosenAlternative(prev => ({ ...prev, [solutionKey]: altKey }));
    };

    // ROI Calculations (uses alternative savings if one is selected)
    const totalSavings = scenario.solutions
        .filter(s => activeSolutions[s.key])
        .reduce((acc, s) => {
            const altKey = chosenAlternative[s.key];
            const alt = altKey ? s.alternatives?.find(a => a.key === altKey) : null;
            return acc + (alt ? alt.annualCostSavings : s.annualCostSavings);
        }, 0);

    const activeSolutionCount = Object.values(activeSolutions).filter(Boolean).length;

    const getMetricProgress = (m: Metric & { current: number }): number => {
        if (m.higherIsBetter) {
            const range = m.target - m.baseline;
            if (range <= 0) return 100;
            return Math.min(100, Math.max(0, ((m.current - m.baseline) / range) * 100));
        } else {
            const range = m.baseline - m.target;
            if (range <= 0) return 100;
            return Math.min(100, Math.max(0, ((m.baseline - m.current) / range) * 100));
        }
    };

    const getMetricColor = (progress: number): string => {
        if (progress >= 90) return '#76b900';
        if (progress >= 50) return '#ffa726';
        return '#ff4d6a';
    };

    const formatMetricValue = (m: Metric & { current: number }): string => {
        const val = animatedMetrics[m.key] ?? m.current;
        if (m.unit === '$') return `$${val.toFixed(2)} `;
        if (m.unit === '%' || m.unit === '/5') return `${val}${m.unit} `;
        if (m.unit === 's') return `${val} s`;
        if (m.unit === 'ms') return `${val} ms`;
        if (m.unit === 'min') return `${val} min`;
        return `${val.toLocaleString()} `;
    };

    const formatTargetValue = (m: Metric): string => {
        const dir = m.higherIsBetter ? '>' : '<';
        if (m.unit === '$') return `${dir} $${m.target} `;
        if (m.unit === '%' || m.unit === '/5') return `${dir} ${m.target}${m.unit} `;
        if (m.unit === 's') return `${dir} ${m.target} s`;
        if (m.unit === 'ms') return `${dir} ${m.target} ms`;
        if (m.unit === 'min') return `${dir} ${m.target} min`;
        return `${dir} ${m.target.toLocaleString()} `;
    };

    // Compute visible diagram nodes
    const visibleDiagramNodes = scenario.diagramNodes.filter(node => {
        if (node.type === 'baseline' || node.type === 'external') return true;
        if (!node.addedBySolution) return true;
        // Only shown if the linked solution is active
        if (!activeSolutions[node.addedBySolution]) return false;
        // If node needs a specific alt, check that alt is chosen
        if (node.addedByAlt) {
            return chosenAlternative[node.addedBySolution] === node.addedByAlt;
        }
        // NVIDIA node: shown when solution is active AND no alt is chosen
        if (node.type === 'nvidia') {
            return chosenAlternative[node.addedBySolution] === null || chosenAlternative[node.addedBySolution] === undefined;
        }
        return true;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflowY: 'auto' }}>

            {/* ── Scenario Selector Bar ───────────────────────── */}
            <div style={{
                display: 'flex', gap: '8px', padding: '16px 24px',
                borderBottom: '1px solid var(--nv-grey)',
                backgroundColor: 'var(--nv-darker-grey)',
                overflowX: 'auto',
            }}>
                {SCENARIOS.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveScenarioId(s.id)}
                        className="roi-scenario-btn"
                        style={{
                            padding: '10px 16px',
                            backgroundColor: activeScenarioId === s.id ? `${s.accent} 18` : 'var(--nv-dark-grey)',
                            border: `1px solid ${activeScenarioId === s.id ? s.accent : 'var(--nv-grey)'} `,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            transition: 'all 0.25s ease',
                            minWidth: 'fit-content',
                            color: activeScenarioId === s.id ? s.accent : 'var(--nv-light-grey)',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center' }}>{s.icon}</span>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.title}</div>
                            <div style={{ fontSize: '10px', opacity: 0.7, whiteSpace: 'nowrap' }}>{s.industry}</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── Scenario Problem Statement ──────────────────── */}
            <div className="glass-panel" style={{
                margin: '16px 24px 0', padding: '20px 24px',
                borderLeft: `4px solid ${scenario.accent} `,
            }}>
                <h2 style={{
                    fontSize: '20px', marginBottom: '8px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    color: scenario.accent,
                }}>
                    <Target size={20} /> {scenario.title}: Current Stack Analysis
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--nv-light-grey)', margin: 0, lineHeight: 1.6 }}>
                    {scenario.problemStatement}
                </p>
            </div>

            {/* ── Architecture Diagram ─────────────────────────── */}
            <ArchDiagramPanel
                nodes={visibleDiagramNodes}
                accent={scenario.accent}
                allNodes={scenario.diagramNodes}
            />

            {/* ── Main Content: Solutions + Metrics ───────────── */}
            <div style={{ display: 'flex', gap: '24px', flex: 1, padding: '16px 24px 0' }}>

                {/* Left: Solution Toggle Panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{
                        color: 'var(--nv-white)', fontSize: '15px',
                        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px',
                    }}>
                        <Sparkles size={16} color="var(--nv-green)" /> Current Stack → NVIDIA Upgrade
                        <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>
                            {activeSolutionCount}/{scenario.solutions.length} active
                        </span>
                    </h3>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#555', lineHeight: 1.4 }}>
                        🟠 Pre-loaded with your current incumbent stack. Toggle a solution ON to activate NVIDIA equivalent and compare metrics.
                    </p>

                    {scenario.solutions.map(s => {
                        const isActive = activeSolutions[s.key];
                        const currentAltKey = chosenAlternative[s.key];
                        const isUsingAlt = currentAltKey !== null;

                        return (
                            <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                <div
                                    onClick={() => toggleSolution(s.key)}
                                    className="roi-solution-card"
                                    style={{
                                        padding: '16px',
                                        backgroundColor: isActive ? (isUsingAlt ? 'rgba(255,167,38,0.08)' : 'rgba(118, 185, 0, 0.08)') : 'var(--nv-dark-grey)',
                                        border: `1px solid ${isActive ? (isUsingAlt ? '#ffa726' : 'var(--nv-green)') : 'var(--nv-grey)'} `,
                                        borderRadius: isActive && s.alternatives?.length ? '8px 8px 0 0' : '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        display: 'flex', gap: '14px', alignItems: 'flex-start',
                                    }}
                                >
                                    <div style={{
                                        color: isActive ? (isUsingAlt ? '#ffa726' : 'var(--nv-green)') : '#888',
                                        marginTop: '2px', transition: 'color 0.25s',
                                    }}>
                                        {s.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{
                                            margin: 0, marginBottom: '3px', fontSize: '14px',
                                            color: isActive ? (isUsingAlt ? '#ffa726' : 'var(--nv-green)') : 'var(--nv-white)',
                                            transition: 'color 0.25s',
                                        }}>
                                            {isUsingAlt
                                                ? s.alternatives?.find(a => a.key === currentAltKey)?.title || s.title
                                                : s.title}
                                        </h4>
                                        <div style={{ fontSize: '11px', color: scenario.accent, marginBottom: '4px', fontWeight: 500 }}>
                                            {isUsingAlt
                                                ? s.alternatives?.find(a => a.key === currentAltKey)?.product || s.product
                                                : s.product}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#999', lineHeight: 1.5 }}>
                                            {isUsingAlt
                                                ? s.alternatives?.find(a => a.key === currentAltKey)?.tradeoff || s.desc
                                                : s.desc}
                                        </p>
                                        {/* Grounding note — condensed to one line */}
                                        {!isUsingAlt && s.benchmarkSource && (
                                            <p style={{ margin: '5px 0 0', fontSize: '10px', color: '#76b900', lineHeight: 1.3 }}>
                                                📊 {s.benchmarkSource.split('—')[0].trim()}
                                            </p>
                                        )}
                                        {isUsingAlt && s.currentStackNote && (
                                            <p style={{ margin: '5px 0 0', fontSize: '10px', color: '#ffa726', lineHeight: 1.3 }}>
                                                ⚠️ {s.currentStackNote}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                        {isActive ? (
                                            <span style={{
                                                fontSize: '11px', fontWeight: 700,
                                                color: isUsingAlt ? '#000' : 'var(--nv-black)',
                                                backgroundColor: isUsingAlt ? '#ffa726' : 'var(--nv-green)',
                                                padding: '4px 10px', borderRadius: '4px',
                                            }}>
                                                {isUsingAlt ? 'ALT' : 'NVIDIA'}
                                            </span>
                                        ) : (
                                            <ArrowRightCircle size={18} color="var(--nv-grey)" />
                                        )}
                                    </div>
                                </div>

                                {/* ── Alternative Switcher ── */}
                                {isActive && s.alternatives && s.alternatives.length > 0 && (
                                    <div style={{
                                        padding: '8px 16px',
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--nv-grey)',
                                        borderTop: 'none',
                                        borderRadius: '0 0 8px 8px',
                                        display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
                                    }}>
                                        <span style={{ fontSize: '10px', color: '#666', marginRight: '4px' }}>Switch to:</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); selectAlternative(s.key, null); }}
                                            style={{
                                                padding: '4px 10px', fontSize: '10px', fontWeight: 600,
                                                border: `1px solid ${!isUsingAlt ? 'var(--nv-green)' : '#555'} `,
                                                backgroundColor: !isUsingAlt ? 'rgba(118,185,0,0.15)' : 'transparent',
                                                color: !isUsingAlt ? 'var(--nv-green)' : '#888',
                                                borderRadius: '4px', cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            ✦ NVIDIA Upgrade
                                        </button>
                                        {s.alternatives.map(alt => (
                                            <button
                                                key={alt.key}
                                                onClick={(e) => { e.stopPropagation(); selectAlternative(s.key, alt.key); }}
                                                style={{
                                                    padding: '4px 10px', fontSize: '10px', fontWeight: 600,
                                                    border: `1px solid ${currentAltKey === alt.key ? '#ffa726' : '#555'} `,
                                                    backgroundColor: currentAltKey === alt.key ? 'rgba(255,167,38,0.15)' : 'transparent',
                                                    color: currentAltKey === alt.key ? '#ffa726' : '#888',
                                                    borderRadius: '4px', cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {alt.key === s.defaultAlt ? '📍 Current: ' : ''}{alt.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right: Live Metrics + ROI */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* ── Deployment Mode Selector ─────────────────────── */}
                    <div className="glass-panel" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--nv-white)' }}>
                                🚀 How will you deploy NVIDIA solutions?
                            </span>
                            {deployConfig.dataStaysInVPC && (
                                <span style={{ fontSize: '10px', color: '#76b900', backgroundColor: 'rgba(118,185,0,0.12)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                    ✓ Data stays in your VPC
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {(Object.values(DEPLOYMENT_CONFIGS) as DeploymentConfig[]).map(cfg => (
                                <button
                                    key={cfg.mode}
                                    onClick={() => setDeploymentMode(cfg.mode)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 6px',
                                        border: `1px solid ${deploymentMode === cfg.mode ? scenario.accent : '#333'} `,
                                        backgroundColor: deploymentMode === cfg.mode ? `rgba(118, 185, 0, 0.1)` : 'transparent',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        textAlign: 'center',
                                    }}
                                >
                                    <div style={{ fontSize: '13px', marginBottom: '2px' }}>{cfg.icon}</div>
                                    <div style={{ fontSize: '10px', fontWeight: 600, color: deploymentMode === cfg.mode ? 'var(--nv-white)' : '#888', lineHeight: 1.3 }}>
                                        {cfg.mode === 'cloud-api' ? 'Cloud API' : cfg.mode === 'cloud-gpu' ? 'Self-Hosted' : 'On-Prem DGX'}
                                    </div>
                                    <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                                        {cfg.mode === 'cloud-api' ? 'OpEx only' : cfg.mode === 'cloud-gpu' ? 'OpEx only' : 'CapEx + OpEx'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <h3 style={{
                        color: 'var(--nv-white)', fontSize: '15px',
                        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px',
                    }}>
                        <Activity size={16} color={scenario.accent} /> Live Business Metrics
                    </h3>

                    {computedMetrics.map(m => {
                        const progress = getMetricProgress(m);
                        const color = getMetricColor(progress);
                        const good = isMetricGood(m);

                        return (
                            <div key={m.key} className="glass-panel" style={{
                                padding: '16px 20px',
                                borderLeft: `4px solid ${color} `,
                                transition: 'border-color 0.4s ease',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ color, transition: 'color 0.4s ease' }}>{m.icon}</div>
                                        <div>
                                            <div style={{ fontSize: '13px', color: 'var(--nv-light-grey)', fontWeight: 500 }}>{m.label}</div>
                                            <div style={{ fontSize: '11px', color: '#666' }}>Target: {formatTargetValue(m)}</div>
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '26px', fontWeight: 700,
                                        color: good ? 'var(--nv-green)' : 'var(--nv-white)',
                                        transition: 'color 0.4s ease',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {formatMetricValue(m)}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div style={{
                                    width: '100%', height: '6px',
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                    borderRadius: '3px', overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${progress}% `,
                                        height: '100%',
                                        backgroundColor: color,
                                        borderRadius: '3px',
                                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}

                    {/* ── ROI Summary Card ────────────────────── */}
                    {(() => {
                        // Deployment-adjusted cost calculations
                        const nvidiaSolutionCount = scenario.solutions.filter(s => activeSolutions[s.key] && !chosenAlternative[s.key]).length;
                        const annualInfraOpEx = deployConfig.selfHosted
                            ? deployConfig.opexPerGPUPerMonth * deployConfig.gpusRequired * 12
                            + deployConfig.enterpriseLicensePerGPUPerYear * deployConfig.gpusRequired
                            : 0;
                        const capexTotal = deployConfig.capexPerGPU * deployConfig.gpusRequired;
                        const netAnnualSavings = Math.max(0, totalSavings - annualInfraOpEx);
                        const paybackMonths = capexTotal > 0 && netAnnualSavings > 0
                            ? Math.round((capexTotal / netAnnualSavings) * 12)
                            : nvidiaSolutionCount > 0 && netAnnualSavings > 0
                                ? Math.round(((nvidiaSolutionCount * 50000) / netAnnualSavings) * 12)
                                : 0;

                        return (
                            <div className="glass-panel" style={{
                                padding: '16px 20px', marginTop: '4px',
                                borderLeft: `4px solid ${netAnnualSavings > 0 ? 'var(--nv-green)' : '#555'} `,
                                transition: 'border-color 0.4s ease',
                            }}>
                                <h4 style={{
                                    margin: '0 0 10px', fontSize: '14px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    color: 'var(--nv-white)',
                                }}>
                                    <Calculator size={16} color="var(--nv-green)" /> ROI Projection
                                    <span style={{ fontSize: '10px', color: '#555', marginLeft: 'auto', fontWeight: 400 }}>
                                        vs. baseline ${(scenario.baseAnnualCost / 1000).toFixed(0)}K/yr
                                    </span>
                                </h4>

                                {/* Per-solution savings breakdown */}
                                {totalSavings > 0 && (
                                    <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {scenario.solutions
                                            .filter(s => activeSolutions[s.key])
                                            .map(s => {
                                                const altKey = chosenAlternative[s.key];
                                                const alt = altKey ? s.alternatives?.find(a => a.key === altKey) : null;
                                                const savings = alt ? alt.annualCostSavings : s.annualCostSavings;
                                                const formula = alt ? alt.savingsFormula : s.savingsFormula;
                                                const label = alt ? alt.title : s.title;
                                                if (savings === 0) return null;
                                                return (
                                                    <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '11px', color: altKey ? '#ffa726' : 'var(--nv-green)', fontWeight: 600 }}>
                                                                {altKey ? '⚠️' : '✦'} {label}
                                                            </span>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--nv-green)', fontVariantNumeric: 'tabular-nums' }}>
                                                                +${(savings / 1000).toFixed(0)}K/yr
                                                            </span>
                                                        </div>
                                                        {formula && (
                                                            <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.4, paddingLeft: '14px', fontStyle: 'italic' }}>
                                                                {formula}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                        {/* Infra cost deduction (cloud-gpu or on-prem) */}
                                        {deployConfig.selfHosted && annualInfraOpEx > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11px', color: '#ff4d6a', fontWeight: 600 }}>
                                                        − NIM Infra OpEx ({deployConfig.mode === 'on-prem' ? 'power/colo' : 'GPU rental'} + AI Enterprise license)
                                                    </span>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ff4d6a', fontVariantNumeric: 'tabular-nums' }}>
                                                        −${(annualInfraOpEx / 1000).toFixed(0)}K/yr
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.4, paddingLeft: '14px', fontStyle: 'italic' }}>
                                                    {deployConfig.gpusRequired}× H100 × ${deployConfig.opexPerGPUPerMonth.toLocaleString()}/GPU/mo + ${deployConfig.enterpriseLicensePerGPUPerYear.toLocaleString()}/GPU/yr AI Enterprise license
                                                </div>
                                            </div>
                                        )}

                                        {/* CapEx line for on-prem */}
                                        {deployConfig.mode === 'on-prem' && capexTotal > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11px', color: '#ffa726', fontWeight: 600 }}>
                                                        💰 CapEx: DGX H100 Hardware
                                                    </span>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffa726', fontVariantNumeric: 'tabular-nums' }}>
                                                        ${(capexTotal / 1000).toFixed(0)}K one-time
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.4, paddingLeft: '14px', fontStyle: 'italic' }}>
                                                    {deployConfig.gpusRequired}× H100 GPU at ${deployConfig.capexPerGPU.toLocaleString()}/GPU (DGX H100 node ≈ $320K ÷ 8 GPUs). You own the hardware. 5-yr depreciation = ${((deployConfig.capexPerGPU * deployConfig.gpusRequired) / 5 / 1000).toFixed(0)}K/yr.
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ borderTop: '1px solid #333', marginTop: '4px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '11px', color: '#888' }}>
                                                {deployConfig.selfHosted ? 'Net annual savings (after infra)' : 'Total annual savings'}
                                            </span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: netAnnualSavings > 0 ? 'var(--nv-green)' : '#666' }}>
                                                ${(netAnnualSavings / 1000).toFixed(0)}K/yr
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                                            {deployConfig.selfHosted ? 'Net Savings/yr' : 'Annual Savings'}
                                        </div>
                                        <div style={{
                                            fontSize: '22px', fontWeight: 700,
                                            color: netAnnualSavings > 0 ? 'var(--nv-green)' : '#666',
                                            transition: 'color 0.3s ease', fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            ${netAnnualSavings > 0 ? (netAnnualSavings / 1000).toFixed(0) + 'K' : '0'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                                            {deployConfig.mode === 'on-prem' ? 'CapEx (one-time)' : 'vs. Baseline'}
                                        </div>
                                        <div style={{
                                            fontSize: '22px', fontWeight: 700,
                                            color: deployConfig.mode === 'on-prem' ? '#ffa726' : (netAnnualSavings > 0 ? scenario.accent : '#666'),
                                            transition: 'color 0.3s ease', fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            {deployConfig.mode === 'on-prem'
                                                ? `$${(capexTotal / 1000).toFixed(0)} K`
                                                : `${netAnnualSavings > 0 ? Math.round((netAnnualSavings / scenario.baseAnnualCost) * 100) : 0}% `}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                                            {deployConfig.mode === 'on-prem' ? 'HW Payback' : 'Time to ROI'}
                                        </div>
                                        <div style={{
                                            fontSize: '22px', fontWeight: 700,
                                            color: paybackMonths > 0 ? 'var(--nv-white)' : '#666',
                                            transition: 'color 0.3s ease',
                                        }}>
                                            {netAnnualSavings <= 0 ? '—' : paybackMonths <= 1 ? '<1 mo' : `~${Math.min(paybackMonths, 36)} mo`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}



                    {/* ── Success Banner ──────────────────────── */}
                    {allMetricsHit && (
                        <div style={{
                            padding: '20px', backgroundColor: 'rgba(118, 185, 0, 0.12)',
                            border: '2px solid var(--nv-green)', borderRadius: '8px',
                            animation: 'pulseGlow 2s infinite',
                        }}>
                            <h3 style={{
                                color: 'var(--nv-green)', margin: 0,
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px',
                            }}>
                                <CheckCircle2 size={20} /> All Targets Achieved!
                            </h3>
                            <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--nv-light-grey)', lineHeight: 1.6, margin: '8px 0 0' }}>
                                <strong style={{ color: 'var(--nv-green)' }}>
                                    <TrendingUp size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                    {' '}
                                </strong>
                                {scenario.successMessage}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom padding */}
            <div style={{ height: '24px', flexShrink: 0 }} />
        </div >
    );
};

export default ROISimulator;
