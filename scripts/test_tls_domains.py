"""Test candidate TLS_DOMAINs with mtprotoproxy's own get_encrypted_cert logic."""
import asyncio, sys
sys.path.insert(0, "/home/z/my-project/mtproto")
import importlib.util

spec = importlib.util.spec_from_file_location("mtp", "/home/z/my-project/mtproto/mtprotoproxy.py")
mtp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mtp)

DOMAINS = [
    "www.bing.com",
    "www.wikipedia.org",
    "cdn.jsdelivr.net",
    "www.samsung.com",
    "www.reddit.com",
    "www.speedtest.net",
    "www.mozilla.org",
    "images.apple.com",
]

async def test_domain(domain):
    try:
        task = mtp.get_encrypted_cert(domain, 443, domain)
        cert = await asyncio.wait_for(task, timeout=8)
        if not cert:
            return f"{domain:22s} -> no cert (not TLS 1.3?)"
        return f"{domain:22s} -> OK, cert len={len(cert)}"
    except Exception as E:
        return f"{domain:22s} -> FAIL: {type(E).__name__}: {E}"

async def main():
    for r in await asyncio.gather(*[test_domain(d) for d in DOMAINS]):
        print(r)

asyncio.run(main())
