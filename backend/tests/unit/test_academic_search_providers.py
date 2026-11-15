"""Unit tests for arXiv and PubMed Academic Search Providers."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.integrations.search.arxiv import ArxivSearchProvider
from app.integrations.search.factory import get_search_provider, reset_search_provider
from app.integrations.search.pubmed import PubMedSearchProvider

SAMPLE_ARXIV_XML = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2104.08653v1</id>
    <title>Attention Is All You Need in Scientific Information Retrieval</title>
    <summary>We explore self-attention architectures for indexing scientific preprints.</summary>
    <published>2021-04-18T10:00:00Z</published>
    <updated>2021-04-18T10:00:00Z</updated>
    <author><name>Ashish Vaswani</name></author>
    <author><name>Noam Shazeer</name></author>
    <arxiv:doi>10.1145/3397271.3401075</arxiv:doi>
    <link title="pdf" href="http://arxiv.org/pdf/2104.08653v1" type="application/pdf"/>
    <category term="cs.IR"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2104.08653v1</id>
    <title>Duplicate Entry</title>
    <summary>Duplicate summary</summary>
  </entry>
</feed>
"""


@pytest.mark.asyncio
async def test_arxiv_provider_success():
    provider = ArxivSearchProvider(base_url="https://export.arxiv.org/api/query")

    mock_resp = httpx.Response(
        status_code=200,
        text=SAMPLE_ARXIV_XML,
        request=httpx.Request("GET", "https://export.arxiv.org/api/query"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        results = await provider.search("scientific information retrieval", max_results=5)

        # Duplicate ID was deduplicated
        assert len(results) == 1
        item = results[0]
        assert item.engine == "arxiv"
        assert item.domain == "arxiv.org"
        assert "Attention Is All You Need" in item.title
        assert "Ashish Vaswani" in item.metadata["authors"]
        assert item.metadata["pdf_url"] == "http://arxiv.org/pdf/2104.08653v1"
        assert item.metadata["doi"] == "10.1145/3397271.3401075"


@pytest.mark.asyncio
async def test_arxiv_provider_empty_query():
    provider = ArxivSearchProvider()
    results = await provider.search("")
    assert results == []


@pytest.mark.asyncio
async def test_arxiv_provider_network_error():
    provider = ArxivSearchProvider()
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Network unreachable")):
        results = await provider.search("query")
        assert results == []


@pytest.mark.asyncio
async def test_pubmed_provider_success():
    provider = PubMedSearchProvider(base_url="https://eutils.ncbi.nlm.nih.gov/entrez/eutils")

    search_mock = httpx.Response(
        status_code=200,
        json={"esearchresult": {"idlist": ["12345", "67890"]}},
        request=httpx.Request("GET", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"),
    )

    summary_mock = httpx.Response(
        status_code=200,
        json={
            "result": {
                "uids": ["12345", "67890"],
                "12345": {
                    "uid": "12345",
                    "title": "CRISPR-Cas9 Gene Editing in Oncology Therapeutics",
                    "source": "Nature Medicine",
                    "pubdate": "2024 Jan 15",
                    "authors": [{"name": "Doudna J"}, {"name": "Charpentier E"}],
                    "articleids": [{"idtype": "doi", "value": "10.1038/s41591-024-001"}],
                },
                "67890": {
                    "uid": "67890",
                    "title": "Machine Learning for Protein Folding",
                    "source": "Science",
                    "pubdate": "2024 Feb 01",
                    "authors": [{"name": "Hassabis D"}],
                    "articleids": [],
                },
            }
        },
        request=httpx.Request("GET", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [search_mock, summary_mock]
        results = await provider.search("CRISPR oncology", max_results=5)

        assert len(results) == 2
        first = results[0]
        assert first.engine == "pubmed"
        assert first.domain == "pubmed.ncbi.nlm.nih.gov"
        assert "CRISPR-Cas9" in first.title
        assert "Nature Medicine" in first.snippet
        assert first.metadata["pmid"] == "12345"
        assert "Doudna J" in first.metadata["authors"]


@pytest.mark.asyncio
async def test_pubmed_provider_empty_results():
    provider = PubMedSearchProvider()
    search_mock = httpx.Response(
        status_code=200,
        json={"esearchresult": {"idlist": []}},
        request=httpx.Request("GET", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"),
    )
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = search_mock
        results = await provider.search("nonexistent query 1234567")
        assert results == []


def test_factory_returns_arxiv_and_pubmed():
    reset_search_provider()
    arxiv = get_search_provider("arxiv")
    assert isinstance(arxiv, ArxivSearchProvider)

    reset_search_provider()
    pubmed = get_search_provider("pubmed")
    assert isinstance(pubmed, PubMedSearchProvider)
