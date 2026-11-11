#!/usr/bin/env python3
"""[COMPLETED one-shot migration] Rebrand EEMA/ایما -> SALIRA/سالیارا (2026-11-11).

Ran once across the repo: 151 substitutions in 26 text files, then renamed
src/components/eema -> src/components/salira. Kept as the migration record —
re-running it is a harmless no-op (patterns are already satisfied).

Rules that were applied (order matters):
1. Strip the old tagline from meta/OG strings ("بدون شعار" decision).
2. Domain placeholder: eema.tools -> salira.example (before generic replace).
3. Case-aware brand replacement: EEMA->SALIRA, Eema->Salira, eema->salira.
4. Persian brand: ایما -> سالیارا.
"""
import os, re, sys

ROOT = "/home/z/my-project"
SKIP_DIRS = {".git", "node_modules", "upload", "download", ".credentials",
             "skills", ".next", "db", "__pycache__"}
EXTS = {".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".md", ".txt",
        ".json", ".svg", ".py", ".prisma"}

STEPS = [
    (re.compile(r" — آتلیه\S+ اینترنت آزاد"), "", "strip fa tagline"),
    (re.compile(r" — The Free-Internet Atelier"), "", "strip en tagline"),
    (re.compile(r"eema\.tools"), "salira.example", "domain placeholder"),
    (re.compile(r"EEMA"), "SALIRA", "brand upper"),
    (re.compile(r"Eema"), "Salira", "brand title"),
    (re.compile(r"eema"), "salira", "brand lower"),
    (re.compile(r"ایما"), "سالیارا", "brand fa"),
]

changed = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fn in filenames:
        p = os.path.join(dirpath, fn)
        if os.path.splitext(fn)[1].lower() not in EXTS:
            continue
        try:
            txt = open(p, encoding="utf-8").read()
        except (UnicodeDecodeError, PermissionError):
            continue
        new, n = txt, 0
        for rx, rep, _ in STEPS:
            new, k = rx.subn(rep, new)
            n += k
        if n and new != txt:
            open(p, "w", encoding="utf-8").write(new)
            print(f"{n:4}  {os.path.relpath(p, ROOT)}")
            changed += 1

print("files changed on this run:", changed)
sys.exit(0)
