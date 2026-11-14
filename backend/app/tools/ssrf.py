import ipaddress
import logging
import socket
from urllib.parse import urlparse

import httpx

from app.core.errors import AppException

logger = logging.getLogger("researchpilot.security.ssrf")

# Maximum allowed download payload (5 MB)
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
DEFAULT_TIMEOUT = 10.0
MAX_REDIRECTS = 3


class SSRFSecurityError(AppException):
    """Raised when an outbound URL violates SSRF safety boundaries."""

    def __init__(self, message: str, url: str | None = None, ip: str | None = None):
        super().__init__(
            message=message,
            status_code=403,
            code="SSRF_SECURITY_VIOLATION",
            details={"url": url, "ip": ip},
        )


def validate_url_ssrf(url: str) -> None:
    """Validate that target URL uses http(s) and does not resolve to private or metadata IPs.

    Raises SSRFSecurityError if URL is unsafe.
    """
    if not url or not isinstance(url, str):
        raise SSRFSecurityError("Target URL is empty or invalid.", url=url)

    parsed = urlparse(url.strip())
    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise SSRFSecurityError(
            f"Unsupported URL protocol '{scheme}'. Only HTTP and HTTPS are permitted.",
            url=url,
        )

    hostname = parsed.hostname
    if not hostname:
        raise SSRFSecurityError("Target URL has no valid hostname.", url=url)

    # Check if hostname itself is an IP literal
    try:
        direct_ip = ipaddress.ip_address(hostname)
        _verify_ip_safety(direct_ip, url)
        return
    except ValueError:
        pass  # Hostname is a domain name, proceed to DNS resolution

    # Resolve domain name to IP addresses
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        logger.debug("DNS resolution failed for '%s': %s", hostname, str(e))
        raise SSRFSecurityError(f"DNS resolution failed for hostname '{hostname}'.", url=url) from e

    resolved_ips: set[str] = set()
    for item in addr_info:
        sockaddr = item[4]
        ip_str = str(sockaddr[0])
        resolved_ips.add(ip_str)

    for ip_str in resolved_ips:
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            _verify_ip_safety(ip_obj, url)
        except ValueError:
            raise SSRFSecurityError(f"Invalid resolved IP '{ip_str}'.", url=url, ip=ip_str)


def _verify_ip_safety(ip: ipaddress.IPv4Address | ipaddress.IPv6Address, url: str) -> None:
    """Verify an IP address is not private, loopback, link-local, or cloud metadata."""
    # 1. Cloud Instance Metadata explicit defense (169.254.169.254)
    if str(ip) == "169.254.169.254":
        raise SSRFSecurityError(
            "Access to cloud instance metadata service (169.254.169.254) is forbidden.",
            url=url,
            ip=str(ip),
        )

    # 2. Localhost and 0.0.0.0
    if str(ip) in ("0.0.0.0", "::"):
        raise SSRFSecurityError(
            "Access to unspecified address (0.0.0.0 / ::) is forbidden.",
            url=url,
            ip=str(ip),
        )

    # 3. Standard Private Network Blocks (RFC 1918)
    if ip.is_private:
        raise SSRFSecurityError(
            f"Access to private network IP ({ip}) is strictly forbidden.",
            url=url,
            ip=str(ip),
        )

    # 4. Loopback (127.0.0.0/8, ::1)
    if ip.is_loopback:
        raise SSRFSecurityError(
            f"Access to loopback IP ({ip}) is strictly forbidden.",
            url=url,
            ip=str(ip),
        )

    # 5. Link-Local / Multicast / Reserved
    if ip.is_link_local:
        raise SSRFSecurityError(
            f"Access to link-local IP ({ip}) is forbidden.",
            url=url,
            ip=str(ip),
        )

    if ip.is_multicast or ip.is_reserved:
        raise SSRFSecurityError(
            f"Access to reserved/multicast IP ({ip}) is forbidden.",
            url=url,
            ip=str(ip),
        )


async def safe_fetch_url(
    url: str,
    timeout: float = DEFAULT_TIMEOUT,
    max_bytes: int = MAX_RESPONSE_BYTES,
) -> str:
    """Safely fetch HTML/text content from external URL with SSRF checks on every hop."""
    current_url = url
    headers = {
        "User-Agent": "ResearchPilot-AI-Bot/1.0 (+https://researchpilot.local)",
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9",
    }

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for _ in range(MAX_REDIRECTS + 1):
            validate_url_ssrf(current_url)

            try:
                resp = await client.get(current_url, headers=headers)
            except httpx.ConnectError as e:
                raise SSRFSecurityError(
                    f"Connection failed to '{current_url}': {str(e)}", url=current_url
                ) from e
            except (httpx.TimeoutException, TimeoutError) as e:
                raise SSRFSecurityError(
                    f"Request timed out after {timeout}s for '{current_url}'.", url=current_url
                ) from e

            # Handle redirects safely
            if resp.status_code in (301, 302, 303, 307, 308):
                location = resp.headers.get("location")
                if not location:
                    raise SSRFSecurityError(
                        "Redirect received without Location header.", url=current_url
                    )
                # Resolve relative redirects
                parsed_location = urlparse(location)
                if not parsed_location.netloc:
                    base = urlparse(current_url)
                    location = f"{base.scheme}://{base.netloc}/{location.lstrip('/')}"
                current_url = location
                continue

            resp.raise_for_status()

            # Enforce size limit
            content_chunks = []
            bytes_read = 0
            async for chunk in resp.aiter_bytes():
                bytes_read += len(chunk)
                content_chunks.append(chunk)
                if bytes_read > max_bytes:
                    logger.warning(
                        "URL %s exceeded max bytes (%d); truncating", current_url, max_bytes
                    )
                    break

            raw_bytes = b"".join(content_chunks)
            encoding = resp.encoding or "utf-8"
            return raw_bytes.decode(encoding, errors="replace")

        raise SSRFSecurityError(f"Exceeded maximum redirect hops ({MAX_REDIRECTS}).", url=url)
