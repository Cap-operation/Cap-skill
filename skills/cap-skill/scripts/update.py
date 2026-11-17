#!/usr/bin/env python3
"""Check for and apply Cap-skill updates from the official GitHub releases.

Standard library only. Runs from an installed copy: <skills dir>/cap-skill/scripts/update.py.

  python3 update.py check     read-only: installed version against the latest official release
  python3 update.py apply     only after the user agreed: download, verify, install
  python3 update.py apply --from-zip FILE [--sha256 HEX]
                              offline: install a release package that is already on this computer

`apply` downloads the release package, checks its SHA-256 against the value GitHub publishes for
that file, checks every file against the package's own checksum list, and then runs the package's
own installer. The installer moves replaced modules into a backup folder and leaves modules the
user edited untouched. Nothing here runs on its own schedule, and `check` never changes anything.

On Windows use `py -3` instead of `python3`.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import ssl
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile

CA_BUNDLES = ('/etc/ssl/cert.pem', '/private/etc/ssl/cert.pem', '/etc/ssl/certs/ca-certificates.crt',
              '/etc/pki/tls/certs/ca-bundle.crt', '/etc/ssl/ca-bundle.pem')
REPO = 'Cap-operation/Cap-skill'
LATEST_API = f'https://api.github.com/repos/{REPO}/releases/latest'
DOWNLOAD_PREFIX = f'https://github.com/{REPO}/releases/download/'
MANIFEST = '.cap-tiktok-install.json'
BACKUP = '.cap-tiktok-backup'
MAX_PACKAGE_BYTES = 60 * 1024 * 1024
MAX_UNPACKED_BYTES = 300 * 1024 * 1024
MANUAL = (f'手动更新：到 https://github.com/{REPO}/releases 下载最新的 Cap-skill 安装包，'
          '按 README 的“检查更新”操作；用 npx 安装的，重新运行 npx skills add ' + REPO)


class UpdateError(Exception):
    pass


def version_key(text):
    """'v4.1.3' -> (4, 1, 3); None when the text is not a plain dotted version."""
    text = (text or '').strip().lstrip('vV')
    parts = text.split('.')
    if not text or not all(p.isdigit() for p in parts):
        return None
    return tuple(int(p) for p in parts)


def installed(dest):
    """Return (version or None, has_install_record)."""
    manifest = dest / MANIFEST
    if manifest.is_file():
        try:
            record = json.loads(manifest.read_text(encoding='utf-8'))
            if version_key(record.get('version')):
                return record['version'], True
        except (OSError, ValueError):
            pass
    marker = dest / 'cap-tiktok-prep' / 'VERSION'
    if marker.is_file():
        text = marker.read_text(encoding='utf-8').strip()
        if version_key(text):
            return text, False
    return None, False


def tls_context():
    """Certificate checking stays on. Some Python builds ship without a CA list (python.org
    builds on macOS until "Install Certificates" is run), so fall back to certifi or the
    operating system's own bundle instead of failing."""
    context = ssl.create_default_context()
    if context.cert_store_stats().get('x509_ca'):
        return context
    try:
        import certifi
        context.load_verify_locations(certifi.where())
        return context
    except Exception:  # certifi missing or unreadable: try the system bundles
        pass
    for candidate in CA_BUNDLES:
        if os.path.isfile(candidate):
            try:
                context.load_verify_locations(candidate)
                return context
            except (ssl.SSLError, OSError):
                continue
    return context


def get_with_curl(url, timeout, limit):
    """Second channel for machines whose Python cannot verify certificates: the system curl,
    which uses the operating system's trust store. Certificate checking stays on."""
    curl = shutil.which('curl')
    if not curl:
        return None
    result = subprocess.run(
        [curl, '-fsSL', '--max-time', str(timeout), '--max-filesize', str(limit),
         '-A', 'cap-skill-updater', '-H', 'Accept: application/vnd.github+json', url],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    if result.returncode != 0 or len(result.stdout) > limit:
        return None
    return result.stdout


def get_bytes(url, timeout, limit):
    """Download at most `limit` bytes over verified HTTPS."""
    request = urllib.request.Request(url, headers={
        'User-Agent': 'cap-skill-updater', 'Accept': 'application/vnd.github+json'})
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=tls_context()) as response:
            data = response.read(limit + 1)
    except urllib.error.HTTPError as error:
        if error.code in (403, 429):
            raise UpdateError('GitHub 暂时限制了查询次数，过一会儿再试。')
        if error.code == 404:
            raise UpdateError('官方仓库里还没有正式发布的版本。')
        raise UpdateError(f'GitHub 返回了错误（{error.code}）。')
    except (urllib.error.URLError, OSError) as error:
        reason = getattr(error, 'reason', error)
        data = get_with_curl(url, timeout, limit) if isinstance(reason, ssl.SSLError) else None
        if data is None:
            if isinstance(reason, ssl.SSLError):
                raise UpdateError('这台电脑的 Python 核对不了 GitHub 的证书，没法安全下载。')
            raise UpdateError('连不上 GitHub，检查网络后再试。')
    if len(data) > limit:
        raise UpdateError('GitHub 返回的内容比预期大得多，已停止。')
    return data


