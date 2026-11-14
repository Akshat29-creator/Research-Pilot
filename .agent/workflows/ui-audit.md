# UI & Frontend Audit Workflow (`/ui-audit`)

## Purpose
Perform an end-to-end visual and functional audit of the running Next.js frontend across desktop and mobile form factors. Inspect real browser interactions, console errors, failed network requests, accessibility compliance, and state transitions without resorting to mockups.

## Step-by-Step Execution Procedure

### Step 1: Pre-Audit Environment Check
1. Confirm frontend dev server is active and accessible:
   ```bash
   curl -I http://localhost:3000
   ```
2. Confirm backend API and SSE streaming endpoints are reachable:
   ```bash
   curl -I http://localhost:8000/api/v1/health
   ```

### Step 2: Multi-Viewport Inspection
Inspect each key route at standard viewports:
- **Desktop (1920x1080 / 1440x900)**: Full widescreen experience, multi-column research dashboard, agent trace sidebar.
- **Mobile (375x812 - iPhone SE/X equivalent)**: Single-column responsive layout, collapsable navigation, responsive modals, touch-friendly tap targets (>= 44x44px).

Target Routes to Audit:
1. `/` (Landing page with sample queries)
2. `/login` and `/register` (Authentication forms and validation)
3. `/dashboard` (Active research sessions and usage stats)
4. `/research/[id]` (Live execution view, SSE stream, agent timeline, approval dialogs)
5. `/reports/[id]` (Markdown report viewer, citation popovers, export actions)
6. `/settings` (Model selection, provider keys, data export/deletion)

### Step 3: State Verification
For every route, systematically verify:
- **Loading State**: Visual skeletons render during data fetching without layout shift (CLS).
- **Empty State**: Friendly, actionable placeholders render when no data exists.
- **Error State**: Explicit error boundary UI displays meaningful messages when backend returns 5xx/4xx.
- **Active / Streaming State**: Token-by-token or chunk-by-chunk updates stream smoothly without UI freezing.

### Step 4: Network & Console Inspection
1. Inspect browser console for JavaScript exceptions, uncaught promises, or hydration mismatches.
2. Inspect network tab for:
   - Failed API requests (HTTP 4xx/5xx).
   - Broken image, font, or stylesheet assets.
   - Long-polling leaks or duplicated SSE connections.

### Step 5: Accessibility & Usability (a11y)
1. Contrast ratios meet WCAG 2.1 AA standards (minimum 4.5:1 for normal text).
2. Keyboard navigation works through all interactive elements (Tab, Enter, Space, Escape on modals).
3. ARIA labels present on icon-only buttons.

### Step 6: Fix & Retest
1. Fix all identified frontend issues in the actual source code.
2. Never replace real API integrations with mock data to "pass" the audit.
3. Re-verify the page in the browser and report empirical findings.
