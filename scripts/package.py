#!/usr/bin/env python3
"""Create the single-file distribution using Python's standard library only.
Run from any directory: python3 scripts/package.py 0.0.1 [--output-dir dist]
This does not create tags, publish releases or install anything.
"""
import argparse
import hashlib
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def package(version, output_dir):
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?', version):
        raise ValueError('Expected a version such as 0.0.1')
    content = (ROOT / 'index.html').read_bytes()
    text = content.decode('utf-8')
    # License copies are part of the HTML, never discarded during packaging.
    if 'id="gpl-license"' not in text or 'GNU GENERAL PUBLIC LICENSE' not in text or 'id="qr-license"' not in text:
        raise ValueError('Embedded license notices are missing')
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    single = output_dir / 'SlideSeed.html'
    single.write_bytes(content)
    archive = output_dir / f'slideseed-{version}.zip'
    entry = zipfile.ZipInfo('SlideSeed.html', date_time=(1980, 1, 1, 0, 0, 0))
    entry.compress_type = zipfile.ZIP_DEFLATED
    entry.create_system = 3
    entry.external_attr = 0o100644 << 16
    with zipfile.ZipFile(archive, 'w') as z:
        z.writestr(entry, content)
    with zipfile.ZipFile(archive) as z:
        if z.namelist() != ['SlideSeed.html'] or z.testzip() or z.read('SlideSeed.html') != content:
            raise ValueError('Archive validation failed')
    checksum = output_dir / f'slideseed-{version}.sha256'
    checksum.write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n' for p in [single, archive]), encoding='utf-8')
    return single, archive, checksum

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    for path in package(args.version, args.output_dir):
        print(path)
