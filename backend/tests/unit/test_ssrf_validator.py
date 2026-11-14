from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.tools.ssrf import (
    SSRFSecurityError,
    safe_fetch_url,
    validate_url_ssrf,
)


def test_validate_url_ssrf_allowed():
    # Valid public URL should pass without error
    validate_url_ssrf("https://en.wikipedia.org/wiki/Artificial_intelligence")
    validate_url_ssrf("https://arxiv.org/abs/2301.00001")


def test_validate_url_ssrf_blocked_schemes():
    with pytest.raises(SSRFSecurityError) as exc_info:
        validate_url_ssrf("file:///etc/passwd")
    assert "Unsupported URL protocol" in str(exc_info.value)

    with pytest.raises(SSRFSecurityError):
        validate_url_ssrf("ftp://example.com/file")

    with pytest.raises(SSRFSecurityError):
        validate_url_ssrf("gopher://example.com")


def test_validate_url_ssrf_blocked_direct_ips():
    # Localhost
    with pytest.raises(SSRFSecurityError) as exc_info:
        validate_url_ssrf("http://127.0.0.1:8000/api/v1/health")
    assert "forbidden" in str(exc_info.value).lower()

    # Private network RFC 1918 (10.x.x.x)
    with pytest.raises(SSRFSecurityError):
        validate_url_ssrf("http://10.0.0.5/admin")

    # Private network RFC 1918 (192.168.x.x)
    with pytest.raises(SSRFSecurityError):
        validate_url_ssrf("http://192.168.1.1/router")

    # Private network RFC 1918 (172.16.x.x)
    with pytest.raises(SSRFSecurityError):
        validate_url_ssrf("http://172.16.0.1/internal")

    # Cloud Instance Metadata IP (169.254.169.254)
    with pytest.raises(SSRFSecurityError) as meta_err:
        validate_url_ssrf("http://169.254.169.254/latest/meta-data")
    assert "metadata" in str(meta_err.value).lower()


def test_validate_url_ssrf_dns_resolution_private():
    # Domain that resolves to 127.0.0.1 or 10.0.0.1
    mock_addr_info = [(2, 1, 0, "", ("10.200.1.5", 80))]

    with patch("socket.getaddrinfo", return_value=mock_addr_info):
        with pytest.raises(SSRFSecurityError) as exc_info:
            validate_url_ssrf("http://malicious-internal-domain.com")
        assert "private network" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_safe_fetch_url_blocks_redirect_to_metadata():
    # Server redirects to AWS metadata endpoint
    redirect_resp = httpx.Response(
        status_code=302,
        headers={"Location": "http://169.254.169.254/latest/meta-data"},
        request=httpx.Request("GET", "https://public-site.com"),
    )

    with patch("app.tools.ssrf.validate_url_ssrf") as mock_validate:
        # Initial check passes, but second check on redirect triggers SSRF error
        mock_validate.side_effect = [None, SSRFSecurityError("Blocked metadata")]
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = redirect_resp
            with pytest.raises(SSRFSecurityError) as exc_info:
                await safe_fetch_url("https://public-site.com")
            assert "Blocked metadata" in str(exc_info.value)
