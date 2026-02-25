import React, { useState, useEffect } from 'react';
import {
    Target, DollarSign, ShieldCheck, Zap, Bot, ArrowRightCircle,
    CheckCircle2, Activity, Clock, Users, Brain, FileSearch, Shield, Code,
    HeartPulse, Landmark, ShoppingCart, Terminal, Scale, Gauge, Cpu,
    TrendingUp, Calculator, Sparkles
} from 'lucide-react';

// ─── Scenario Data Model ────────────────────────────────────────

interface Metric {
    key: string;
    label: string;
    unit: string;
    icon: React.ReactNode;
    baseline: number;
    target: number;
    higherIsBetter: boolean; // true = green when above target, false = green when below target
}

interface Alternative {
    key: string;
    title: string;
    product: string;
    impacts: Record<string, number>;
    annualCostSavings: number;
    tradeoff: string; // short note on why it's worse/different
}

interface Solution {
    key: string;
    title: string;
    product: string;
    desc: string;
    icon: React.ReactNode;
    impacts: Record<string, number>; // metric key → delta
    annualCostSavings: number;
    alternatives?: Alternative[];
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
}

// ─── 5 Industry Scenarios ───────────────────────────────────────

const SCENARIOS: Scenario[] = [
    {
        id: 'healthcare',
        title: 'Patient Triage Agent',
        industry: 'Healthcare',
        icon: <HeartPulse size={20} />,
        accent: '#ff4d6a',
        problemStatement: "Your hospital's AI triage agent responds in 8.5s, costs $15 per 1K requests, hallucinates unsafe diagnoses (45% safety), and only triages 120 patients/hour. Apply NVIDIA solutions to meet enterprise healthcare SLAs.",
        baseAnnualCost: 540000,
        metrics: [
            { key: 'latency', label: 'Avg Latency', unit: 's', icon: <Clock size={18} />, baseline: 8.5, target: 2.0, higherIsBetter: false },
            { key: 'cost', label: 'Cost / 1K Reqs', unit: '$', icon: <DollarSign size={18} />, baseline: 15.0, target: 5.0, higherIsBetter: false },
            { key: 'safety', label: 'Safety Score', unit: '%', icon: <ShieldCheck size={18} />, baseline: 45, target: 95, higherIsBetter: true },
            { key: 'throughput', label: 'Patients / Hour', unit: '', icon: <Users size={18} />, baseline: 120, target: 500, higherIsBetter: true },
        ],
        solutions: [
            {
                key: 'qlora', title: 'Llama-3 NIM + QLoRA Fine-Tune', product: 'NIM + NeMo Customizer',
                desc: 'Replace the 400B monolith with a fine-tuned 70B NIM specialized for medical triage, deployed via LangGraph routing.',
                icon: <Zap size={18} />,
                impacts: { latency: -6.0, cost: -12.0, safety: 5, throughput: 320 },
                annualCostSavings: 320000,
                alternatives: [
                    { key: 'openai_gpt4', title: 'OpenAI GPT-4o API', product: 'OpenAI', impacts: { latency: -4.0, cost: -6.0, safety: 2, throughput: 200 }, annualCostSavings: 150000, tradeoff: 'No self-hosting — patient data leaves your VPC. No fine-tuning for medical terminology.' },
                    { key: 'self_hosted_llama', title: 'Self-Hosted Llama (no NIM)', product: 'Meta Llama + vLLM', impacts: { latency: -3.0, cost: -8.0, safety: 3, throughput: 150 }, annualCostSavings: 100000, tradeoff: 'No enterprise SLA, manual GPU infra management, no built-in scaling.' },
                ],
            },
            {
                key: 'guardrails', title: 'NeMo Guardrails (HIPAA)', product: 'NeMo Guardrails',
                desc: 'Inject programmable input/output rails for PII redaction, diagnosis hallucination prevention, and HIPAA-compliant audit logging.',
                icon: <ShieldCheck size={18} />,
                impacts: { latency: 0.2, cost: 0.5, safety: 48, throughput: -5 },
                annualCostSavings: 45000,
            },
            {
                key: 'mcp', title: 'MCP Tool Server (EHR)', product: 'Model Context Protocol',
                desc: 'Standardized MCP server for secure, real-time retrieval from Epic/Cerner EHR systems — replacing fragile REST wrappers.',
                icon: <Bot size={18} />,
                impacts: { latency: -1.0, cost: 0, safety: 4, throughput: 80 },
                annualCostSavings: 28000,
            },
            {
                key: 'evaluator', title: 'NeMo Evaluator (Weekly)', product: 'NeMo Evaluator',
                desc: 'Automated weekly evaluation of faithfulness, safety, and clinical accuracy via RAGAS metrics + custom medical benchmarks.',
                icon: <Gauge size={18} />,
                impacts: { latency: 0, cost: 0.2, safety: 3, throughput: 0 },
                annualCostSavings: 15000,
            },
        ],
        successMessage: 'SA Recommendation: By migrating to a fine-tuned NIM with QLoRA and deploying NeMo Guardrails for HIPAA compliance, you achieved sub-2s latency and 95%+ safety — ready for production rollout across all hospital departments.',
    },
    {
        id: 'fintech',
        title: 'Fraud Detection Pipeline',
        industry: 'FinTech',
        icon: <Landmark size={20} />,
        accent: '#ffa726',
        problemStatement: "Your real-time fraud detection pipeline processes 2K transactions/sec with an 8% false-positive rate, 340ms detection latency, and fails 60% of SOX audit checks. NVIDIA solutions can fix all four bottlenecks.",
        baseAnnualCost: 890000,
        metrics: [
            { key: 'throughput', label: 'Txns / Second', unit: '', icon: <Activity size={18} />, baseline: 2000, target: 15000, higherIsBetter: true },
            { key: 'falsePositive', label: 'False Positive Rate', unit: '%', icon: <Target size={18} />, baseline: 8.0, target: 1.0, higherIsBetter: false },
            { key: 'latency', label: 'Detection Latency', unit: 'ms', icon: <Clock size={18} />, baseline: 340, target: 50, higherIsBetter: false },
            { key: 'compliance', label: 'SOX Compliance', unit: '%', icon: <Shield size={18} />, baseline: 40, target: 95, higherIsBetter: true },
        ],
        solutions: [
            {
                key: 'morpheus', title: 'NVIDIA Morpheus Pipeline', product: 'NVIDIA Morpheus',
                desc: 'GPU-accelerated cybersecurity framework: real-time digital fingerprinting, anomaly detection, and deep packet inspection for transaction streams.',
                icon: <Shield size={18} />,
                impacts: { throughput: 10000, falsePositive: -5.5, latency: -250, compliance: 15 },
                annualCostSavings: 420000,
                alternatives: [
                    { key: 'aws_fraud', title: 'AWS Fraud Detector', product: 'AWS', impacts: { throughput: 4000, falsePositive: -3.0, latency: -120, compliance: 5 }, annualCostSavings: 180000, tradeoff: 'Cloud-only, vendor lock-in. Limited to AWS-native data sources. Lower throughput.' },
                    { key: 'datadog_siem', title: 'Datadog SIEM + ML', product: 'Datadog', impacts: { throughput: 3000, falsePositive: -2.5, latency: -100, compliance: 8 }, annualCostSavings: 150000, tradeoff: 'CPU-based ML pipeline — 3× slower at scale. High per-GB ingestion costs.' },
                ],
            },
            {
                key: 'tensorrt', title: 'TensorRT-LLM Optimization', product: 'TensorRT-LLM',
                desc: 'INT8/FP8 quantization with continuous batching for the fraud classification model. 6× throughput improvement at identical accuracy.',
                icon: <Cpu size={18} />,
                impacts: { throughput: 3500, falsePositive: -0.8, latency: -45, compliance: 0 },
                annualCostSavings: 180000,
            },
            {
                key: 'guardrails', title: 'NeMo Guardrails (SOX)', product: 'NeMo Guardrails',
                desc: 'Audit trail rails ensuring every fraud decision is logged with reasoning, supporting SOX Section 404 compliance requirements.',
                icon: <ShieldCheck size={18} />,
                impacts: { throughput: -200, falsePositive: -0.5, latency: 5, compliance: 40 },
                annualCostSavings: 95000,
            },
            {
                key: 'curator', title: 'NeMo Data Curator', product: 'NeMo Curator',
                desc: 'GPU-accelerated data pipeline: dedup, quality scoring, and PII removal across historical transaction datasets for model retraining.',
                icon: <Brain size={18} />,
                impacts: { throughput: 0, falsePositive: -1.0, latency: 0, compliance: 5 },
                annualCostSavings: 65000,
            },
        ],
        successMessage: 'SA Recommendation: Morpheus provides the backbone for real-time fraud detection at 15K+ TPS, while TensorRT-LLM optimizes inference throughput. NeMo Guardrails close the SOX compliance gap with immutable audit trails.',
    },
    {
        id: 'retail',
        title: 'Customer Support Copilot',
        industry: 'Retail / SaaS',
        icon: <ShoppingCart size={20} />,
        accent: '#42a5f5',
        problemStatement: "Your AI support copilot costs $4.20 per interaction, resolves only 35% of tickets autonomously, takes 12s to respond, and customer satisfaction sits at 3.1/5. NVIDIA solutions can transform this economics.",
        baseAnnualCost: 1260000,
        metrics: [
            { key: 'costPerTicket', label: 'Cost / Interaction', unit: '$', icon: <DollarSign size={18} />, baseline: 4.20, target: 0.80, higherIsBetter: false },
            { key: 'resolution', label: 'Auto-Resolution', unit: '%', icon: <CheckCircle2 size={18} />, baseline: 35, target: 75, higherIsBetter: true },
            { key: 'latency', label: 'Response Time', unit: 's', icon: <Clock size={18} />, baseline: 12.0, target: 3.0, higherIsBetter: false },
            { key: 'csat', label: 'CSAT Score', unit: '/5', icon: <Users size={18} />, baseline: 3.1, target: 4.5, higherIsBetter: true },
        ],
        solutions: [
            {
                key: 'nim_routing', title: 'NIM Multi-Model Routing', product: 'NIM + LangGraph',
                desc: 'Route simple queries to Mistral-7B NIM ($0.02/1K tokens), escalate complex issues to Llama-3.3-70B. LangGraph handles conditional routing.',
                icon: <Zap size={18} />,
                impacts: { costPerTicket: -2.80, resolution: 15, latency: -7.0, csat: 0.4 },
                annualCostSavings: 580000,
                alternatives: [
                    { key: 'openai_assistants', title: 'OpenAI Assistants API', product: 'OpenAI', impacts: { costPerTicket: -1.80, resolution: 10, latency: -5.0, csat: 0.3 }, annualCostSavings: 320000, tradeoff: 'Higher per-token cost, no multi-model routing, limited customization.' },
                ],
            },
            {
                key: 'retriever', title: 'NeMo Retriever + Knowledge Base', product: 'NeMo Retriever',
                desc: 'End-to-end retrieval with hybrid search and reranking over your product docs, FAQs, and past ticket resolutions.',
                icon: <FileSearch size={18} />,
                impacts: { costPerTicket: -0.30, resolution: 22, latency: -1.5, csat: 0.6 },
                annualCostSavings: 210000,
            },
            {
                key: 'customizer', title: 'NeMo Customizer (Domain Tune)', product: 'NeMo Customizer',
                desc: 'QLoRA fine-tune Mistral-7B on 50K historical resolved tickets. Dramatically boosts first-contact resolution and tone quality.',
                icon: <Brain size={18} />,
                impacts: { costPerTicket: -0.15, resolution: 8, latency: 0, csat: 0.5 },
                annualCostSavings: 120000,
            },
            {
                key: 'guardrails', title: 'NeMo Guardrails (Brand Safety)', product: 'NeMo Guardrails',
                desc: 'Topic control, competitor mention blocking, refund policy enforcement, and sentiment-aware escalation triggers.',
                icon: <ShieldCheck size={18} />,
                impacts: { costPerTicket: 0.05, resolution: -2, latency: 0.3, csat: 0.3 },
                annualCostSavings: 45000,
            },
        ],
        successMessage: 'SA Recommendation: NIM multi-model routing with LangGraph slashed cost by 80% by routing to Mistral-7B for L1 queries. NeMo Retriever brought auto-resolution to 75%+, while domain fine-tuning pushed CSAT above 4.5.',
    },
    {
        id: 'devops',
        title: 'Code Review Agent',
        industry: 'DevOps / Platform',
        icon: <Terminal size={20} />,
        accent: '#ab47bc',
        problemStatement: "Your AI code review agent takes 45 min per PR, catches only 40% of security vulnerabilities, has 15% developer adoption, and costs $8.50 per review. NVIDIA-accelerated solutions can 10× this workflow.",
        baseAnnualCost: 720000,
        metrics: [
            { key: 'prTime', label: 'PR Review Time', unit: 'min', icon: <Clock size={18} />, baseline: 45, target: 5, higherIsBetter: false },
            { key: 'vulnDetection', label: 'Vuln Detection', unit: '%', icon: <Shield size={18} />, baseline: 40, target: 90, higherIsBetter: true },
            { key: 'adoption', label: 'Dev Adoption', unit: '%', icon: <Users size={18} />, baseline: 15, target: 80, higherIsBetter: true },
            { key: 'costPerReview', label: 'Cost / Review', unit: '$', icon: <DollarSign size={18} />, baseline: 8.50, target: 1.50, higherIsBetter: false },
        ],
        solutions: [
            {
                key: 'code_nim', title: 'Nemotron-70B Code NIM', product: 'NIM (Nemotron-70B)',
                desc: 'NVIDIA-tuned model optimized for code review, bug detection, and automated inline suggestions with 92% acceptance rate.',
                icon: <Code size={18} />,
                impacts: { prTime: -32, vulnDetection: 25, adoption: 35, costPerReview: -5.50 },
                annualCostSavings: 340000,
                alternatives: [
                    { key: 'github_copilot', title: 'GitHub Copilot Enterprise', product: 'GitHub / Microsoft', impacts: { prTime: -25, vulnDetection: 15, adoption: 40, costPerReview: -4.00 }, annualCostSavings: 250000, tradeoff: 'Higher adoption (GitHub-native), but weaker vuln detection and no self-hosting option.' },
                    { key: 'sonarqube_ai', title: 'SonarQube AI Code Review', product: 'SonarSource', impacts: { prTime: -10, vulnDetection: 30, adoption: 10, costPerReview: -2.00 }, annualCostSavings: 120000, tradeoff: 'Strong security scanning but slow — rule-based, not LLM-native. Low developer adoption.' },
                ],
            },
            {
                key: 'tensorrt', title: 'TensorRT-LLM Serving', product: 'TensorRT-LLM + Triton',
                desc: 'FP8 quantized serving with continuous batching via Triton Inference Server. Sub-second code analysis for files up to 10K LOC.',
                icon: <Cpu size={18} />,
                impacts: { prTime: -6, vulnDetection: 0, adoption: 10, costPerReview: -1.20 },
                annualCostSavings: 95000,
            },
            {
                key: 'guardrails', title: 'NeMo Guardrails (Security)', product: 'NeMo Guardrails',
                desc: 'Enforce OWASP Top 10 scanning rails, secrets detection, and license compliance checks on every PR review output.',
                icon: <ShieldCheck size={18} />,
                impacts: { prTime: 1, vulnDetection: 28, adoption: 5, costPerReview: 0.10 },
                annualCostSavings: 80000,
            },
            {
                key: 'mcp', title: 'MCP Server (Git + JIRA)', product: 'Model Context Protocol',
                desc: 'Standardized tool connections to GitHub, GitLab, JIRA, and Confluence — giving the agent full context on related issues and docs.',
                icon: <Bot size={18} />,
                impacts: { prTime: -3, vulnDetection: 5, adoption: 15, costPerReview: -0.30 },
                annualCostSavings: 55000,
            },
        ],
        successMessage: 'SA Recommendation: Nemotron-70B delivers best-in-class code understanding, while TensorRT-LLM brings review latency under 5 minutes. MCP integration gave the agent full repo + JIRA context, driving developer adoption above 80%.',
    },
    {
        id: 'legal',
        title: 'Document Intelligence',
        industry: 'Legal / Insurance',
        icon: <Scale size={20} />,
        accent: '#26a69a',
        problemStatement: "Your document processing pipeline handles 200 docs/day with 78% extraction accuracy, takes 6 minutes per document, and fails 70% of redaction compliance audits. NVIDIA AI can achieve 10× throughput at 98% accuracy.",
        baseAnnualCost: 960000,
        metrics: [
            { key: 'throughput', label: 'Docs / Day', unit: '', icon: <FileSearch size={18} />, baseline: 200, target: 2000, higherIsBetter: true },
            { key: 'accuracy', label: 'Extraction Accuracy', unit: '%', icon: <Target size={18} />, baseline: 78, target: 96, higherIsBetter: true },
            { key: 'procTime', label: 'Time / Document', unit: 'min', icon: <Clock size={18} />, baseline: 6.0, target: 0.5, higherIsBetter: false },
            { key: 'compliance', label: 'Redaction Compliance', unit: '%', icon: <Shield size={18} />, baseline: 30, target: 95, higherIsBetter: true },
        ],
        solutions: [
            {
                key: 'nim_embed', title: 'NV-Embed-v2 + NeMo Retriever', product: 'NIM + NeMo Retriever',
                desc: 'State-of-the-art 1024-dim embeddings (#1 MTEB) with hybrid search + reranking for semantic document understanding.',
                icon: <Zap size={18} />,
                impacts: { throughput: 800, accuracy: 12, procTime: -3.0, compliance: 5 },
                annualCostSavings: 310000,
                alternatives: [
                    { key: 'pinecone_openai', title: 'OpenAI Embeddings + Pinecone', product: 'OpenAI + Pinecone', impacts: { throughput: 400, accuracy: 8, procTime: -1.5, compliance: 2 }, annualCostSavings: 150000, tradeoff: 'Lower embedding quality (#28 MTEB vs #1), cloud-only, higher per-query cost.' },
                ],
            },
            {
                key: 'curator', title: 'NeMo Data Curator', product: 'NeMo Curator',
                desc: 'GPU-accelerated document pipeline: OCR cleaning, dedup, quality scoring, and structured extraction from PDFs, images, and scans.',
                icon: <Brain size={18} />,
                impacts: { throughput: 600, accuracy: 5, procTime: -1.5, compliance: 10 },
                annualCostSavings: 190000,
            },
            {
                key: 'guardrails', title: 'NeMo Guardrails (PII/Redaction)', product: 'NeMo Guardrails',
                desc: 'Automated PII detection and redaction rails with configurable entity types (SSN, DOB, medical records, financial data).',
                icon: <ShieldCheck size={18} />,
                impacts: { throughput: -50, accuracy: 1, procTime: 0.2, compliance: 52 },
                annualCostSavings: 125000,
            },
            {
                key: 'customizer', title: 'NeMo Customizer (Legal Tune)', product: 'NeMo Customizer',
                desc: 'Fine-tune extraction models on your specific document formats: contracts, claims, policies, court filings.',
                icon: <Brain size={18} />,
                impacts: { throughput: 100, accuracy: 4, procTime: -0.3, compliance: 3 },
                annualCostSavings: 85000,
            },
        ],
        successMessage: 'SA Recommendation: NV-Embed-v2 with NeMo Retriever provides state-of-the-art document understanding at 10× throughput. NeMo Data Curator automates the ingestion pipeline, while Guardrails ensure 95%+ PII redaction compliance for regulated industries.',
    },
];

