import React, { useState, useRef } from 'react';
import {
    Play, Loader2, Cpu, ShieldAlert, Database, Server, Zap, Box, ArrowRight, Globe,
    ClipboardCheck, Lock, BadgeDollarSign, Layers, ChevronDown, ChevronRight,
    Lightbulb, ArrowRightCircle, Sparkles, MessageCircle, Send
} from 'lucide-react';
import { generateArchitecture, chatWithSAD, type ArchitectureResponse, type ArchNode, type ArchVariant, type ChatMessage } from '../services/nvidia-nim';

const EXAMPLE_PROMPTS = [
    "Build a patient triage agent that reads EMR records and routes patients based on symptom severity",
    "I need a financial analyst chatbot that can read 10-K SEC filings and answer complex questions",
    "Create a manufacturing defect detection system that analyzes images from factory cameras",
    "Build a cybersecurity agent that monitors network logs and detects CVE vulnerabilities in real-time",
    "I want a customer support agent that can search our knowledge base and escalate to humans when needed",
    "Design an HR onboarding assistant that helps new employees navigate company policies using internal docs",
];

// SAD section config
const SAD_SECTIONS: { key: keyof ArchitectureResponse['sad']; title: string; icon: React.ReactNode; color: string; mono?: boolean }[] = [
    { key: 'overview', title: 'Executive Summary', icon: <ClipboardCheck size={14} />, color: 'var(--nv-green)' },
    { key: 'assumptions', title: 'Assumptions & Constraints', icon: <Lightbulb size={14} />, color: '#ff9500' },
    { key: 'nfrs', title: 'Non-Functional Requirements', icon: <Zap size={14} />, color: '#38bdf8' },
    { key: 'data_flow', title: 'Data Flow & Integration', icon: <ArrowRight size={14} />, color: 'var(--nv-green)', mono: true },
    { key: 'security', title: 'Security & Compliance', icon: <Lock size={14} />, color: '#ff4d6a' },
    { key: 'operations', title: 'Operations & SLA', icon: <Server size={14} />, color: '#ab47bc' },
    { key: 'cost_notes', title: 'Cost Breakdown & TCO', icon: <BadgeDollarSign size={14} />, color: 'var(--nv-green)' },
];

// Accent colors cycled for dynamic next-step cards
const STEP_ACCENTS = ['var(--nv-green)', '#ffa726', '#ff4d6a', '#38bdf8', '#ab47bc'];
const STEP_ICONS = [
    <Sparkles size={16} />,
    <ClipboardCheck size={16} />,
    <Lock size={16} />,
    <BadgeDollarSign size={16} />,
    <Layers size={16} />,
];

