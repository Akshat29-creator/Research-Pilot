---
name: nextjs-frontend
description: Standards and practices for the Next.js App Router frontend, TypeScript strict mode, Tailwind CSS, shadcn/ui components, real-time SSE streaming, and accessibility.
---

# Next.js Frontend Engineering Skill

## When to Use
Use when developing, modifying, or testing the Next.js web interface, UI components, state management, SSE/WebSocket streaming connections, API client, or accessibility features.

## Visual Design & Aesthetics
- **Theme**: Premium Dark SaaS (inspired by Linear, Vercel, and Perplexity).
- **Color Palette**: Rich dark background (`#09090b`, `#18181b`), crisp zinc/slate borders, restrained primary accent (e.g. emerald or indigo), high contrast text.
- **Typography & Motion**: Clean sans-serif (Inter/Geist), subtle transitions (`transition-all duration-200`), deliberate spacing, no distracting animations.

## Step-by-Step Procedure

### 1. Project Structure (Next.js 14+ App Router)
```
frontend/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Auth login
│   ├── register/page.tsx     # Auth register
│   └── (app)/                # Authenticated layout group
│       ├── dashboard/page.tsx
│       ├── research/
│       │   ├── [id]/page.tsx
│       │   └── [id]/trace/page.tsx
│       ├── reports/[id]/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── layout/               # Header, sidebar, shell
│   ├── research/             # Question input, source cards
│   ├── agents/               # Live agent activity timeline
│   └── report/               # Markdown viewer, citation previewer
├── lib/
│   ├── api.ts                # Typed API client
│   ├── stream.ts             # SSE event parser
│   └── types.ts              # Mirror of backend Pydantic schemas
└── hooks/
    ├── use-auth.ts
    └── use-research-stream.ts
```

### 2. Strict TypeScript & API Types
- Ensure `tsconfig.json` runs in strict mode (`"strict": true`).
- Keep TypeScript types in `lib/types.ts` strictly synchronized with backend schemas. No `any` types.

### 3. Server-Sent Events (SSE) Streaming
- Implement `useResearchStream(sessionId: string)` hook consuming `GET /api/v1/stream/{session_id}`.
- Handle streaming event types cleanly: `agent_started`, `source_discovered`, `analysis_updated`, `draft_chunk`, `review_verdict`, `workflow_completed`, `workflow_failed`.
- Automatically reconnect on transient network drops with exponential backoff.

### 4. UI States & Robustness
- **Loading State**: Render skeleton placeholders (`<Skeleton className="h-4 w-3/4" />`) instead of blank space.
- **Empty State**: Friendly, actionable empty state with suggested research prompts.
- **Error State**: Explicit error boundary and retry trigger.
- **Human Approval Modal**: Modal dialog prompting user to review and approve/reject sources or report drafts before resuming execution.

### 5. Accessibility (a11y) & Responsiveness
- Semantic HTML (`<main>`, `<nav>`, `<article>`, `<section>`).
- Full keyboard navigation (focus indicators, Escape key listeners on dialogs).
- Fully responsive across desktop (>= 1024px) and mobile (< 768px).

## Verification Checklist
- [ ] TypeScript compiles cleanly with zero errors (`tsc --noEmit`).
- [ ] Tailwind and shadcn/ui configured properly without broken CSS classes.
- [ ] All pages render meaningful loading, empty, and error states.
- [ ] Real SSE stream updates agent progress in real time without screen flickers.
- [ ] Source citation popover reveals verified excerpts.
- [ ] Mobile responsive layout tested at 375px viewport.

## Common Mistakes to Avoid
- **Simulated / Mocked Streaming**: Faking agent progress with `setTimeout()` in the frontend. All state updates must come from the backend stream.
- **Uncontrolled Re-renders**: Parsing SSE chunks in a way that triggers full-page re-renders on every token. Batch or isolate streaming text state.
- **Hardcoding API Base URLs**: Using `http://localhost:8000` directly in components. Use `NEXT_PUBLIC_API_URL` environment variables.
- **Ignoring Token Expiry**: Failing to catch HTTP 401 and redirect to `/login`.
