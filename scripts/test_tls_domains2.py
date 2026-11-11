"""Test candidate TLS_DOMAINs with properly initialized proxy module."""
import os, asyncio, sys
os.chdir("/home/z/my-project/mtproto")  # so runpy.run_module("config") finds config.py
sys.path.insert(0, os.getcwd())

import importlib.util
spec = importlib.util.spec_from_file_location("mtp", "/home/z/my-project/mtproto/mtprotoproxy.py")
mtp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mtp)
mtp.init_config()

DOMAINS = [
    "www.bing.com",
    "www.wikipedia.org",
    "cdn.jsdelivr.net",
    "www.samsung.com",
    "www.reddit.com",
    "www.speedtest.net",
    "www.mozilla.org",
    "images.apple.com",
    "www.mysql.com",
    "dl.google.com",
    "www.xiaomi.com",
    "download.docker.com",
]

async def test_domain(domain):
    try:
        task = mtp.get_encrypted_cert(domain, 443, domain)
        cert = await asyncio.wait_for(task, timeout=8)
        if not cert:
            return f"{domain:22s} -> WARN: no cert (not TLS 1.3)"
        ok = "OK " if len(cert) >= 1024 else "SHORT"
        return f"{domain:22s} -> {ok}, cert len={len(cert)}"
    except Exception as E:
        return f"{domain:22s} -> FAIL: {type(E).__name__}: {E}"

async def main():
    for r in await asyncio.gather(*[test_domain(d) for d in DOMAINS]):
        print(r)

asyncio.run(main())
