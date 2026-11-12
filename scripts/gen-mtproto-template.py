#!/usr/bin/env python3
"""Generate src/lib/mtproto-app-template.ts from mtproto/app.py.

The kata /api/proxy/kata route embeds the MTProto proxy app.py as a string
constant so it can run on Cloudflare Workers (no node:fs there). Keep
mtproto/app.py as the source of truth; re-run this script after editing it:

    python3 scripts/gen-mtproto-template.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "mtproto" / "app.py"
DST = ROOT / "src" / "lib" / "mtproto-app-template.ts"

content = SRC.read_text(encoding="utf-8")
payload = json.dumps(content, ensure_ascii=False)

DST.write_text(
    "// AUTO-GENERATED from mtproto/app.py by scripts/gen-mtproto-template.py — do not edit by hand.\n"
    "// Regenerate: python3 scripts/gen-mtproto-template.py\n"
    "export const MTPROTO_APP_PY = " + payload + ";\n",
    encoding="utf-8",
)
print(f"[gen-template] {SRC.name} ({len(content)} chars) -> {DST.relative_to(ROOT)}")
