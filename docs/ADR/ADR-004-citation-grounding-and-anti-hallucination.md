# ADR-004: Verifiable Citation Grounding & Anti-Hallucination Architecture

## Status
Accepted

## Context & Problem Statement
Autonomous AI research agents frequently suffer from hallucinations: inventing plausible-sounding facts, fabricating non-existent URLs or DOIs, and misattributing real facts to sources that do not contain them. For ResearchPilot AI to be an authoritative research tool, every claim made in the final report must be strictly verifiable against real retrieved evidence.

## Considered Options
1. **Two-Stage Multi-Agent Grounding with Substring Verification (Selected)**
2. **Post-Hoc Regex URL Extraction**
3. **Pure Prompt Engineering ("Please do not hallucinate")**
4. **Single-Pass Generation**

## Decision Outcome
Chosen option: **Two-Stage Grounding with Substring Citation Verification**, because:
- **Separation of Concerns**:
  - The **Writer Agent** is strictly provided with extracted evidence snippets enclosed in `<untrusted_source_document>` tags and instructed to synthesize findings using citation markers (e.g. `[1]`, `[2]`).
  - The **Reviewer Agent** runs an independent audit pass evaluating factual support against the provided evidence snippets.
- **Deterministic Substring Matching**: The Citation Verifier takes every cited quote in the report and verifies that the string (or high-similarity fuzzy match) actually exists within the stored raw text of the assigned `source_id` or `document_id`.
- **Automated Feedback Loop**: If the Reviewer detects an unsupported claim or invalid citation, the draft is rejected with explicit structured feedback, and returned to the Writer for revision (capped at 3 iterations).

## Consequences
- **Positive**:
  - Eliminates fabricated URLs and fake academic citations.
  - Builds user trust through interactive citation popovers showing exact highlighted quotes and page numbers.
- **Negative / Trade-offs**:
  - Multi-pass review increases end-to-end report generation latency (adds 1-2 additional LLM calls per research session).
