from app.tools.web_extractor import extract_web_content


def test_extract_web_content_basic():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Advances in Multi-Agent AI Systems</title>
        <link rel="canonical" href="https://example.com/ai/agents" />
        <script>console.log("tracking script");</script>
        <style>body { background: #000; }</style>
    </head>
    <body>
        <nav><a href="/">Home</a><a href="/login">Login</a></nav>
        <header><h1>Header Navigation</h1></header>
        <main>
            <article>
                <h2>Autonomous Reasoning Frameworks</h2>
                <p>Multi-agent architectures demonstrate superior reasoning loops.</p>
                <p>Grounding checks eliminate hallucination with provenance.</p>
            </article>
        </main>
        <aside class="sidebar-advert">Ad banner here</aside>
        <footer><p>&copy; 2026 Research Labs. All rights reserved.</p></footer>
    </body>
    </html>
    """
    res = extract_web_content(sample_html, "https://example.com/ai/agents?utm_source=twitter")

    assert res.title == "Advances in Multi-Agent AI Systems"
    assert res.url == "https://example.com/ai/agents"
    assert "Autonomous Reasoning Frameworks" in res.text
    assert "Grounding checks eliminate hallucination" in res.text

    # Boilerplate stripped
    assert "tracking script" not in res.text
    assert "Header Navigation" not in res.text
    assert "Ad banner here" not in res.text
    assert "All rights reserved" not in res.text
    assert res.char_count > 0
    assert res.word_count > 0


def test_extract_web_content_empty():
    res = extract_web_content("", "https://empty.com")
    assert res.text == ""
    assert res.char_count == 0
    assert res.word_count == 0
