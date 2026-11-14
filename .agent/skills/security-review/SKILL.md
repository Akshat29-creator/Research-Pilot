---
name: security-review
description: Comprehensive security audit procedures for ResearchPilot AI, addressing OWASP Top 10 for LLM Applications, prompt injection, SSRF, authentication, authorization, secret management, and dependency audits.
---

# Security Review & Hardening Skill

## When to Use
Use when auditing code, running security scans, implementing authentication/authorization policies, testing prompt injection defenses, reviewing external integrations, and preparing for production releases.

## Threat Model & Attack Surface
1. **Indirect Prompt Injection**: Hostile third-party web content or malicious PDFs attempting to hijack agent control flow.
2. **Server-Side Request Forgery (SSRF)**: Malicious search targets or crafted URLs aiming at internal network services or cloud metadata.
3. **Cross-Tenant Data Leakage**: Accessing or mutating another user's research sessions, documents, or reports.
4. **Denial of Service (DoS)**: Exhausting GPU VRAM, flooding the LLM semaphore, or uploading massive documents.
5. **Credential / Secret Exposure**: Leaking API keys, JWT signing keys, or database credentials.

## Step-by-Step Procedure

### 1. OWASP Top 10 for LLMs Audit
- **LLM01 (Prompt Injection)**: Ensure all external text is wrapped in strict XML delimiters (`<untrusted_source_document>`) and that agent prompts explicitly instruct the model to treat content as data only.
- **LLM02 (Insecure Output Handling)**: Sanitize markdown outputs before rendering in the frontend to prevent stored XSS.
- **LLM04 (Model Denial of Service)**: Enforce request rate limiting (via Redis), file upload size caps (5MB max), and bounded token output limits (`max_tokens`).
- **LLM06 (Sensitive Information Disclosure)**: Sanitize system prompts and logs to ensure internal credentials, API keys, or private user data are never emitted.

### 2. Authentication & Authorization Audits
- Verify all `/api/v1/*` routes (except `/auth/*` and public `/health`) require `current_user: User = Depends(get_current_user)`.
- Inspect all SQL queries and repository methods to ensure filtering by `user_id = current_user.id`.
- Test IDOR (Insecure Direct Object Reference) vulnerabilities: attempt to fetch session `A` while authenticated as user `B`. Must return HTTP 404 or 403.

### 3. Outbound Request & SSRF Hardening
- Audit `app/integrations/search/` and `app/integrations/extraction/web.py`.
- Ensure IP resolution verifies that resolved IPs do not belong to private CIDR blocks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`).
- Disable automatic redirect following across different domains or enforce re-validation on redirects.

### 4. Dependency & Secret Scanning
- Run `pip-audit` or `safety check` on Python dependencies in `backend/`.
- Run `npm audit` on frontend packages in `frontend/`.
- Scan workspace for committed credentials using `gitleaks detect` or equivalent regex scanning.

## Verification Checklist
- [ ] No hardcoded secrets anywhere in the codebase.
- [ ] `.env` is ignored by Git; `.env.example` contains only safe placeholders.
- [ ] All database queries filter by tenant/user ownership.
- [ ] SSRF defenses block internal IP ranges and cloud metadata IPs.
- [ ] Prompt injection tests confirm that malicious instructions in sources are ignored.
- [ ] Frontend markdown renderer sanitizes HTML to prevent XSS.

## Common Mistakes to Avoid
- **Relying on Hostname Filtering Alone**: Checking that a URL isn't `localhost` without resolving DNS allows DNS rebinding attacks to `127.0.0.1`.
- **Soft Authorization**: Verifying user ownership in the frontend UI while omitting backend ownership checks in API routes.
- **Committing Test `.env` Files**: Accidentally staging `.env.test` containing real database or third-party API credentials.
- **Unrestricted File Uploads**: Accepting arbitrary file types or unlimited file sizes during document ingestion.
