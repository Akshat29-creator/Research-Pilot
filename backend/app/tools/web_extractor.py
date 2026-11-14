import re

from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

from app.integrations.search.base import canonicalize_url


class ExtractedWebContent(BaseModel):
    """Cleaned readability payload extracted from raw HTML."""

    title: str = Field(default="", description="Extracted web page title.")
    text: str = Field(description="Normalized readability plain text.")
    url: str = Field(description="Canonical source URL.")
    char_count: int = Field(default=0, description="Total characters in extracted text.")
    word_count: int = Field(default=0, description="Total words in extracted text.")


def extract_web_content(html: str, url: str) -> ExtractedWebContent:
    """Parse raw HTML and extract clean readable text stripped of boilerplate.

    Removes script, style, navigation, footer, and ads elements.
    """
    if not html or not html.strip():
        return ExtractedWebContent(title="", text="", url=canonicalize_url(url))

    soup = BeautifulSoup(html, "html.parser")

    # 1. Extract title
    title = ""
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        title = title_tag.string.strip()
    if not title:
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            title = str(og_title["content"]).strip()

    # 2. Extract canonical URL if present
    canonical_link = soup.find("link", rel="canonical")
    effective_url = url
    if canonical_link and canonical_link.get("href"):
        effective_url = str(canonical_link["href"])
    effective_url = canonicalize_url(effective_url)

    # 3. Remove non-content and boilerplate tags
    for tag in soup.find_all(
        [
            "script",
            "style",
            "noscript",
            "iframe",
            "header",
            "footer",
            "nav",
            "aside",
            "form",
            "svg",
            "button",
            "menu",
        ]
    ):
        tag.decompose()

    # 4. Remove elements with common advertisement or navigation classes/ids
    for element in soup.find_all(
        class_=re.compile(r"(cookie|banner|advert|sidebar|popup|modal)", re.I)
    ):
        element.decompose()

    # 5. Extract text
    text = soup.get_text(separator="\n", strip=True)

    # Normalize excessive newlines and whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = text.strip()

    words = text.split()

    return ExtractedWebContent(
        title=title or effective_url,
        text=text,
        url=effective_url,
        char_count=len(text),
        word_count=len(words),
    )