const PromptToProd = () => {
    const [promptInput, setPromptInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ArchitectureResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [animatingIndex, setAnimatingIndex] = useState(-1);
    const [selectedVariant, setSelectedVariant] = useState(0);
    const [costMultiplier, setCostMultiplier] = useState(1.0);
    const [expandedSadSections, setExpandedSadSections] = useState<Record<string, boolean>>({
        overview: true, assumptions: true, nfrs: true, data_flow: true,
        security: true, operations: true, cost_notes: true,
    });
    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const runGeneration = async () => {
        if (!promptInput.trim()) return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        setAnimatingIndex(-1);
        setSelectedVariant(0);
        setCostMultiplier(1.0);
        setChatMessages([]);
        setChatOpen(false);

        try {
            const response = await generateArchitecture(promptInput);
            setResult(response);
            animateFlow(response.variants[0]?.nodes.length || 0);
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes('API key') || err.message?.includes('401')) {
                setError('Missing or invalid NVIDIA API Key. Set VITE_NVIDIA_API_KEY in .env.');
            } else {
                setError(`Architecture generation failed: ${err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const animateFlow = (nodeCount: number) => {
        setAnimatingIndex(-1);
        for (let i = 0; i < nodeCount; i++) {
            setTimeout(() => setAnimatingIndex(i), (i + 1) * 500);
        }
    };

    const switchVariant = (i: number) => {
        setSelectedVariant(i);
        if (result) animateFlow(result.variants[i]?.nodes.length || 0);
    };

    const getNodeIcon = (type: string) => {
        switch (type) {
            case 'input': return <Zap size={24} />;
            case 'security': return <ShieldAlert size={24} />;
            case 'storage': return <Database size={24} />;
            case 'output': return <Server size={24} />;
            case 'external': return <Globe size={24} />;
            case 'process': return <Cpu size={24} />;
            default: return <Box size={24} />;
        }
    };

    const getNodeColor = (node: ArchNode, index: number) => {
        if (index > animatingIndex) return '#444';
        if (node.type === 'security') return '#ff9500';
        if (node.type === 'external') return '#38bdf8';
        return 'var(--nv-green)';
    };

    const toggleSadSection = (key: string) => {
        setExpandedSadSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const activeVariant: ArchVariant | null = result?.variants[selectedVariant] || null;

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>

            {/* Left: Prompt + Flow + Cost Sliders */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

                {/* Prompt Section — Reframed */}
                <div style={{ padding: '24px 32px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <Sparkles size={22} color="var(--nv-green)" />
                        <h2 style={{ margin: 0, color: 'var(--nv-green)', fontSize: '20px' }}>Discovery Accelerator</h2>
                    </div>
                    <p style={{ color: '#888', marginBottom: '16px', fontSize: '13px', lineHeight: 1.6 }}>
                        Describe any AI use case in plain English. Get a draft architecture and Solution Architecture Document in seconds —
                        a <strong style={{ color: 'var(--nv-green)' }}>sneak peek into the SA's brain</strong> that gives customers and sales teams a
                        <strong style={{ color: 'var(--nv-green)' }}> 10× head-start</strong> before the first call.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <input
                            type="text" value={promptInput}
                            onChange={(e) => setPromptInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && runGeneration()}
                            style={{
                                flex: 1, padding: '12px 14px', borderRadius: '6px',
                                backgroundColor: 'var(--nv-dark-grey)', border: '1px solid var(--nv-grey)',
                                color: 'var(--nv-white)', fontSize: '14px', outline: 'none',
                            }}
                            placeholder="e.g., Build a RAG chatbot for our internal HR knowledge base..."
                            disabled={isLoading}
                        />
                        <button className="nv-button" onClick={runGeneration} disabled={isLoading || !promptInput.trim()}
                            style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            {isLoading ? <Loader2 size={16} className="spin" /> : <Play size={16} fill="currentColor" />}
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                        {EXAMPLE_PROMPTS.map((p, i) => (
                            <button key={i} onClick={() => setPromptInput(p)}
                                className="example-prompt-chip"
                                style={{
                                    background: 'var(--nv-dark-grey)', border: '1px solid var(--nv-grey)',
                                    color: '#999', padding: '4px 10px', borderRadius: '14px', fontSize: '11px',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                            >
                                {p.length > 55 ? p.substring(0, 55) + '...' : p}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div style={{ margin: '0 32px 16px', padding: '12px', backgroundColor: 'rgba(255,51,51,0.1)', border: '1px solid #ff3333', borderRadius: '6px', color: '#ff3333', fontSize: '13px' }}>
                        {error}
                    </div>
                )}

                {/* Variant Tabs + Flow */}
                {result && activeVariant && (
                    <div style={{ padding: '0 32px' }}>
                        {/* Variant Tabs */}
                        {result.variants.length > 1 && (
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                {result.variants.map((v, i) => (
                                    <button key={i} onClick={() => switchVariant(i)}
                                        style={{
                                            padding: '8px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                                            border: i === selectedVariant ? '1px solid var(--nv-green)' : '1px solid var(--nv-grey)',
                                            background: i === selectedVariant ? 'rgba(118,185,0,0.12)' : 'var(--nv-dark-grey)',
                                            color: i === selectedVariant ? 'var(--nv-green)' : '#aaa',
                                            fontWeight: i === selectedVariant ? 700 : 400,
                                        }}>
                                        {v.variant_name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px', fontStyle: 'italic' }}>
                            {activeVariant.variant_rationale}
                        </p>

                        {/* Architecture Flow */}
                        <div style={{
                            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', padding: '20px',
                            backgroundColor: 'var(--nv-darker-grey)', borderRadius: '8px', border: '1px solid var(--nv-grey)', marginBottom: '20px',
                        }}>
                            {activeVariant.nodes.map((node, i) => (
                                <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                        transition: 'all 0.4s', opacity: i <= animatingIndex ? 1 : 0.25,
                                        transform: i <= animatingIndex ? 'scale(1)' : 'scale(0.85)',
                                    }}>
                                        <div style={{
                                            width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--nv-darker-grey)',
                                            border: `2px solid ${getNodeColor(node, i)}`, display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', color: getNodeColor(node, i), transition: 'all 0.4s',
                                        }}>
                                            {getNodeIcon(node.type)}
                                        </div>
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: i <= animatingIndex ? 'var(--nv-white)' : '#555', textAlign: 'center', maxWidth: '80px', lineHeight: '1.3' }}>
                                            {node.label}
                                        </span>
                                        {node.subtitle && (
                                            <span style={{ fontSize: '8px', color: '#888', textAlign: 'center', maxWidth: '90px', lineHeight: 1.2, fontStyle: 'italic' }}>
                                                {node.subtitle}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '8px', color: node.type === 'external' ? '#38bdf8' : 'var(--nv-green)', textAlign: 'center', maxWidth: '80px' }}>
                                            {node.product}
                                        </span>
                                    </div>
                                    {i < activeVariant.nodes.length - 1 && (
                                        <ArrowRight size={14} color={i < animatingIndex ? 'var(--nv-green)' : '#333'} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Cost Estimate */}
                        <div style={{
                            padding: '16px 20px', backgroundColor: 'var(--nv-dark-grey)', borderRadius: '8px',
                            border: '1px solid var(--nv-grey)', marginBottom: '16px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--nv-white)' }}>Estimated Cloud OpEx</h4>
                                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--nv-green)' }}>
                                    ${Math.round((result.variants[selectedVariant]?.estimated_monthly_cost || 2500) * costMultiplier).toLocaleString()}/mo
                                </span>
                            </div>

                            <SliderRow
                                label="Query Volume"
                                min={0.25} max={3} step={0.25} value={costMultiplier}
                                onChange={setCostMultiplier}
                                leftLabel="10K/day" rightLabel="150K/day"
                                displayValue={`${Math.round(costMultiplier * 50)}K/day`}
                            />

                            <div style={{ marginTop: '12px', fontSize: '11px', color: '#888' }}>
                                {result.sad.cost_notes?.map((note, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                                        borderBottom: i < result.sad.cost_notes.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    }}>
                                        <span style={{ color: '#ccc', flex: 1 }}>• {note}</span>
                                    </div>
                                ))}
                            </div>

                            <p style={{ marginTop: '8px', fontSize: '10px', color: '#555', fontStyle: 'italic' }}>
                                Estimates based on cloud-managed NIM. Self-hosted on DGX differs — your SA can scope exact pricing.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════ Right: Expanded SAD Panel ═══════════ */}
            <div style={{ flex: 1, overflowY: 'auto', borderLeft: '1px solid var(--nv-grey)', backgroundColor: 'rgba(15,15,15,0.5)' }}>

                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--nv-grey)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '16px', margin: 0 }}>Solution Architecture Document</h2>
                        <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#666' }}>AI-drafted · SA-refined</p>
                    </div>
                    <span style={{
                        fontSize: '9px', fontWeight: 800, padding: '3px 8px', borderRadius: '3px', textTransform: 'uppercase',
                        backgroundColor: result ? 'var(--nv-green)' : '#444',
                        color: result ? 'var(--nv-black)' : '#888',
                    }}>
                        {result ? 'AI-GENERATED' : 'AWAITING INPUT'}
                    </span>
                </div>

                {/* Empty state */}
                {!result && !isLoading && (
                    <div style={{ padding: '40px 24px', color: '#444', fontSize: '13px', textAlign: 'center' }}>
                        <Cpu size={40} color="#333" style={{ marginBottom: '12px' }} />
                        <p style={{ marginBottom: '8px' }}>Describe your use case to generate a Solution Architecture Document.</p>
                        <p style={{ fontSize: '11px', color: '#555', lineHeight: 1.5 }}>
                            The AI-generated SAD gives you and your SA a shared starting point —
                            covering architecture, assumptions, security, costs, and operations.
                        </p>
                    </div>
                )}

                {/* Loading state */}
                {isLoading && (
                    <div style={{ padding: '48px 24px', color: 'var(--nv-green)', fontSize: '13px', textAlign: 'center' }}>
                        <Loader2 size={40} className="spin" style={{ marginBottom: '12px' }} />
                        <p>Consulting Llama-3.3 70B NIM...</p>
                    </div>
                )}

                {/* SAD Content */}
                {result && (
                    <div style={{ fontSize: '13px', lineHeight: '1.5' }}>

                        {/* Use Case Title */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Use Case</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--nv-green)' }}>{result.use_case_title}</div>
                        </div>

                        {/* Collapsible SAD Sections */}
                        {SAD_SECTIONS.map(section => (
                            <div key={section.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <button
                                    onClick={() => toggleSadSection(section.key)}
                                    style={{
                                        width: '100%', padding: '12px 24px', background: 'none', border: 'none',
                                        color: 'var(--nv-white)', cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600,
                                        textAlign: 'left',
                                    }}
                                >
                                    {expandedSadSections[section.key]
                                        ? <ChevronDown size={14} color="#888" />
                                        : <ChevronRight size={14} color="#888" />
                                    }
                                    <span style={{ color: section.color, display: 'flex', alignItems: 'center' }}>{section.icon}</span>
                                    <span>{section.title}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#555' }}>
                                        {(result.sad[section.key as keyof typeof result.sad] as string[] | undefined)?.length || 0} items
                                    </span>
                                </button>

                                {expandedSadSections[section.key] && (
                                    <ul style={{ margin: 0, padding: '0 24px 12px 48px', listStyle: 'none' }}>
                                        {((result.sad[section.key as keyof typeof result.sad] as string[]) || []).map((item: string, i: number) => (
                                            <li key={i} style={{
                                                padding: '3px 0', color: '#ccc', fontSize: section.mono ? '11px' : '12px',
                                                fontFamily: section.mono ? 'monospace' : 'inherit',
                                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                            }}>
                                                <span style={{ color: section.color, marginRight: '6px' }}>•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}

                        {/* ═══ NVIDIA vs Market ═══ */}
                        {result.sad.nvidia_vs_market && result.sad.nvidia_vs_market.length > 0 && (
                            <div style={{ padding: '16px 24px', borderTop: '2px solid var(--nv-grey)' }}>
                                <h4 style={{
                                    fontSize: '13px', margin: '0 0 12px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    color: '#38bdf8',
                                }}>
                                    ⚡ NVIDIA vs Market Alternatives
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {result.sad.nvidia_vs_market.map((item, i) => (
                                        <div key={i} style={{
                                            padding: '12px 14px', borderRadius: '8px',
                                            backgroundColor: 'var(--nv-dark-grey)',
                                            border: '1px solid var(--nv-grey)',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--nv-green)' }}>
                                                    {item.nvidia_product}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#888' }}>
                                                    vs {item.market_alternative}
                                                </span>
                                            </div>
                                            <p style={{
                                                margin: 0, fontSize: '11px', color: '#bbb', lineHeight: 1.5,
                                                borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px',
                                            }}>
                                                <strong style={{ color: 'var(--nv-green)' }}>NVIDIA edge:</strong> {item.nvidia_usp}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ═══ Recommended Next Steps (LLM-generated) ═══ */}
                        {result.next_steps && result.next_steps.length > 0 && (
                            <div style={{ padding: '20px 24px', borderTop: '2px solid var(--nv-grey)' }}>
                                <h3 style={{
                                    fontSize: '14px', margin: '0 0 4px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    color: 'var(--nv-green)',
                                }}>
                                    <Sparkles size={16} /> Recommended Next Steps
                                </h3>
                                <p style={{ fontSize: '11px', color: '#777', margin: '0 0 14px' }}>
                                    Tailored to <strong style={{ color: '#ccc' }}>{result.use_case_title}</strong> — here's what to tackle first:
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {result.next_steps.map((step, i) => {
                                        const accent = STEP_ACCENTS[i % STEP_ACCENTS.length];
                                        const icon = STEP_ICONS[i % STEP_ICONS.length];
                                        return (
                                            <div key={i} className="next-step-card" style={{
                                                padding: '12px 14px',
                                                backgroundColor: 'var(--nv-dark-grey)',
                                                border: '1px solid var(--nv-grey)',
                                                borderLeft: `3px solid ${accent}`,
                                                borderRadius: '6px',
                                                display: 'flex', gap: '12px', alignItems: 'flex-start',
                                                cursor: 'default',
                                                transition: 'all 0.2s ease',
                                            }}>
                                                <div style={{ color: accent, marginTop: '1px', flexShrink: 0 }}>{icon}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--nv-white)', marginBottom: '2px' }}>
                                                        {i + 1}. {step.title}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#999', lineHeight: 1.5 }}>
                                                        {step.description}
                                                    </div>
                                                </div>
                                                <ArrowRightCircle size={14} color="#555" style={{ marginTop: '2px', flexShrink: 0 }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ═══ Questions to Ask Your SA ═══ */}
                        {result.sa_questions && result.sa_questions.length > 0 && (
                            <div style={{ padding: '16px 24px 24px', borderTop: '1px solid rgba(118,185,0,0.15)' }}>
                                <h4 style={{
                                    fontSize: '13px', margin: '0 0 10px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    color: '#ffa726',
                                }}>
                                    💡 Questions to explore in your discovery call
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {result.sa_questions.map((q, i) => (
                                        <div key={i} style={{
                                            padding: '10px 14px',
                                            backgroundColor: 'rgba(255,167,38,0.05)',
                                            border: '1px solid rgba(255,167,38,0.15)',
                                            borderRadius: '6px',
                                            fontSize: '12px', color: '#ccc', lineHeight: 1.5,
                                            fontStyle: 'italic',
                                        }}>
                                            "{q}"
                                        </div>
                                    ))}
                                </div>
                                <p style={{ marginTop: '8px', fontSize: '10px', color: '#555' }}>
                                    These questions help unlock expertise that only a Solutions Architect can provide —
                                    turning this draft into a production-ready plan.
                                </p>
                            </div>
                        )}

                        {/* ═══ Chat with the SAD ═══ */}
                        {result && (
                            <div style={{ borderTop: '2px solid var(--nv-grey)' }}>
                                {/* Chat toggle header */}
                                <div
                                    onClick={() => setChatOpen(!chatOpen)}
                                    style={{
                                        padding: '12px 24px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        backgroundColor: chatOpen ? 'rgba(118,185,0,0.05)' : 'transparent',
                                        transition: 'background 0.2s',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--nv-green)', fontSize: '13px', fontWeight: 600 }}>
                                        <MessageCircle size={16} />
                                        Ask about this architecture
                                    </div>
                                    <ChevronDown size={14} color="#666" style={{ transform: chatOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                </div>

                                {chatOpen && (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {/* Messages */}
                                        <div style={{
                                            maxHeight: '300px', overflowY: 'auto', padding: '12px 24px',
                                            display: 'flex', flexDirection: 'column', gap: '10px',
                                        }}>
                                            {chatMessages.length === 0 && (
                                                <p style={{ color: '#555', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                                                    Ask any question about the {result.use_case_title} architecture, costs, security, or deployment.
                                                </p>
                                            )}
                                            {chatMessages.map((msg, i) => (
                                                <div key={i} style={{
                                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                    maxWidth: '85%',
                                                    padding: '10px 14px',
                                                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                                    backgroundColor: msg.role === 'user' ? 'rgba(118,185,0,0.15)' : 'var(--nv-dark-grey)',
                                                    border: `1px solid ${msg.role === 'user' ? 'rgba(118,185,0,0.3)' : 'var(--nv-grey)'}`,
                                                    fontSize: '12px', lineHeight: 1.6,
                                                    color: msg.role === 'user' ? 'var(--nv-white)' : '#ccc',
                                                    whiteSpace: 'pre-wrap',
                                                }}>
                                                    {msg.content}
                                                </div>
                                            ))}
                                            {isChatLoading && (
                                                <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '12px' }}>
                                                    <Loader2 size={14} className="spin" /> Thinking...
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Input bar */}
                                        <div style={{
                                            padding: '10px 24px 14px', display: 'flex', gap: '8px',
                                            borderTop: '1px solid var(--nv-grey)',
                                        }}>
                                            <input
                                                type="text" value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !isChatLoading && chatInput.trim()) {
                                                        const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
                                                        const updatedMessages = [...chatMessages, userMsg];
                                                        setChatMessages(updatedMessages);
                                                        setChatInput('');
                                                        setIsChatLoading(true);
                                                        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                                        chatWithSAD(result, updatedMessages).then(reply => {
                                                            setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
                                                            setIsChatLoading(false);
                                                            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                                                        }).catch(() => {
                                                            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
                                                            setIsChatLoading(false);
                                                        });
                                                    }
                                                }}
                                                placeholder="e.g., Why did you pick Milvus over PGVector?"
                                                disabled={isChatLoading}
                                                style={{
                                                    flex: 1, padding: '8px 12px', borderRadius: '6px',
                                                    backgroundColor: 'var(--nv-dark-grey)', border: '1px solid var(--nv-grey)',
                                                    color: 'var(--nv-white)', fontSize: '12px', outline: 'none',
                                                }}
                                            />
                                            <button
                                                disabled={isChatLoading || !chatInput.trim()}
                                                onClick={() => {
                                                    if (!chatInput.trim()) return;
                                                    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
                                                    const updatedMessages = [...chatMessages, userMsg];
                                                    setChatMessages(updatedMessages);
                                                    setChatInput('');
                                                    setIsChatLoading(true);
                                                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                                    chatWithSAD(result, updatedMessages).then(reply => {
                                                        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
                                                        setIsChatLoading(false);
                                                        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                                                    }).catch(() => {
                                                        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
                                                        setIsChatLoading(false);
                                                    });
                                                }}
                                                style={{
                                                    padding: '8px 12px', borderRadius: '6px', border: 'none',
                                                    backgroundColor: !chatInput.trim() || isChatLoading ? '#333' : 'var(--nv-green)',
                                                    color: !chatInput.trim() || isChatLoading ? '#666' : 'var(--nv-black)',
                                                    cursor: !chatInput.trim() || isChatLoading ? 'not-allowed' : 'pointer',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub-components ---

const SliderRow = ({ label, min, max, step, value, onChange, leftLabel, rightLabel, displayValue }: {
    label: string; min: number; max: number; step: number; value: number;
    onChange: (v: number) => void; leftLabel: string; rightLabel: string; displayValue: string;
}) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#aaa' }}>{label}</span>
            <span style={{ fontSize: '11px', color: 'var(--nv-green)', fontWeight: 600 }}>{displayValue}</span>
        </div>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#76b900', height: '4px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: '#666' }}>{leftLabel}</span>
            <span style={{ fontSize: '10px', color: '#666' }}>{rightLabel}</span>
        </div>
    </div>
);

export default PromptToProd;