def latest_release():
    try:
        data = json.loads(get_bytes(LATEST_API, 20, 2 * 1024 * 1024).decode('utf-8'))
    except ValueError:
        raise UpdateError('GitHub 返回的内容读不懂。')
    version = (data.get('tag_name') or '').lstrip('vV')
    if not version_key(version):
        raise UpdateError('最新发布的版本号格式不对。')
    wanted = f'Cap-skill-{version}.zip'
    asset = next((a for a in data.get('assets', []) if a.get('name') == wanted), None)
    package = None
    if asset:
        digest = asset.get('digest') or ''
        package = {
            'name': wanted,
            'url': asset.get('browser_download_url') or '',
            'size_bytes': asset.get('size') or 0,
            'sha256': digest[len('sha256:'):] if digest.startswith('sha256:') else '',
        }
    return {'version': version, 'notes': (data.get('body') or '').strip(),
            'published_at': data.get('published_at'), 'package': package}


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def download(package, target):
    if not package['url'].startswith(DOWNLOAD_PREFIX):
        raise UpdateError('安装包的下载地址不在官方仓库里，已停止。')
    if not package['sha256']:
        raise UpdateError('GitHub 没有给出这个安装包的校验值，没法核对，已停止。')
    if package['size_bytes'] > MAX_PACKAGE_BYTES:
        raise UpdateError('安装包比预期大得多，已停止。')
    target.write_bytes(get_bytes(package['url'], 180, MAX_PACKAGE_BYTES))
    if sha256_of(target) != package['sha256']:
        raise UpdateError('下载到的安装包和 GitHub 公布的校验值对不上，已停止，没有安装。')