// ─── Main Component ─────────────────────────────────────────────

const ROISimulator = () => {
    const [activeScenarioId, setActiveScenarioId] = useState(SCENARIOS[0].id);
    const [activeSolutions, setActiveSolutions] = useState<Record<string, boolean>>({});
    const [animatedMetrics, setAnimatedMetrics] = useState<Record<string, number>>({});
    // Tracks which alternative is chosen per solution (null = NVIDIA default)
    const [chosenAlternative, setChosenAlternative] = useState<Record<string, string | null>>({});

    const scenario = SCENARIOS.find(s => s.id === activeScenarioId)!;

    // Reset solutions when scenario changes
    useEffect(() => {
        const initialSolutions: Record<string, boolean> = {};
        const initialAlts: Record<string, string | null> = {};
        scenario.solutions.forEach(s => { initialSolutions[s.key] = false; initialAlts[s.key] = null; });
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
        setActiveSolutions(prev => ({ ...prev, [key]: !prev[key] }));
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
        if (m.unit === '$') return `$${val.toFixed(2)}`;
        if (m.unit === '%' || m.unit === '/5') return `${val}${m.unit}`;
        if (m.unit === 's') return `${val}s`;
        if (m.unit === 'ms') return `${val}ms`;
        if (m.unit === 'min') return `${val} min`;
        return `${val.toLocaleString()}`;
    };

    const formatTargetValue = (m: Metric): string => {
        const dir = m.higherIsBetter ? '>' : '<';
        if (m.unit === '$') return `${dir} $${m.target}`;
        if (m.unit === '%' || m.unit === '/5') return `${dir} ${m.target}${m.unit}`;
        if (m.unit === 's') return `${dir} ${m.target}s`;
        if (m.unit === 'ms') return `${dir} ${m.target}ms`;
        if (m.unit === 'min') return `${dir} ${m.target} min`;
        return `${dir} ${m.target.toLocaleString()}`;
    };

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
                            backgroundColor: activeScenarioId === s.id ? `${s.accent}18` : 'var(--nv-dark-grey)',
                            border: `1px solid ${activeScenarioId === s.id ? s.accent : 'var(--nv-grey)'}`,
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
                borderLeft: `4px solid ${scenario.accent}`,
            }}>
                <h2 style={{
                    fontSize: '20px', marginBottom: '8px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    color: scenario.accent,
                }}>
                    <Target size={20} /> {scenario.title}: Bottlenecks Detected
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--nv-light-grey)', margin: 0, lineHeight: 1.6 }}>
                    {scenario.problemStatement}
                </p>
            </div>

            {/* ── Main Content: Solutions + Metrics ───────────── */}
            <div style={{ display: 'flex', gap: '24px', flex: 1, padding: '16px 24px 0' }}>

                {/* Left: Solution Toggle Panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{
                        color: 'var(--nv-white)', fontSize: '15px',
                        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px',
                    }}>
                        <Sparkles size={16} color="var(--nv-green)" /> NVIDIA SA Toolkit
                        <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>
                            {activeSolutionCount}/{scenario.solutions.length} active
                        </span>
                    </h3>

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
                                        border: `1px solid ${isActive ? (isUsingAlt ? '#ffa726' : 'var(--nv-green)') : 'var(--nv-grey)'}`,
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
                                        <span style={{ fontSize: '10px', color: '#666', marginRight: '4px' }}>Compare:</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); selectAlternative(s.key, null); }}
                                            style={{
                                                padding: '4px 10px', fontSize: '10px', fontWeight: 600,
                                                border: `1px solid ${!isUsingAlt ? 'var(--nv-green)' : '#555'}`,
                                                backgroundColor: !isUsingAlt ? 'rgba(118,185,0,0.15)' : 'transparent',
                                                color: !isUsingAlt ? 'var(--nv-green)' : '#888',
                                                borderRadius: '4px', cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            ✦ NVIDIA
                                        </button>
                                        {s.alternatives.map(alt => (
                                            <button
                                                key={alt.key}
                                                onClick={(e) => { e.stopPropagation(); selectAlternative(s.key, alt.key); }}
                                                style={{
                                                    padding: '4px 10px', fontSize: '10px', fontWeight: 600,
                                                    border: `1px solid ${currentAltKey === alt.key ? '#ffa726' : '#555'}`,
                                                    backgroundColor: currentAltKey === alt.key ? 'rgba(255,167,38,0.15)' : 'transparent',
                                                    color: currentAltKey === alt.key ? '#ffa726' : '#888',
                                                    borderRadius: '4px', cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {alt.title}
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
                                borderLeft: `4px solid ${color}`,
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
                                        width: `${progress}%`,
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
                    <div className="glass-panel" style={{
                        padding: '16px 20px', marginTop: '4px',
                        borderLeft: `4px solid ${totalSavings > 0 ? 'var(--nv-green)' : '#555'}`,
                        transition: 'border-color 0.4s ease',
                    }}>
                        <h4 style={{
                            margin: '0 0 12px', fontSize: '14px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            color: 'var(--nv-white)',
                        }}>
                            <Calculator size={16} color="var(--nv-green)" /> ROI Projection
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Annual Savings</div>
                                <div style={{
                                    fontSize: '22px', fontWeight: 700,
                                    color: totalSavings > 0 ? 'var(--nv-green)' : '#666',
                                    transition: 'color 0.3s ease',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    ${totalSavings > 0 ? (totalSavings / 1000).toFixed(0) + 'K' : '0'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Cost Reduction</div>
                                <div style={{
                                    fontSize: '22px', fontWeight: 700,
                                    color: totalSavings > 0 ? scenario.accent : '#666',
                                    transition: 'color 0.3s ease',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {totalSavings > 0 ? Math.round((totalSavings / scenario.baseAnnualCost) * 100) : 0}%
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Time to ROI</div>
                                <div style={{
                                    fontSize: '22px', fontWeight: 700,
                                    color: activeSolutionCount > 0 ? 'var(--nv-white)' : '#666',
                                    transition: 'color 0.3s ease',
                                }}>
                                    {activeSolutionCount === 0 ? '—' :
                                        activeSolutionCount <= 2 ? '~4 mo' :
                                            activeSolutionCount <= 3 ? '~3 mo' : '~2 mo'}
                                </div>
                            </div>
                        </div>
                    </div>

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
        </div>
    );
};

export default ROISimulator;
