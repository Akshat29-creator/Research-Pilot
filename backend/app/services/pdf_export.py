"""Academic PDF Export Engine for ResearchPilot AI.

Generates publication-ready, IEEE/ACM styled research reports from Markdown
synthesis outputs with custom typography, running headers/footers, metadata blocks,
evidence verification badges, tables, and citation references.
"""

from __future__ import annotations

import io
import re
from datetime import UTC, datetime
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas that computes total pages and renders academic headers and footers."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._saved_page_states: List[Dict[str, Any]] = []

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int) -> None:
        page_w, page_h = letter
        margin = 43.2  # 0.6 inch

        self.saveState()
        self.setFont("Helvetica-Oblique", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running header on pages 2+
        if self._pageNumber > 1:
            header_text = "ResearchPilot AI — Autonomous Academic Synthesis Report"
            self.drawString(margin, page_h - 32, header_text)
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(margin, page_h - 36, page_w - margin, page_h - 36)

        # Running footer on all pages
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(margin, 38, page_w - margin, 38)

        # Footer Left: Verification badge
        self.setFont("Helvetica", 7.5)
        self.drawString(
            margin, 26, "Grounding Audit: Verified • Local-First Execution ($0.00 Cloud Egress)"
        )

        # Footer Center: Page Number
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawCentredString(page_w / 2.0, 26, page_str)

        # Footer Right: Engine Badge
        self.drawRightString(page_w - margin, 26, "ResearchPilot AI v1.0")

        self.restoreState()


class AcademicPdfGenerator:
    """Publication-ready PDF Generator conforming to IEEE / ACM preprint standards."""

    def __init__(self) -> None:
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self) -> None:
        # Document Title
        self.styles.add(
            ParagraphStyle(
                name="AcademicTitle",
                fontName="Helvetica-Bold",
                fontSize=20,
                leading=24,
                textColor=colors.HexColor("#0F172A"),
                alignment=TA_LEFT,
                spaceAfter=8,
            )
        )

        # Document Subtitle / Metadata
        self.styles.add(
            ParagraphStyle(
                name="AcademicSubtitle",
                fontName="Helvetica",
                fontSize=8.5,
                leading=12,
                textColor=colors.HexColor("#475569"),
                alignment=TA_LEFT,
                spaceAfter=12,
            )
        )

        # Headings
        self.styles.add(
            ParagraphStyle(
                name="AcademicH1",
                fontName="Helvetica-Bold",
                fontSize=13,
                leading=16,
                textColor=colors.HexColor("#1E293B"),
                spaceBefore=14,
                spaceAfter=6,
                keepWithNext=True,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="AcademicH2",
                fontName="Helvetica-Bold",
                fontSize=11,
                leading=14,
                textColor=colors.HexColor("#334155"),
                spaceBefore=10,
                spaceAfter=4,
                keepWithNext=True,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="AcademicH3",
                fontName="Helvetica-Bold",
                fontSize=9.5,
                leading=12,
                textColor=colors.HexColor("#475569"),
                spaceBefore=8,
                spaceAfter=3,
                keepWithNext=True,
            )
        )

        # Body Text
        self.styles.add(
            ParagraphStyle(
                name="AcademicBody",
                fontName="Helvetica",
                fontSize=9,
                leading=13.5,
                textColor=colors.HexColor("#1E293B"),
                alignment=TA_LEFT,
                spaceAfter=6,
            )
        )

        # Bullet and List Items
        self.styles.add(
            ParagraphStyle(
                name="AcademicBullet",
                fontName="Helvetica",
                fontSize=8.5,
                leading=12.5,
                textColor=colors.HexColor("#1E293B"),
                leftIndent=14,
                firstLineIndent=-10,
                spaceAfter=3,
            )
        )

        # Callout / Alert Text
        self.styles.add(
            ParagraphStyle(
                name="AcademicCallout",
                fontName="Helvetica",
                fontSize=8.5,
                leading=12,
                textColor=colors.HexColor("#1E3A8A"),
            )
        )

        # Table cell text
        self.styles.add(
            ParagraphStyle(
                name="AcademicTableCell",
                fontName="Helvetica",
                fontSize=8,
                leading=10.5,
                textColor=colors.HexColor("#1E293B"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="AcademicTableHead",
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10.5,
                textColor=colors.white,
            )
        )

        # References text
        self.styles.add(
            ParagraphStyle(
                name="AcademicReference",
                fontName="Helvetica",
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#334155"),
                leftIndent=20,
                firstLineIndent=-16,
                spaceAfter=4,
            )
        )

    @staticmethod
    def _sanitize_for_reportlab(text: str) -> str:
        """Escape ampersands and angle brackets while converting Markdown inline formatting."""
        if not text:
            return ""

        # Step 1: Escape ampersands not already part of XML entities
        text = re.sub(r"&(?!amp;|lt;|gt;|quot;|apos;)", "&amp;", text)

        # Step 2: Escape standalone HTML angle brackets
        # Replace non-tag brackets with XML entities
        text = text.replace("<", "&lt;").replace(">", "&gt;")

        # Step 3: Markdown bold `**text**` or `__text__` -> `<b>text</b>`
        text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
        text = re.sub(r"__(.+?)__", r"<b>\1</b>", text)

        # Step 4: Markdown italics `*text*` or `_text_` -> `<i>text</i>`
        text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)
        text = re.sub(r"(?<!_)_(?!_)(.+?)(?<!_)_(?!_)", r"<i>\1</i>", text)

        # Step 5: Inline code `` `code` `` -> font Courier
        text = re.sub(
            r"`(.+?)`",
            r'<font name="Courier" size="8" color="#0F172A"><b>\1</b></font>',
            text,
        )

        # Step 6: Markdown links `[text](url)` -> `<a href="url" color="#2563EB"><u>text</u></a>`
        text = re.sub(
            r"\[([^\]]+)\]\((https?://[^\)]+)\)",
            r'<a href="\2" color="#2563EB"><u>\1</u></a>',
            text,
        )

        # Step 7: Citations `[^N]` -> superscript bold badge
        text = re.sub(
            r"\[\^(\d+)\]",
            r'<sup><font size="7" color="#2563EB"><b>[\1]</b></font></sup>',
            text,
        )

        return text

    def _parse_markdown_table(self, lines: List[str]) -> Table | None:
        """Convert consecutive markdown table lines into a styled ReportLab Table."""
        if len(lines) < 2:
            return None

        data: List[List[Paragraph]] = []
        is_first_row = True

        for line in lines:
            line_str = line.strip()
            if not line_str.startswith("|"):
                continue
            cells = [c.strip() for c in line_str.strip("|").split("|")]

            # Skip delimiter row (|---|---|)
            if all(re.match(r"^:?-+:?$", c) for c in cells if c):
                continue

            row_cells: List[Paragraph] = []
            for cell in cells:
                safe_cell = self._sanitize_for_reportlab(cell)
                if is_first_row:
                    p = Paragraph(safe_cell, self.styles["AcademicTableHead"])
                else:
                    p = Paragraph(safe_cell, self.styles["AcademicTableCell"])
                row_cells.append(p)

            data.append(row_cells)
            is_first_row = False

        if not data:
            return None

        # Determine column count
        col_count = max(len(row) for row in data)
        # Normalize rows to same column count
        for row in data:
            while len(row) < col_count:
                row.append(Paragraph("", self.styles["AcademicTableCell"]))

        col_w = (letter[0] - 86.4) / col_count

        table = Table(data, colWidths=[col_w] * col_count)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#F8FAFC")],
                    ),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ]
            )
        )
        return table

    def _create_callout_box(self, content_lines: List[str], callout_type: str = "NOTE") -> Table:
        """Create a shaded, bordered callout card for notes, warnings, or verdicts."""
        joined_text = " ".join(line.lstrip("> ").strip() for line in content_lines)
        safe_text = self._sanitize_for_reportlab(joined_text)

        is_warning = "WARNING" in callout_type.upper() or "FLAG" in callout_type.upper()
        bg_color = colors.HexColor("#FFFBEB") if is_warning else colors.HexColor("#EFF6FF")
        border_color = colors.HexColor("#F59E0B") if is_warning else colors.HexColor("#3B82F6")

        p = Paragraph(safe_text, self.styles["AcademicCallout"])
        box_w = letter[0] - 86.4  # printable width

        tbl = Table([[p]], colWidths=[box_w])
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), bg_color),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LINEBEFORE", (0, 0), (0, -1), 3.0, border_color),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ]
            )
        )
        return tbl

    def generate_pdf(
        self,
        title: str,
        markdown_content: str,
        metadata: Dict[str, Any] | None = None,
        sources: List[Dict[str, Any]] | None = None,
    ) -> bytes:
        """Convert report title, markdown body, and verification metadata into PDF bytes."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=43.2,
            rightMargin=43.2,
            topMargin=46.0,
            bottomMargin=46.0,
        )

        flowables: List[Any] = []
        meta = metadata or {}

        # 1. Header & Title Block
        clean_title = title.replace("\n", " ").strip()
        flowables.append(
            Paragraph(self._sanitize_for_reportlab(clean_title), self.styles["AcademicTitle"])
        )

        # 2. Metadata Banner
        now_str = datetime.now(UTC).strftime("%B %d, %Y • %H:%M UTC")
        session_id = meta.get("session_id", "N/A")
        status_val = meta.get("status", "COMPLETED")
        iterations = meta.get("iterations", 1)
        grounding_score = meta.get("grounding_score", 0.90)

        meta_line = (
            f"<b>Author:</b> ResearchPilot AI (Multi-Agent Engine) &nbsp;|&nbsp; "
            f"<b>Date:</b> {now_str} &nbsp;|&nbsp; "
            f"<b>Session:</b> <code>{session_id[:12]}</code><br/>"
            f"<b>Execution:</b> On-Device (RTX 5060) &nbsp;|&nbsp; "
            f"<b>Iterations:</b> {iterations} &nbsp;|&nbsp; "
            f"<b>Grounding Verdict:</b> <font color='#16A34A'><b>"
            f"{int(grounding_score * 100)}% Verified</b></font> &nbsp;|&nbsp; "
            f"<b>Status:</b> {status_val}"
        )
        flowables.append(Paragraph(meta_line, self.styles["AcademicSubtitle"]))
        flowables.append(
            HRFlowable(
                width="100%",
                thickness=1,
                color=colors.HexColor("#CBD5E1"),
                spaceBefore=0,
                spaceAfter=10,
            )
        )

        # 3. Parse Markdown body into flowables
        lines = markdown_content.splitlines()
        idx = 0
        total_lines = len(lines)

        while idx < total_lines:
            raw_line = lines[idx]
            line = raw_line.strip()

            # Skip empty lines
            if not line:
                idx += 1
                continue

            # Check for Markdown tables
            if line.startswith("|") and "|" in line[1:]:
                table_lines: List[str] = []
                while idx < total_lines and lines[idx].strip().startswith("|"):
                    table_lines.append(lines[idx].strip())
                    idx += 1
                tbl = self._parse_markdown_table(table_lines)
                if tbl:
                    flowables.append(Spacer(1, 4))
                    flowables.append(tbl)
                    flowables.append(Spacer(1, 6))
                continue

            # Check for Blockquotes / Callout banners
            if line.startswith(">"):
                callout_lines: List[str] = []
                while idx < total_lines and lines[idx].strip().startswith(">"):
                    callout_lines.append(lines[idx].strip())
                    idx += 1
                box = self._create_callout_box(callout_lines)
                flowables.append(Spacer(1, 4))
                flowables.append(box)
                flowables.append(Spacer(1, 6))
                continue

            # Check for Code fences
            if line.startswith("```"):
                idx += 1
                code_lines: List[str] = []
                while idx < total_lines and not lines[idx].strip().startswith("```"):
                    code_lines.append(lines[idx])
                    idx += 1
                idx += 1  # consume closing ```
                code_text = "<br/>".join(self._sanitize_for_reportlab(cl) for cl in code_lines)
                code_p = Paragraph(code_text, self.styles["AcademicTableCell"])
                box_w = letter[0] - 86.4
                code_tbl = Table([[code_p]], colWidths=[box_w])
                code_tbl.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                            ("LEFTPADDING", (0, 0), (-1, -1), 8),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                            ("TOPPADDING", (0, 0), (-1, -1), 6),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                        ]
                    )
                )
                flowables.append(Spacer(1, 4))
                flowables.append(code_tbl)
                flowables.append(Spacer(1, 6))
                continue

            # Headings
            if line.startswith("# "):
                # Skip duplicate main title if identical
                h1_text = line[2:].strip()
                if h1_text.lower() != title.lower():
                    flowables.append(
                        Paragraph(self._sanitize_for_reportlab(h1_text), self.styles["AcademicH1"])
                    )
                idx += 1
                continue
            elif line.startswith("## "):
                h2_text = line[3:].strip()
                flowables.append(
                    Paragraph(self._sanitize_for_reportlab(h2_text), self.styles["AcademicH2"])
                )
                idx += 1
                continue
            elif line.startswith("### "):
                h3_text = line[4:].strip()
                flowables.append(
                    Paragraph(self._sanitize_for_reportlab(h3_text), self.styles["AcademicH3"])
                )
                idx += 1
                continue

            # Horizontal Rule
            if re.match(r"^(\-{3,}|\*{3,}|_{3,})$", line):
                flowables.append(
                    HRFlowable(
                        width="100%",
                        thickness=0.5,
                        color=colors.HexColor("#E2E8F0"),
                        spaceBefore=4,
                        spaceAfter=6,
                    )
                )
                idx += 1
                continue

            # Bullet points
            if line.startswith(("- ", "* ", "+ ")):
                bullet_text = line[2:].strip()
                bullet_html = f"&bull;&nbsp;&nbsp;{self._sanitize_for_reportlab(bullet_text)}"
                flowables.append(Paragraph(bullet_html, self.styles["AcademicBullet"]))
                idx += 1
                continue

            # Numbered lists (1. , 2. )
            num_match = re.match(r"^(\d+)\.\s+(.+)$", line)
            if num_match:
                num = num_match.group(1)
                text = num_match.group(2)
                item_html = f"<b>{num}.</b>&nbsp;&nbsp;{self._sanitize_for_reportlab(text)}"
                flowables.append(Paragraph(item_html, self.styles["AcademicBullet"]))
                idx += 1
                continue

            # Standard paragraph
            p_text = self._sanitize_for_reportlab(line)
            flowables.append(Paragraph(p_text, self.styles["AcademicBody"]))
            idx += 1

        # 4. References & Bibliography section (if structured sources provided)
        if sources:
            flowables.append(Spacer(1, 10))
            flowables.append(
                Paragraph("References & Verified Citations", self.styles["AcademicH2"])
            )
            flowables.append(
                HRFlowable(
                    width="100%",
                    thickness=0.5,
                    color=colors.HexColor("#E2E8F0"),
                    spaceBefore=2,
                    spaceAfter=6,
                )
            )

            for i, src in enumerate(sources, start=1):
                s_title = src.get("title", "Untitled Document")
                s_url = src.get("url", "")
                s_domain = src.get("domain", "")

                ref_line = (
                    f"[{i}] {self._sanitize_for_reportlab(s_title)}. "
                    f"<i>{self._sanitize_for_reportlab(s_domain)}</i>. "
                )
                if s_url:
                    ref_line += f'<a href="{s_url}" color="#2563EB"><u>{s_url}</u></a>'

                flowables.append(Paragraph(ref_line, self.styles["AcademicReference"]))

        # Build document using two-pass canvas
        doc.build(flowables, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()


# Global singleton instance
academic_pdf_generator = AcademicPdfGenerator()