def unpack(archive, folder):
    """Extract a release package and return its root folder (the one holding modules.json)."""
    try:
        with zipfile.ZipFile(archive) as bundle:
            total = 0
            for item in bundle.infolist():
                parts = Path(item.filename.replace('\\', '/')).parts
                if item.filename.startswith(('/', '\\')) or '..' in parts or ':' in item.filename:
                    raise UpdateError('安装包里有不正常的文件路径，已停止。')
                total += item.file_size
            if total > MAX_UNPACKED_BYTES:
                raise UpdateError('安装包解压后比预期大得多，已停止。')
            bundle.extractall(folder)
    except zipfile.BadZipFile:
        raise UpdateError('安装包不是完整的压缩文件，已停止。')
    roots = [p.parent for p in folder.glob('*/modules.json')] + (
        [folder] if (folder / 'modules.json').is_file() else [])
    if len(roots) != 1:
        raise UpdateError('安装包的结构不对，已停止。')
    root = roots[0]
    for name in ('VERSION', 'SHA256SUMS.txt', 'scripts/install.py', 'skills'):
        if not (root / name).exists():
            raise UpdateError('安装包缺少必要的文件，已停止。')
    for line in (root / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
        expected, _, name = line.partition('  ')
        path = root / name
        if len(expected) != 64 or not name or not path.is_file() or sha256_of(path) != expected:
            raise UpdateError('安装包里的文件和它自带的校验清单对不上，已停止。')
    return root


def report(payload, code=0):
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return code


def check(args):
    dest = Path(args.dest).expanduser()
    current, recorded = installed(dest)
    release = latest_release()
    newer = bool(current) and version_key(release['version']) > version_key(current)
    payload = {
        'installed_version': current,
        'latest_version': release['version'],
        'update_available': newer,
        'install_record': recorded,
        'published_at': release['published_at'],
        'release_notes': release['notes'],
        'package': ({'name': release['package']['name'], 'size_bytes': release['package']['size_bytes']}
                    if release['package'] else None),
    }
    if not current:
        payload['next'] = '这台电脑上没找到已安装的 Cap-skill。' + MANUAL
    elif not newer:
        payload['next'] = '已经是最新版，不需要更新。'
    elif not recorded:
        payload['next'] = ('有新版，但这台电脑上的技能不是用安装器装的（没有安装记录），不能自动替换。'
                           '用 npx 安装的，重新运行 npx skills add ' + REPO + ' 即可更新。')
    elif not release['package']:
        payload['next'] = '有新版，但这次发布没有附带安装包。' + MANUAL
    else:
        payload['next'] = '有新版。把更新内容讲给用户，用户同意后再运行 apply。'
    return report(payload)


def apply(args):
    dest = Path(args.dest).expanduser()
    current, recorded = installed(dest)
    if not current:
        raise UpdateError('这台电脑上没找到已安装的 Cap-skill。')
    if not recorded:
        raise UpdateError('这台电脑上的技能不是用安装器装的（没有安装记录），不能自动替换。'
                          '用 npx 安装的，重新运行 npx skills add ' + REPO + ' 即可更新。')
    with tempfile.TemporaryDirectory(prefix='cap-skill-update-') as temp:
        temp = Path(temp)
        if args.from_zip:
            archive = Path(args.from_zip).expanduser()
            if not archive.is_file():
                raise UpdateError('找不到指定的安装包文件。')
            expected = (args.sha256 or '').strip().lower()
            sidecar = Path(str(archive) + '.sha256')
            if not expected and sidecar.is_file():
                expected = sidecar.read_text(encoding='utf-8').split()[0].lower()
            if len(expected) != 64:
                raise UpdateError('没有可核对的校验值：请提供 --sha256，或把 .sha256 文件放在安装包旁边。')
            if sha256_of(archive) != expected:
                raise UpdateError('安装包和给出的校验值对不上，已停止，没有安装。')
        else:
            release = latest_release()
            if version_key(release['version']) <= version_key(current):
                return report({'updated': False, 'installed_version': current,
                               'latest_version': release['version'], 'note': '已经是最新版，没有改动任何文件。'})
            if not release['package']:
                raise UpdateError('这次发布没有附带安装包。')
            archive = temp / release['package']['name']
            download(release['package'], archive)
        (temp / 'package').mkdir()
        root = unpack(archive, temp / 'package')
        target = (root / 'VERSION').read_text(encoding='utf-8').strip()
        if not version_key(target):
            raise UpdateError('安装包里的版本号格式不对，已停止。')
        if not args.from_zip and target != release['version']:
            raise UpdateError('安装包里的版本号和发布的版本号不一致，已停止。')
        if version_key(target) < version_key(current):
            raise UpdateError(f'安装包是 {target}，比现在装的 {current} 旧，不做降级。')
        result = subprocess.run(
            [sys.executable, '-I', str(root / 'scripts' / 'install.py'), 'install', '--dest', str(dest)],
            cwd=str(temp), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if result.returncode not in (0, 2):
            raise UpdateError('安装器没有跑完，技能文件可能没有更新。')
    record = json.loads((dest / MANIFEST).read_text(encoding='utf-8'))
    replaced = record.get('replaced', [])
    payload = {
        'updated': True,
        'from_version': current,
        'to_version': record.get('version'),
        'replaced': replaced,
        'created': record.get('created', []),
        'conflicts': record.get('conflicts', []),
        'backup': str(dest / BACKUP / record['stamp']) if replaced else None,
        'note': '更新完成。新开一个对话后新版才生效。',
    }
    if payload['conflicts']:
        payload['note'] += '有模块被用户改过，没有替换，见 conflicts。'
    return report(payload, 2 if payload['conflicts'] else 0)


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors='replace')
        except (AttributeError, ValueError):
            pass
    default_dest = str(Path(__file__).resolve().parents[2])
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest='command', required=True)
    one = sub.add_parser('check')
    one.add_argument('--dest', default=default_dest)
    two = sub.add_parser('apply')
    two.add_argument('--dest', default=default_dest)
    two.add_argument('--from-zip')
    two.add_argument('--sha256')
    args = parser.parse_args()
    try:
        return {'check': check, 'apply': apply}[args.command](args)
    except UpdateError as error:
        return report({'error': str(error), 'manual': MANUAL}, 1)


if __name__ == '__main__':
    sys.exit(main())
