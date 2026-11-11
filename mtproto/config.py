PORT = 20364

# name -> secret (32 hex chars)
USERS = {
    "tg":  "24dec90c1a1d069e389e4adf8d33beac",
}

MODES = {
    # Classic mode, easy to detect
    "classic": False,

    # Makes the proxy harder to detect
    "secure": True,

    # FakeTLS - looks like HTTPS traffic
    "tls": True
}

# The domain for TLS mode, bad clients are proxied there
# Use random existing domain, proxy checks it on start
TLS_DOMAIN = "cdn.jsdelivr.net"
