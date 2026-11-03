#!/usr/bin/env python3
"""Build dist/Cap-skill-<version>.zip and its .sha256 after validating."""

import hashlib
from pathlib import Path
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'dist', '__pycache__', '.git', '.DS_Store'}


def main():
    check = subprocess.run([sys.executable, '-I', str(ROOT / 'scripts/validate.py')])
    if check.returncode:
        return check.returncode
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    name = f'Cap-skill-{version}'
    out = ROOT / 'dist' / f'{name}.zip'
    out.parent.mkdir(exist_ok=True)
    files = sorted(p for p in ROOT.rglob('*')
                   if p.is_file() and not SKIP & set(p.relative_to(ROOT).parts))
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            info = zipfile.ZipInfo(f'{name}/{path.relative_to(ROOT).as_posix()}', (2026, 10, 31, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())
    digest = hashlib.sha256(out.read_bytes()).hexdigest()
    (out.parent / f'{name}.zip.sha256').write_text(f'{digest}  {out.name}\n', encoding='utf-8')
    print(f'{out.relative_to(ROOT)}  {len(files)} files\nSHA-256 {digest}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
