import enum
import logging
import re
from dataclasses import dataclass
from typing import List, Sequence

logger = logging.getLogger("researchpilot.services.citation")


class VerificationStatus(enum.StrEnum):
    """Factual grounding validation status."""

    VERIFIED = "VERIFIED"
    PARTIAL = "PARTIAL"
    UNVERIFIED = "UNVERIFIED"


@dataclass(frozen=True)
class CitationVerification:
    """Outcome of grounding validation for a single claim against evidence chunks."""

    claim_text: str
    citation_ref: str | None
    status: VerificationStatus
    confidence_score: float
    matched_snippet: str | None
    reason: str


@dataclass(frozen=True)
class CitationAuditReport:
    """Consolidated audit report across all claims in a research draft."""

    total_claims: int
    verified_claims: int
    partial_claims: int
    unverified_claims: int
    grounding_ratio: float
    is_passing: bool
    verifications: List[CitationVerification]


def normalize_text_for_matching(text: str) -> str:
    """Normalize text by lowercasing, stripping special characters and collapsing whitespace."""
    if not text:
        return ""
    # Remove punctuation except alphanumeric and single spaces
    lowered = text.lower()
    cleaned = re.sub(r"[^\w\s]", " ", lowered)
    return " ".join(cleaned.split())


def extract_ngrams(tokens: List[str], n: int = 3) -> set[tuple[str, ...]]:
    """Extract token n-grams from a token sequence."""
    if len(tokens) < n:
        return {tuple(tokens)} if tokens else set()
    return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}


def compute_ngram_jaccard(claim: str, reference: str, n: int = 3) -> float:
    """Calculate n-gram Jaccard similarity between claim and reference text."""
    claim_tokens = normalize_text_for_matching(claim).split()
    ref_tokens = normalize_text_for_matching(reference).split()

    if not claim_tokens or not ref_tokens:
        return 0.0

    claim_ngrams = extract_ngrams(claim_tokens, n)
    ref_ngrams = extract_ngrams(ref_tokens, n)

    if not claim_ngrams or not ref_ngrams:
        return 0.0

    intersection = claim_ngrams.intersection(ref_ngrams)
    # Asymmetric coverage: what proportion of the claim's n-grams exist in the reference?
    return len(intersection) / len(claim_ngrams)


def verify_claim_against_chunks(
    claim_text: str,
    chunks: Sequence[str],
    citation_ref: str | None = None,
    min_pass_score: float = 0.50,
) -> CitationVerification:
    """Verify whether a single claim is grounded in the provided evidence chunks.

    Uses a two-tier evaluation strategy:
    1. Exact normalized substring containment.
    2. Token 3-gram asymmetric containment (coverage).
    """
    clean_claim = claim_text.strip()
    if not clean_claim:
        return CitationVerification(
            claim_text=claim_text,
            citation_ref=citation_ref,
            status=VerificationStatus.UNVERIFIED,
            confidence_score=0.0,
            matched_snippet=None,
            reason="Empty claim text provided.",
        )

    norm_claim = normalize_text_for_matching(clean_claim)
    best_score = 0.0
    best_snippet: str | None = None

    for chunk in chunks:
        norm_chunk = normalize_text_for_matching(chunk)

        # 1. Exact normalized substring check
        if norm_claim in norm_chunk:
            return CitationVerification(
                claim_text=clean_claim,
                citation_ref=citation_ref,
                status=VerificationStatus.VERIFIED,
                confidence_score=1.0,
                matched_snippet=chunk[:200] + ("..." if len(chunk) > 200 else ""),
                reason="Exact normalized substring match in evidence corpus.",
            )

        # 2. Token 3-gram coverage
        ngram_score = compute_ngram_jaccard(clean_claim, chunk, n=3)
        if ngram_score > best_score:
            best_score = ngram_score
            best_snippet = chunk[:200] + ("..." if len(chunk) > 200 else "")

    if best_score >= 0.70:
        status = VerificationStatus.VERIFIED
        reason = f"High n-gram overlap ({best_score:.2f}) with evidence text."
    elif best_score >= min_pass_score:
        status = VerificationStatus.PARTIAL
        reason = f"Moderate n-gram overlap ({best_score:.2f}); partial grounding."
    else:
        status = VerificationStatus.UNVERIFIED
        reason = (
            f"Insufficient textual evidence (coverage {best_score:.2f} < "
            f"{min_pass_score:.2f})."
        )

    return CitationVerification(
        claim_text=clean_claim,
        citation_ref=citation_ref,
        status=status,
        confidence_score=best_score,
        matched_snippet=best_snippet,
        reason=reason,
    )


def extract_claims_with_citations(markdown_text: str) -> List[tuple[str, str | None]]:
    """Parse a Markdown document and extract assertions containing footnote citations [^N]."""
    results: List[tuple[str, str | None]] = []
    lines = markdown_text.splitlines()

    for line in lines:
        stripped = line.strip()
        # Skip markdown headers, dividers, and reference lists
        if not stripped or stripped.startswith(("#", "---", "===", "[^")):
            continue

        # Look for [^N] citations
        citations = re.findall(r"\[\^(\w+)\]", stripped)
        if citations:
            # Strip footnote markup to get clean assertion text
            clean_assertion = re.sub(r"\[\^(\w+)\]", "", stripped).strip()
            # Remove leading bullet list dashes
            clean_assertion = re.sub(r"^[-*+]\s+", "", clean_assertion)
            if clean_assertion:
                for c in citations:
                    results.append((clean_assertion, f"[^{c}]"))
        else:
            # Claim without citation
            clean_assertion = re.sub(r"^[-*+]\s+", "", stripped)
            if len(clean_assertion) > 40:
                results.append((clean_assertion, None))

    return results


def audit_report_citations(
    markdown_report: str,
    evidence_chunks: Sequence[str],
    passing_threshold: float = 0.85,
) -> CitationAuditReport:
    """Execute complete factual grounding audit across all claims in a Markdown report."""
    extracted = extract_claims_with_citations(markdown_report)

    if not extracted:
        # If no explicit claims were parsed, treat report as passing if non-empty
        return CitationAuditReport(
            total_claims=0,
            verified_claims=0,
            partial_claims=0,
            unverified_claims=0,
            grounding_ratio=1.0,
            is_passing=True,
            verifications=[],
        )

    verifications: List[CitationVerification] = []
    verified_count = 0
    partial_count = 0
    unverified_count = 0

    for claim, ref in extracted:
        v = verify_claim_against_chunks(
            claim_text=claim,
            chunks=evidence_chunks,
            citation_ref=ref,
        )
        verifications.append(v)
        if v.status == VerificationStatus.VERIFIED:
            verified_count += 1
        elif v.status == VerificationStatus.PARTIAL:
            partial_count += 1
        else:
            unverified_count += 1

    total = len(extracted)
    # Weight verified as 1.0, partial as 0.5
    effective_score = (verified_count + 0.5 * partial_count) / total
    is_passing = effective_score >= passing_threshold

    return CitationAuditReport(
        total_claims=total,
        verified_claims=verified_count,
        partial_claims=partial_count,
        unverified_claims=unverified_count,
        grounding_ratio=effective_score,
        is_passing=is_passing,
        verifications=verifications,
    )
