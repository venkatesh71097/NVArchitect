# NVArchitect — Interview Demo Talking Points

## 🎯 Setup Context (15 sec, say once before both demos)
> "NVArchitect is a tool I built to simulate what an NVIDIA Solutions Architect does in a customer discovery call — it turns a use case description into a production-grade Solution Architecture Document, then lets the customer simulate the ROI of switching from their current stack to NVIDIA."

---

## Page 1 — Discovery Accelerator (≤ 1 min)

### Use Case: Enterprise Healthcare RAG Pipeline

**Prompt to type:**
> *"We're a healthcare company with 2 million patient records, clinical notes, and radiology reports in PDF. Doctors need to query this in real-time during consultations — sub-2 second responses, 500 concurrent users, strict HIPAA: data cannot leave our VPC."*

### What to say while it generates (~20 sec):
> "Instead of spending 2 weeks drafting an architecture doc, a junior SA can get a complete starting point in 10 seconds. The key insight NVIDIA sells here is: a cloud-hosted LLM like GPT-4o fails immediately on this requirement — data leaves your VPC on every call. That's the compliance gap."

### When the result appears, point out (in order):
1. **Architecture diagram** → "NV-Embed + NeMo Retriever + Llama-3 NIM — all self-hostable, data stays in VPC. This is what differentiates NVIDIA from OpenAI for regulated industries."
2. **Variants** → "Click the self-hosted variant — the system automatically separates OpEx from CapEx. A DGX H100 is $320K one-time, but the break-even vs cloud API is ~2.5 years. That's the CFO conversation NVIDIA Sales needs to have."
3. **Cost card** → "The amber CapEx box only appears for self-hosted variants — cloud API variants stay pure OpEx. The model knows the difference."
4. **Ask an SA question** (SA Questions section) → "These are questions I'd ask the customer's architect: 'What's your chunking strategy for radiology PDFs — fixed-size risks splitting DICOM metadata.' That's the depth the tool surfaces."

### Closing line:
> "This compressed a 3-day discovery + architecture session into 30 seconds. The NVIDIA SA focus shifts from slide-building to value-add conversations."

---

## Page 2 — ROI Simulator (≤ 1 min)

### Use Case: Healthcare — Patient Triage Agent (GPT-4o → Llama-3 NIM)

### What to say at the start:
> "The ROI Simulator starts pre-loaded with the customer's *actual current stack* — not hypothetical baselines. Here, they're using OpenAI GPT-4o API for patient triage. The problem: $15/1K requests is expensive at scale, PHI leaves their VPC on every call, and there's no way to fine-tune on their clinical notes. These are the three things NVIDIA solves."

### Demo steps to narrate:
1. **Show the amber incumbent cards** → "The orange cards are what they're running today — GPT-4o API pre-selected. Metrics show 8.5s latency and $15/1K cost at baseline. The ⚠️ note says: 'PHI leaves your VPC on every call.' That's the hook."
2. **Click "✦ NVIDIA Upgrade"** on the Llama-3 NIM card → "I switch to NIM — latency drops to 2s, cost drops to $5/1K. The diagram turns green. That's a 4.2× improvement, cited from NVIDIA GTC 2024 benchmarks."
3. **Switch to On-Prem DGX** in the deployment selector → "If they want full control — On-Prem mode adds the CapEx line: $80K one-time hardware, hardware payback ~10 months from the $320K/yr savings."
4. **Show the ROI formula in the panel** → "The $320K/yr isn't a made-up number. It's: $15 minus $5 per 1K requests × 32 million requests/year. Every figure traces back to unit economics."

### Closing line:
> "In a 30-minute SA call, this is the slide that converts a technical conversation into a procurement conversation. The customer can see their exact dollars saved, per product, with the math shown."

---

## Key NVIDIA Differentiators to mention (if asked)
| Dimension | GPT-4o API | NVIDIA NIM |
|-----------|-----------|------------|
| Data residency | Leaves VPC | Stays in VPC |
| Fine-tuning | Not possible | NeMo Customizer QLoRA |
| Cost at scale | $15/1K req | $5/1K req (self-hosted) |
| HIPAA compliance | Risk | By design (VPC) |
| Latency (P90, 100 users) | 8.5s | 2.0s |
