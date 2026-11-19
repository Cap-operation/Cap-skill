#!/usr/bin/env python3
"""Build the WorkBuddy edition: one merged skill package for the WorkBuddy open platform.

  python3 scripts/build_workbuddy.py     -> dist/Cap-skill-<version>-WorkBuddy.zip (+ .sha256)

Standard library only. The repository's own files are never modified; all work happens in a
temporary copy.

1. Copy skills/ and drop the modules in DROP (device, network and account preparation, the
   course entry that depends on them, and repository maintenance).
2. Apply the text patches in `patch()`. Every patch must match exactly: when the source text
   changes, the build stops and names the patch to review instead of shipping stale wording.
3. Rebuild the hub SKILL.md for this edition from the source hub, with the front matter fields
   the platform reads.
4. Regenerate the capability card for the modules that remain.
5. Merge everything into one skill folder that is only two levels deep, which is all the
   platform accepts (skill folder / one folder / file): the hub SKILL.md at the root, its
   references in references/, and one folder per module whose entry file is renamed MODULE.md
   and whose other files are flattened, with "__" standing for each former folder level
   (references/library/x/guide.md -> references__library__x__guide.md). Relative links and
   back-ticked paths are rewritten to match.
6. The workbench tool kit (scripts and assets that only work in their original tree) ships
   flat as well, next to a generated unpack_kit.py that rebuilds the tree on the user's machine.
7. The platform limits the package to 3 MB both zipped and unpacked. The method libraries are
   two thirds of the unpacked size, so each method keeps its main text (guide.md) only: the
   methods' supplementary reference files and the helper notes are left out, links to them
   become plain text, and the capability card is recounted from what ships. The RGBA sprites
   are converted to 256-colour PNGs.
8. Check the result: two levels only, links resolve, the kit unpacks byte for byte, no banned
   terms, one SKILL.md, required front matter.
9. Write the zip with the skill folder at its top level; stop if it is over either size limit.
"""

import hashlib
import importlib.util
import json
import math
from collections import Counter
from pathlib import Path
import posixpath
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
HUB = 'cap-skill'
DROP = {
    'cap-tiktok-ip-purchase', 'cap-tiktok-ip-diagnostics', 'cap-tiktok-shadowrocket-treehole',
    'cap-tiktok-apple-id', 'cap-tiktok-device-reset', 'cap-tiktok-computer-prep', 'cap-tiktok-prep',
    'cap-tiktok-governance',
}
SKIP_FILES = {
    'cap-skill/scripts/update.py',            # updates come from the platform's own market
    'cap-skill/references/module-index.md',   # index of the dropped preparation modules
}
FRONT_MATTER = [
    ('name', 'cap-skill'),
    ('display_name', '船长跨境电商 Cap-skill'),
    ('display_name_en', 'Cap-skill Cross-border E-commerce'),
    ('description', '"船长跨境电商总入口。判断你要做的事，再分派给选品、拆解、建站、上架、投流、客服六位大师，以及工作台、流量（独立站 SEO 与 GEO）、营销、社媒、岗位（财务法务人事采购）、知识库大师和开店经营、运营诊断模块，并汇总结果。问 TikTok Shop 或独立站经营、不知道该用哪个模块时使用；说“船长，亮家底”，或问“你有什么功能”“你能做什么”“有哪些模块”时也使用，输出能力总览卡片。"'),
    ('description_zh', '"跨境电商经营助手：选品、爆款文案拆解、独立站建站、商品上架、广告投放分析、客服、工作台、独立站流量、营销、社媒、后台岗位和知识库，一个入口分派给对应的大师。"'),
    ('description_en', '"Hub skill for cross-border e-commerce sellers (TikTok Shop and independent stores). Routes each task to a specialist: product selection, script breakdown, site building, listing, ads analysis, customer service, workbench, SEO and GEO traffic, marketing, social media, back-office roles and knowledge base. Replies in Chinese."'),
    ('category', '电商'),
    ('version', None),   # filled from VERSION
    ('author', '船长电商'),
]
BANNED = [
    r'翻墙', r'科学上网', r'梯子', r'(?i)\bVPN\b', r'小火箭', r'(?i)shadowrocket', r'树洞', r'(?i)socks5',
    r'住宅 ?IP', r'静态 ?IP', r'IP ?购买', r'IP ?检测', r'换 ?IP', r'IP 归属', r'(?i)911proxy', r'(?i)iproyal',
    r'(?i)pixelscan', r'(?i)iphey', r'(?i)proxy (?:location|server|pass)\b', r'(?i)residential prox',
    r'代理认证', r'代理软件', r'代理服务', r'本代理', r'加速镜像', r'订阅链接', r'网络环境模块',
    r'闲鱼', r'二手平台', r'租来的账号', r'课前准备', r'爱思', r'刷机', r'Apple ID', r'NotebookLM', r'Google 账号',
    r'cap-tiktok-(?:prep|computer-prep|device-reset|apple-id|shadowrocket-treehole|ip-purchase|ip-diagnostics|governance)',
    r'scripts/update\.py', r'module-index',
]
# Harmless inside the third-party SEO library (a list of Google crawler names), banned elsewhere.
LIBRARY_ALLOWED = {r'NotebookLM'}
TEXT = {'.md', '.py', '.js', '.json', '.html', '.css', '.yaml', '.yml', '.txt', '.svg', '.command', '.bat', ''}
MAX_ZIP_BYTES = 3 * 1000 * 1000   # the platform refuses packages over 3 MB; stay under the stricter reading
MAX_UNPACKED_BYTES = 3 * 1024 * 1024   # and anything that unpacks to more than 3145728 bytes
UNPACKED_HEADROOM = 16 * 1024     # stay this far under it
MIN_PSNR = 40.0                   # image quality floor for the 256-colour conversion
OVERVIEW_WORDING = [   # how the card's numbers are counted, said in this edition's flat layout
    ('本文件由仓库脚本 `scripts/update_overview.py` 按实际文件生成，数字不手填，校验器会核对；不要手改。',
     '本文件在打包时按实际文件生成，数字不手填；不要手改。'),
    ('| 模块 | 仓库根 `modules.json` 登记的模块数 |', '| 模块 | 本版本收录的模块数，含总入口 |'),
    ('| 实战方法 | 各模块 `references/library/<技能库>/` 下的方法文件夹数，不含 `agents` |',
     '| 实战方法 | 各技能库收录的方法个数（文件名里 `references__library__<技能库>__` 后面那一段） |'),
    ('| 方法文档 | 各模块 `references/` 下的 Markdown 文件数，不含本文件 |',
     '| 方法文档 | 参考文档的数量：总入口参考文件夹里的 Markdown 文件，加各模块里文件名以 `references__` 开头的 Markdown 文件（含各方法的正文），不含本文件 |'),
    ('| 开源技能库 | `references/library/` 下的技能库文件夹数，原许可证随库保留 |',
     '| 开源技能库 | 收录的开源技能库个数（文件名里 `references__library__` 后面那一段），原许可证随库保留 |'),
]
LINK = re.compile(r'(\]\()([^)\s]+)(\))')
TICK = re.compile(r'`([^`\s]+)`')
SEP = '__'                        # stands for one former folder level in a flattened file name
MAX_NAME_BYTES = 200
KIT = 'cap-tiktok-workbench'      # its scripts/ and assets/ only work in their original tree
KIT_PARTS = ('assets', 'scripts')
KIT_SECTION = '''## 先解开工具包

本版本的安装包只有两级目录，工具包（脚本、骨架、模板、零件）以 `scripts__…`、`assets__…` 的文件名平铺在本文件夹里，不能直接运行。第一次用到任何 `scripts/…` 或 `assets/…` 之前，先运行一次本文件夹里的 `unpack_kit.py`：

```bash
python3 <本文件夹>/unpack_kit.py
```

它把工具包还原成原来的 `scripts/` 和 `assets/` 两个文件夹，放进一个临时目录并打印位置（要指定位置就加 `--to <文件夹>`）。本模块所有文档里写的 `scripts/…`、`assets/…`，都指这个目录里的对应路径；文档里的命令（如 `python3 scripts/new_workbench.py …`）先进入这个目录再运行。重复运行不会出错，只补齐缺少或变化的文件。只能聊天、不能运行命令的客户端跳过这一步。

'''
KIT_NOTE = '> 本文里的 `scripts/…`、`assets/…` 在工具包里：先按[工作台大师说明](../SKILL.md)的“先解开工具包”一节还原，再到还原出来的文件夹里运行。'
UNPACK_KIT = '''#!/usr/bin/env python3
"""还原工作台工具包。

本安装包按平台要求只有两级目录，工具包的文件以 scripts__xxx、assets__xxx 的名字平铺在本文件夹里
（双下划线代表原来的一层文件夹）。本脚本把它们复制回原来的 scripts/ 和 assets/ 结构：

  python3 unpack_kit.py               还原到系统临时目录，并打印位置
  python3 unpack_kit.py --to <文件夹>   还原到指定文件夹

只读取本文件夹里的文件，只写入目标文件夹；不联网，不改动其他位置。
重复运行只补齐缺少或变化的文件。
"""

import argparse
import filecmp
from pathlib import Path
import shutil
import sys
import tempfile

HERE = Path(__file__).resolve().parent
PARTS = ('assets', 'scripts')
VERSION = '@VERSION@'


def main():
    parser = argparse.ArgumentParser(description='还原工作台工具包（scripts/ 和 assets/）')
    parser.add_argument('--to', help='还原到哪个文件夹；不写就用系统临时目录')
    args = parser.parse_args()
    if args.to:
        dest = Path(args.to).expanduser().resolve()
    else:
        dest = (Path(tempfile.gettempdir()) / f'cap-skill-workbench-kit-{VERSION}').resolve()
    total = written = 0
    for source in sorted(HERE.iterdir()):
        pieces = source.name.split('__')
        if not source.is_file() or len(pieces) < 2 or pieces[0] not in PARTS:
            continue
        if any(piece in ('', '.', '..') or '/' in piece or chr(92) in piece for piece in pieces):
            continue
        target = dest.joinpath(*pieces)
        total += 1
        if target.is_file() and filecmp.cmp(source, target, shallow=False):
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        written += 1
    if not total:
        sys.exit('没有找到工具包文件（scripts__xxx、assets__xxx）。请确认本脚本还在安装包的工作台文件夹里。')
    print(f'工具包已还原到：{dest}')
    print(f'共 {total} 个文件，本次写入 {written} 个。')
    print('文档里的 scripts/xxx、assets/xxx 都在这个文件夹里；先进入它，再运行文档中的命令。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
'''


def stop(message):
    sys.exit('build_workbuddy: ' + message)


def once(text, old, new, where):
    if text.count(old) != 1:
        stop(f'{where}: expected exactly one "{old[:36]}…", found {text.count(old)}. Review this patch.')
    return text.replace(old, new)


def between(text, start, end, where):
    if text.count(start) != 1 or end not in text.split(start, 1)[1]:
        stop(f'{where}: section "{start.strip()}" … "{end.strip()}" not found. Review the hub builder.')
    return start + text.split(start, 1)[1].split(end, 1)[0]


class Stage:
    """A copy of skills/ in the source layout that the patches edit."""

    def __init__(self, root):
        self.root = root
        self.skills = root / 'skills'
        self.log = []

    def read(self, rel):
        return (self.skills / rel).read_text(encoding='utf-8')

    def write(self, rel, text):
        (self.skills / rel).write_text(text, encoding='utf-8')

    def replace(self, rel, old, new):
        self.write(rel, once(self.read(rel), old, new, rel))
        self.log.append(rel)

    def regex(self, rel, pattern, new):
        text, count = re.subn(pattern, new, self.read(rel), flags=re.M)
        if count != 1:
            stop(f'{rel}: pattern {pattern[:40]}… matched {count} times, expected 1. Review this patch.')
        self.write(rel, text)
        self.log.append(rel)

    def drop_lines(self, rel, *needles):
        lines = self.read(rel).split('\n')
        for needle in needles:
            hits = [i for i, line in enumerate(lines) if needle in line]
            if len(hits) != 1:
                stop(f'{rel}: expected one line with "{needle[:36]}…", found {len(hits)}. Review this patch.')
            del lines[hits[0]]
        self.write(rel, re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)))
        self.log.append(rel)

    def replace_everywhere(self, old, new):
        """Replace in every shipped Markdown file outside the third-party libraries."""
        changed = 0
        for path in sorted(self.skills.rglob('*.md')):
            if 'library' in path.parts:
                continue
            text = path.read_text(encoding='utf-8')
            if old in text:
                path.write_text(text.replace(old, new), encoding='utf-8')
                self.log.append(path.relative_to(self.skills).as_posix())
                changed += 1
        return changed


def patch(s):
    """Wording that refers to the dropped modules, to network set-up or to buying accounts."""
    ads = 'cap-tiktok-ads'
    s.replace(f'{ads}/SKILL.md', '用于独立广告任务；课前准备上下文仍固定拒答转人工，安装本 Skill 不代表广告写入授权。',
              '用于独立广告任务；安装本 Skill 不代表广告写入授权。')
    s.drop_lines(f'{ads}/SKILL.md', '请求带有课前准备上下文时，先读取', '“这个问题不在本次课前准备范围内',
                 '不先解释、不搜索、不读取广告账户、不追问需求')
    s.replace(f'{ads}/references/analysis-optimization.md',
              '独立教学中的拓展遵守课前准备入口的相关限制；用户要求深入分析时', '用户要求深入分析时')
    s.replace(f'{ads}/references/connection.md', '仅在独立广告任务中使用；先遵守主 Skill 的课前准备范围锁定。',
              '仅在独立广告任务中使用。')
    s.replace(f'{ads}/references/connection.md', '或其他代理服务当作官方连接', '或其他第三方连接服务当作官方连接')
    s.replace(f'{ads}/references/authorization-recovery.md', '用户要求代理立即使用全部写入权限', '用户要求助手立即使用全部写入权限')
    s.replace_everywhere('本代理', '本助手')
    # The libraries no longer sit in folders of their own, and there is no repository here.
    s.replace_everywhere('（见各来源文件夹的 `LICENSE`）', '（各技能库的 `LICENSE` 文件随库保留）')
    s.replace_everywhere('来源与提交见仓库 `THIRD_PARTY_NOTICES.md`', '来源与提交见安装包根目录的 `THIRD_PARTY_NOTICES.md`')

    s.regex('cap-tiktok-breakdown/SKILL.md',
            r'课前准备上下文中（准备中、暂停或结束后）的文案请求[^\n]*?不要求先重做课程；', '独立店铺或运营任务可直接进入；')
    s.replace('cap-tiktok-listing/SKILL.md', '课前准备上下文中的上架请求按总入口处理，不在这里展开。', '')
    s.replace('cap-tiktok-selection/SKILL.md', '课前准备上下文中的选品请求按总入口与课前边界处理，不在此展开。', '')
    s.regex('cap-tiktok-selection/references/scoring-and-flow.md',
            r'【课程口径】[^\n]*闲鱼[^\n]*\n\n(?:\d\. [^\n]*\n)+',
            '选品工具的会员按下面顺序处理：\n\n'
            '1. 先确认确实需要的市场、指标和导出功能，再决定买哪种会员；也可以先看官网有没有免费版、试用或按月方案；\n'
            '2. 通过工具官网或官方授权渠道购买，保留订单和授权凭证；\n'
            '3. 不使用多人共用、租用或来源不明的账号：这类账号可能被工具方限制登录或封停，数据和售后都没有保障；\n'
            '4. 不安装他人要求的远程控制软件，不把自己的手机号、邮箱密码、支付信息交给他人。\n')

    service = 'cap-tiktok-service'
    s.drop_lines(f'{service}/SKILL.md', '来自课前准备入口或准备流程中的客服请求')
    s.replace(f'{service}/SKILL.md', '课程内容、设备/IP 购买教程、后台操作手册、令牌说明不进入买家知识库',
              '课程内容、后台操作手册、令牌说明不进入买家知识库')
    s.replace(f'{service}/SKILL.md', '不转课程工作人员；课程的固定拒答和祝词不用于买家对话。', '不转课程工作人员。')
    s.replace(f'{service}/SKILL.md', '及其 `references/store-operations.md`',   # written from the shop module's folder
              '及其 `../cap-tiktok-shop/references/store-operations.md`')
    s.replace(f'{service}/references/knowledge-and-handoff.md', '课程内容、设备/IP 购买教程、Chatwoot 后台手册',
              '课程内容、Chatwoot 后台手册')
    s.drop_lines(f'{service}/references/knowledge-and-handoff.md', '课程的固定拒答、完成祝词、“一次一步”和三轮转人工规则只用于课前准备')

    s.regex('cap-tiktok-shop/SKILL.md', r'本篇没有课程陪跑模式；来自课前准备上下文的请求按 \[课前准备流程控制契约\]\([^)]*\) 固定拒答。', '')
    s.drop_lines('cap-tiktok-shop/SKILL.md', '规则说明不强套课前准备入口的六字段故障诊断格式')
    s.regex('cap-tiktok-shop/SKILL.md', r'^\| 问去哪里买工具会员 \|[^\n]*$',
            '| 问去哪里买工具会员 | 通过工具官网或官方授权渠道购买；按 `cap-tiktok-selection` 会员购买规则核对有效期、设备数和售后，不使用共用或来源不明的账号 |')

    ops = 'cap-tiktok-operations'
    s.replace(f'{ops}/SKILL.md', '先检查调用上下文：来自课前准备入口的运营请求不作答，即使流程暂停或已结束，也按课前准备入口“课前准备范围锁定”固定拒答，转【船长电商】工作人员。', '')
    s.replace(f'{ops}/SKILL.md', '；课前准备上下文仍按固定范围拒答，不调用投放模块。', '。')
    s.replace(f'{ops}/SKILL.md', '再看 App、设备、网络和内容。0 播放、不能点赞/关注/收藏、不能换头像不能直接归因于 IP。',
              '再看 App、设备和内容。0 播放、不能点赞/关注/收藏、不能换头像，要先区分具体原因，不凭猜测下结论。')
    ref = f'{ops}/references/tiktok-operations.md'
    s.replace(ref, '基础设备、网络和 IP 配置完成后，进入 TikTok 运营阶段。这个阶段不要求另行建立一套固定运营教程，学员遇到运营问题时只走两条路径：',
              '进入 TikTok 运营阶段后，不要求另行建立一套固定运营教程，遇到运营问题时只走两条路径：')
    s.replace(ref, '3. Apple、Google、Shadowrocket、IP 服务商等产品官方文档；', '3. Apple、Google 等产品官方文档；')
    s.drop_lines(ref, '- 当前 Shadowrocket 是否连接；', '- 当前 IP 检测是否通过；')
    s.replace(ref, '不要要求发送密码、验证码、完整订阅链接、代理认证参数、恢复码或支付信息。', '不要要求发送密码、验证码、恢复码或支付信息。')
    s.replace(ref, '0 播放不能直接归因于 IP。必须先区分', '0 播放必须先区分')
    s.replace(ref, '不要用批量点击、换设备、换 IP 或互刷测试来“验证”限制。', '不要用批量点击、换设备或互刷测试来“验证”限制。')
    s.replace(ref, '4. **网络层**：Shadowrocket 状态、Proxy 模式、IP 归属、DNS/WebRTC/IPv6；', '4. **网络层**：当前网络是否稳定，其他页面能否正常打开；')

    bench = 'cap-tiktok-workbench'
    s.regex(f'{bench}/SKILL.md', r'新零件入库属于维护任务，按\[源码维护\]\([^)]*\)流程进行。', '新零件入库属于维护任务，不在这里处理。')
    s.regex(f'{bench}/references/parts-catalog.md', r'交给\[源码维护\]\([^)]*\)按维护流程审查、更新校验值后才进入零件库', '要由维护者审查后才进入零件库')
    s.regex(f'{bench}/references/setup-troubleshoot.md', r'^2\. 浏览器也打不开：多半是网络环境问题。[^\n]*$', '2. 浏览器也打不开：当前网络访问不了 GitHub，直接看第 5 条。')
    s.regex(f'{bench}/references/setup-troubleshoot.md', r'^3\. 浏览器能打开、脚本连不上：[^\n]*$', '3. 浏览器能打开、脚本连不上：过一会儿再试；只从 GitHub 官方地址下载代码。')

    # The tool kit ships flat; say how to rebuild it before any kit path is used.
    s.replace(f'{bench}/SKILL.md', '## 宿主与工具\n', KIT_SECTION + '## 宿主与工具\n')
    s.replace(f'{bench}/references/github-scout.md', '--dest ~/.claude/skills', '--dest <当前客户端的技能目录>')
    for doc in sorted((s.skills / bench / 'references').glob('*.md')):
        rel = doc.relative_to(s.skills).as_posix()
        lines = s.read(rel).split('\n')
        if not re.search(r'(?:scripts|assets)/', '\n'.join(lines)):
            continue
        if not lines[0].startswith('# '):
            stop(f'{rel}: expected a title on the first line. Review the tool-kit note.')
        s.write(rel, '\n'.join([lines[0], '', KIT_NOTE] + lines[1:]))
        s.log.append(rel)

    host = f'{HUB}/references/host-adapters.md'
    s.replace(host, '（每个模块一个文件夹，内含带 `name` / `description` 的 `SKILL.md`，细节放 `references/`）',
              '（总入口是带 `name` / `description` 的 `SKILL.md`；每个模块一个文件夹，入口是 `MODULE.md`）')
    s.regex(host, r'^- \d+ 个模块文件夹放在同一个技能目录下[^\n]*\n- 只装部分模块时[^\n]*\n',
            '- 本版本是一个技能，只有两级目录：总入口在根目录，共用规则在总入口旁的参考文件夹里，每个模块一个文件夹。'
            '模块文件夹里不再分层，文件名里的 `__` 代表原来的一层文件夹。相对链接已按这个结构写好，不要拆开安装。\n')
    s.regex(host, r'^(\| Claude Code \|[^\n]*\n)', r'\1| WorkBuddy | 技能市场安装 | 本版本是单个技能包；按 `description` 自动选择 |\n')
    s.replace(host, 'Windows 与 macOS 的安装方式见仓库 README。', '')

    # Third-party method libraries: two lines mention network tooling in passing.
    s.replace('cap-tiktok-marketing/references/library/marketingskills/referrals/references/affiliate-programs.md',
              '- VPN/device spoofing', '- Device spoofing')
    s.regex('cap-tiktok-social/references/library/social-media-research-skills/scrapecreators-api/guide.md',
            r'2-letter country code for proxy location\. Does NOT filter by region -- just routes the request through that country\'s proxy\.',
            '2-letter country code for the request location. Does NOT filter by region.')


def supplementary(old):
    """Inside a method library: everything except each method's main text and the licence."""
    parts = old.split('/')
    if len(parts) < 5 or parts[1:3] != ['references', 'library']:
        return False
    rest = parts[4:]                      # below references/library/<library>/
    return rest[0] == 'agents' or len(rest) > 2


def slim(s):
    """Leave out the libraries' supplementary files so the package unpacks to under 3 MB."""
    gone = set()
    for path in sorted(p for p in s.skills.rglob('*') if p.is_file()):
        rel = path.relative_to(s.skills).as_posix()
        if supplementary(rel):
            path.unlink()
            gone.add(rel)
    for folder in sorted((p for p in s.skills.rglob('*') if p.is_dir()), reverse=True):
        if not any(folder.iterdir()):
            folder.rmdir()
    for library in sorted(s.skills.glob('*/references/library/*')):
        for method in sorted(p for p in library.iterdir() if p.is_dir()):
            if [p.name for p in method.iterdir()] != ['guide.md']:
                stop(f'{method.relative_to(s.skills)}: expected guide.md only. Review supplementary().')
    traffic = 'cap-tiktok-traffic/references/tools-and-flow.md'
    s.drop_lines(traffic, '子助手说明在 `library/claude-seo/agents/`')
    s.replace(traffic, '子助手说明在 `library/geo-seo-claude/agents/`。代理商用的方案报价', '代理商用的方案报价')
    s.replace('cap-tiktok-ads/references/other-platforms.md', '只收录 Markdown 正文，许可证见', '只收录每项方法的正文，许可证见')
    changed = s.replace_everywhere(
        '只收录 Markdown 正文：`SKILL.md` 改名为 `guide.md`，指向未收录文件的链接改为纯文字，脚本和数据文件未收录。',
        '受平台对安装包大小的限制，本版本只收录每项方法的正文（原 `SKILL.md`，改名为 `guide.md`）；'
        '方法下的补充参考资料、助手分工说明、脚本和数据文件未收录，指向它们的链接改为纯文字。')
    if changed != 3:
        stop(f'the sentence about what the libraries include was found in {changed} files, expected 3. Review slim().')
    return gone


def build_hub(source, kept, version):
    where = 'cap-skill/SKILL.md'
    rules = between(source, '## 硬规则（每次回答前先过一遍）\n', '## 职责\n', where)
    rules = once(rules, '先打开该模块的 `SKILL.md` 和', '先打开该模块的说明文件 `MODULE.md` 和', where)
    rules = once(rules, '（课程场景按课前准备固定拒答）', '', where)
    duty = once(between(source, '## 职责\n', '## 先判断场景\n', where), '平台参数和课程步骤', '平台参数和操作步骤', where)
    scene_rows = []
    for label in ('| 商家经营 |', '| 了解整体能力 |'):
        rows = [line for line in source.splitlines() if line.startswith(label)]
        if len(rows) != 1:
            stop(f'{where}: scene row {label} not found exactly once.')
        scene_rows.append(rows[0])
    card = between(source, '### 能力总览（亮家底）\n', '### 更新自己\n', where)
    for needle in ('- 课前准备进行中：', '- “开始使用”“课前准备”：'):
        lines = [line for line in card.split('\n') if not line.startswith(needle)]
        if len(lines) != len(card.split('\n')) - 1:
            stop(f'{where}: capability-card bullet {needle} not found exactly once.')
        card = '\n'.join(lines)
    card = once(card, '，也不把“专项助手方法”说成能独立运行的 agent', '', where)   # no helper notes in this edition
    routes = between(source, '## 商家经营路由\n', '### 综合问题先定阶段\n', where).split('\n')
    kept_rows, seen = [], set()
    for line in routes:
        match = re.search(r'\]\(\.\./([a-z0-9-]+)/SKILL\.md\)', line)
        if line.startswith('|') and match:
            if match.group(1) in kept:
                kept_rows.append(line)
                seen.add(match.group(1))
        elif line.startswith('|') and 'references/module-index.md' in line:
            continue
        else:
            kept_rows.append(line)
    missing = set(kept) - seen - {HUB}
    if missing:
        stop(f'{where}: no routing row for {sorted(missing)}.')
    first = between(source, '### 综合问题先定阶段\n', '## 共用规则\n', where)
    shared = between(source, '## 共用规则\n', '## 汇总输出\n', where)
    summary = between(source, '## 汇总输出\n', '## 边界\n', where)
    bounds = source[source.index('## 边界\n'):]
    bounds = once(bounds, '课程场景按课前准备入口的规定。', '', where)
    bounds = once(bounds, '需要改规则时转维护模块。', '', where)
    bounds, count = re.subn(
        r'^- 不协助绕过封禁[^\n]*$',
        '- 不协助绕过封禁、伪造身份或地区、刷量、操纵互动或规避平台审核。\n'
        '- 本版本不提供上网环境配置、境外账号注册或购买方面的指导；被问到时说明不在本技能范围内，不凭记忆作答。\n'
        '- 受平台对安装包大小的限制，本版本的方法库只收录每项方法的正文；正文里提到的补充参考文件'
        '（`references/…`、`assets/…`、`agents/…` 等）没有随包提供。遇到时按正文内容完成，并说明这部分依据不在包内，'
        '不假装读过，也不编造其中的内容。',
        bounds, flags=re.M)
    if count != 1:
        stop(f'{where}: boundary bullet about bans not found exactly once.')
    front = '\n'.join(f'{key}: {version if key == "version" else value}' for key, value in FRONT_MATTER)
    scene = (
        '## 先判断场景\n\n| 场景 | 信号 | 去向 |\n|---|---|---|\n' + '\n'.join(scene_rows) + '\n\n'
        '- 场景不清楚（包括“开始使用”“你好”这类泛泛的开场）时只问一句：“你现在要处理哪件事？比如选品、写文案、建站、上架、看广告或客服。”问整体能力的不算场景不清楚，按下方“能力总览”处理。\n'
        '- 用户问“有没有新版本”“怎么更新”时，告诉用户在 WorkBuddy 的技能市场里更新本技能；本技能不自己下载或替换文件。\n\n')
    return (f'---\n{front}\n---\n\n# 船长跨境电商 Cap-skill 总入口\n\n' + rules + duty + scene + card
            + '\n'.join(kept_rows) + first + shared + summary + bounds)


def new_path(old):
    """skills/-relative file path in the source layout -> path inside the two-level skill folder."""
    slug, _, rest = old.partition('/')
    if slug == HUB:
        head, _, tail = rest.partition('/')
        return f'{head}/{tail.replace("/", SEP)}' if tail else rest
    return f'{slug}/MODULE.md' if rest == 'SKILL.md' else f'{slug}/{rest.replace("/", SEP)}'


def new_folder(old):
    """A source folder -> how to name it now: a real folder ('x/') or a file-name prefix ('x/a__b__*')."""
    slug, _, rest = old.partition('/')
    if slug == HUB:
        head, _, tail = rest.partition('/')
        return (f'{head}/{tail.replace("/", SEP)}{SEP}*' if tail else f'{head}/') if rest else './'
    return f'{slug}/{rest.replace("/", SEP)}{SEP}*' if rest else f'{slug}/'


def in_kit(old):
    parts = old.split('/')
    return parts[0] == KIT and len(parts) > 1 and parts[1] in KIT_PARTS


def rewrite(text, old, shipped, folders, gone, errors, changes):
    """Point Markdown links and back-ticked paths at the files' new places."""
    here = posixpath.dirname(new_path(old)) or '.'
    base = posixpath.dirname(old)
    module = old.split('/')[0]
    library = '/library/' in old
    top = '/'.join(old.split('/')[:4]) if library else module   # a library's paths stay inside it

    def plain(match):   # a library's link to one of its left-out files: keep the words, drop the link
        path = match.group(2).partition('#')[0]
        if path and '://' not in path and posixpath.normpath(posixpath.join(base, path)) in gone:
            return match.group(1)
        return match.group(0)

    def link(match):
        path, sep, fragment = match.group(2).partition('#')
        if not path or '://' in path or path.startswith('mailto:'):
            return match.group(0)
        resolved = posixpath.normpath(posixpath.join(base, path))
        if resolved not in shipped:
            errors.append(f'{old}: link to a file that is not shipped: {match.group(2)}')
            return match.group(0)
        return match.group(1) + posixpath.relpath(new_path(resolved), here) + sep + fragment + match.group(3)

    def named(match):   # a link whose text is its own path: keep the two the same
        path = match.group(1)
        resolved = posixpath.normpath(posixpath.join(base, path))
        if '://' in path or resolved not in shipped:
            return match.group(0)
        return f'[{posixpath.relpath(new_path(resolved), here)}]({path})'

    def tick(match):
        token = match.group(1)
        path, sep, fragment = token.partition('#')
        if not path or '://' in path or path[0] in '-$<{/~' or '*' in path:
            return match.group(0)
        if path in ('SKILL.md', 'MODULE.md'):   # said of skills in general, not of one shipped file
            return match.group(0)
        dotted, nested = path.startswith('.'), '/' in path.rstrip('/')
        # Where the author may have meant the path to start: the file's own folder and, for a
        # path with folders in it, each enclosing folder up to the module. A bare file name only
        # counts when that file sits next to the document.
        starts = [base]
        if not dotted and (nested or path.endswith('/')):
            folder = base
            while folder != top:
                folder = posixpath.dirname(folder)
                starts.append(folder)
        for start in starts:
            resolved = posixpath.normpath(posixpath.join(start, path))
            if resolved.startswith('..'):
                continue
            is_file = resolved in shipped
            if not is_file and not (resolved in folders and (nested or path.endswith('/'))):
                continue
            if in_kit(resolved) or resolved in (f'{KIT}/assets', f'{KIT}/scripts'):
                if module != KIT:
                    errors.append(f'{old}: path into the workbench tool kit from another module: {token}')
                return match.group(0)      # kit paths stay as written; see KIT_SECTION
            target = new_path(resolved) if is_file else new_folder(resolved)
            if is_file or target.endswith('*'):
                fixed = posixpath.relpath(target, here)
            else:
                fixed = posixpath.relpath(target.rstrip('/'), here) + '/'
                if fixed in ('./', '../') and not dotted:
                    return match.group(0)
            fixed += sep + fragment
            if fixed != token:
                changes.append((old, token, fixed))
            return f'`{fixed}`'
        if any(slug in token for slug in DROP):
            errors.append(f'{old}: path into a dropped module: {token}')
        return match.group(0)

    if library:
        text = re.sub(r'\[([^\]\n]*)\]\(([^)\s]+)\)', plain, text)
    text = re.sub(r'\[([^\]\s]+)\]\(\1\)', named, text)
    return TICK.sub(tick, LINK.sub(link, text))


def verify(skill, version):
    errors = []
    entries = sorted(p.relative_to(skill).as_posix() for p in skill.rglob('SKILL.md'))
    if entries != ['SKILL.md']:
        errors.append(f'expected one SKILL.md at the root, found {entries}')
    hub = (skill / 'SKILL.md').read_text(encoding='utf-8')
    front = re.match(r'\A---\n(.*?)\n---\n', hub, re.S)
    keys = re.findall(r'^([a-z_]+): \S', front.group(1), re.M) if front else []
    if keys != [key for key, _ in FRONT_MATTER]:
        errors.append(f'front matter keys are {keys}')
    if f'version: {version}' not in hub:
        errors.append('front matter version differs from VERSION')
    banned = [re.compile(pattern) for pattern in BANNED]
    for path in sorted(p for p in skill.rglob('*') if p.is_file()):
        rel = path.relative_to(skill).as_posix()
        if rel.count('/') > 1:
            errors.append(f'{rel}: deeper than skill folder / one folder / file')
        if len(path.name.encode('utf-8')) > MAX_NAME_BYTES:
            errors.append(f'{rel}: file name longer than {MAX_NAME_BYTES} bytes')
        for pattern in banned:
            if pattern.search(rel) and not (pattern.pattern in LIBRARY_ALLOWED and f'{SEP}library{SEP}' in rel):
                errors.append(f'{rel}: banned term /{pattern.pattern}/ in the file name')
        if path.suffix.lower() not in TEXT:
            continue
        text = path.read_text(encoding='utf-8', errors='ignore')
        for number, line in enumerate(text.splitlines(), 1):
            for pattern in banned:
                if pattern.pattern in LIBRARY_ALLOWED and f'{SEP}library{SEP}' in rel:
                    continue
                if pattern.search(line):
                    errors.append(f'{rel}:{number}: banned term /{pattern.pattern}/: {line.strip()[:80]}')
        if path.suffix != '.md':
            continue
        for target in re.findall(r'\[[^\]]*\]\(([^)\s]+)\)', text):
            target = target.split('#', 1)[0]
            if not target or '://' in target or target.startswith('mailto:'):
                continue
            resolved = (path.parent / target).resolve()
            if not resolved.is_file() or skill.resolve() not in resolved.parents:
                errors.append(f'{rel}: broken link {target}')
    return errors


# --- images -------------------------------------------------------------------------------
# The platform rejects packages over 3 MB and the workbench sprites are a third of the package,
# so 8-bit RGBA PNGs are rewritten as 256-colour indexed PNGs (colour profile kept). An image is
# only replaced when the result is smaller and stays above MIN_PSNR; otherwise it ships as is.

def png_chunks(data):
    pos = 8
    while pos < len(data):
        size, kind = struct.unpack('>I4s', data[pos:pos + 8])
        yield kind, data[pos + 8:pos + 8 + size]
        pos += 12 + size


def png_chunk(kind, body):
    return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body) & 0xffffffff)


def png_decode(data):
    """Return (width, height, RGBA bytes, colour chunks) or None when the format is not handled."""
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    idat, header, colour = b'', None, {}
    for kind, body in png_chunks(data):
        if kind == b'IHDR':
            header = struct.unpack('>IIBBBBB', body)
        elif kind == b'IDAT':
            idat += body
        elif kind in (b'sRGB', b'iCCP', b'cICP', b'gAMA', b'cHRM'):
            colour[kind] = body
    width, height, depth, colour_type, _, _, interlace = header
    if (depth, colour_type, interlace) != (8, 6, 0):
        return None
    raw, stride = zlib.decompress(idat), width * 4
    out, previous = bytearray(), bytearray(stride)
    for y in range(height):
        kind = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        if kind == 1:
            for x in range(4, stride):
                line[x] = (line[x] + line[x - 4]) & 255
        elif kind == 2:
            for x in range(stride):
                line[x] = (line[x] + previous[x]) & 255
        elif kind == 3:
            for x in range(stride):
                line[x] = (line[x] + ((line[x - 4] if x >= 4 else 0) + previous[x]) // 2) & 255
        elif kind == 4:
            for x in range(stride):
                a, b, c = (line[x - 4] if x >= 4 else 0), previous[x], (previous[x - 4] if x >= 4 else 0)
                guess = a + b - c
                da, db, dc = abs(guess - a), abs(guess - b), abs(guess - c)
                line[x] = (line[x] + (a if da <= db and da <= dc else b if db <= dc else c)) & 255
        out += line
        previous = line
    return width, height, bytes(out), colour


def png_quantize(pixels, limit=256):
    """Median cut in premultiplied RGBA plus one nearest-centre pass. Deterministic."""
    counts = Counter(pixels[i:i + 4] for i in range(0, len(pixels), 4))
    clear = any(colour[3] == 0 for colour in counts)

    def premultiplied(colour):
        alpha = colour[3]
        return (colour[0] * alpha // 255, colour[1] * alpha // 255, colour[2] * alpha // 255, alpha)

    points = sorted((premultiplied(colour), n, colour) for colour, n in counts.items() if colour[3])
    boxes = [points] if points else []
    while len(boxes) < limit - (1 if clear else 0):
        best, axis, spread = None, 0, 0
        for i, box in enumerate(boxes):
            if len(box) < 2:
                continue
            weight = math.sqrt(sum(point[1] for point in box))
            for channel in range(4):
                values = [point[0][channel] for point in box]
                score = (max(values) - min(values)) * weight
                if score > spread:
                    best, axis, spread = i, channel, score
        if best is None:
            break
        box = sorted(boxes[best], key=lambda point: (point[0][axis], point[0]))
        half, running, cut = sum(point[1] for point in box) / 2, 0, len(box) - 1
        for j, point in enumerate(box[:-1]):
            running += point[1]
            if running >= half:
                cut = j + 1
                break
        boxes[best:best + 1] = [box[:cut], box[cut:]]

    def centre(box):
        total = sum(point[1] for point in box)
        return tuple(sum(point[0][channel] * point[1] for point in box) / total for channel in range(4))

    centres = [centre(box) for box in boxes]
    groups = [[] for _ in centres]
    for point in points:
        value, nearest, distance = point[0], 0, 1e18
        for i, c in enumerate(centres):
            d = (value[0] - c[0]) ** 2 + (value[1] - c[1]) ** 2 + (value[2] - c[2]) ** 2 + (value[3] - c[3]) ** 2
            if d < distance:
                nearest, distance = i, d
        groups[nearest].append(point)
    assigned = {}
    for box in (group for group in groups if group):
        c = centre(box)
        alpha = max(1, min(255, round(c[3])))
        colour = (min(255, round(c[0] * 255 / alpha)), min(255, round(c[1] * 255 / alpha)),
                  min(255, round(c[2] * 255 / alpha)), alpha)
        for point in box:
            assigned[point[2]] = colour
    palette = sorted(set(assigned.values()), key=lambda colour: (colour[3] == 255, colour))  # translucent first
    if clear:
        palette.insert(0, (0, 0, 0, 0))
    position = {colour: i for i, colour in enumerate(palette)}
    lookup = {colour: position[(0, 0, 0, 0)] if colour[3] == 0 else position[assigned[colour]] for colour in counts}
    return palette, bytes(lookup[pixels[i:i + 4]] for i in range(0, len(pixels), 4))


def png_encode(width, height, palette, indices, colour):
    out = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 3, 0, 0, 0))
    for kind in (b'cICP', b'iCCP', b'sRGB', b'gAMA', b'cHRM'):
        if kind in colour:
            out += png_chunk(kind, colour[kind])
    out += png_chunk(b'PLTE', b''.join(bytes(entry[:3]) for entry in palette))
    alphas = [entry[3] for entry in palette]
    while alphas and alphas[-1] == 255:
        alphas.pop()
    if alphas:
        out += png_chunk(b'tRNS', bytes(alphas))
    raw = b''.join(b'\x00' + indices[y * width:(y + 1) * width] for y in range(height))
    return out + png_chunk(b'IDAT', zlib.compress(raw, 9)) + png_chunk(b'IEND', b'')


def png_quality(pixels, palette, indices):
    error = 0
    for i, entry in enumerate(indices):
        old, new = pixels[i * 4:i * 4 + 4], palette[entry]
        error += sum((old[j] * old[3] // 255 - new[j] * new[3] // 255) ** 2 for j in range(3)) + (old[3] - new[3]) ** 2
    mean = error / (len(indices) * 4)
    return 99.0 if mean == 0 else 10 * math.log10(255 * 255 / mean)


def shrink_images(folder):
    report = {'converted': 0, 'kept': 0, 'before': 0, 'after': 0, 'worst_psnr': 99.0}
    for path in sorted(folder.rglob('*.png')):
        data = path.read_bytes()
        report['before'] += len(data)
        decoded = png_decode(data)
        smaller = None
        if decoded:
            width, height, pixels, colour = decoded
            palette, indices = png_quantize(pixels)
            quality = png_quality(pixels, palette, indices)
            candidate = png_encode(width, height, palette, indices, colour)
            if len(candidate) < len(data) and quality >= MIN_PSNR:
                smaller = candidate
                report['worst_psnr'] = min(report['worst_psnr'], round(quality, 1))
        if smaller:
            path.write_bytes(smaller)
            report['converted'] += 1
        else:
            report['kept'] += 1
        report['after'] += len(smaller or data)
    return report


def main():
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    registry = json.loads((ROOT / 'modules.json').read_text(encoding='utf-8'))
    unknown = DROP - {m['slug'] for m in registry['modules']}
    if unknown:
        stop(f'DROP names modules that no longer exist: {sorted(unknown)}')
    kept = [m['slug'] for m in registry['modules'] if m['slug'] not in DROP]

    with tempfile.TemporaryDirectory(prefix='cap-workbuddy-') as temp:
        temp = Path(temp)
        stage = Stage(temp / 'stage')
        shutil.copytree(ROOT / 'skills', stage.skills,
                        ignore=shutil.ignore_patterns('.DS_Store', '__pycache__'))
        for slug in DROP:
            shutil.rmtree(stage.skills / slug)
        for rel in SKIP_FILES:
            (stage.skills / rel).unlink()
        for meta in stage.skills.glob('*/agents/openai.yaml'):   # display metadata for another client
            meta.unlink()
            if not any(meta.parent.iterdir()):
                meta.parent.rmdir()
        if not any((stage.skills / HUB / 'scripts').iterdir()):
            (stage.skills / HUB / 'scripts').rmdir()

        patch(stage)
        gone = slim(stage)
        images = shrink_images(stage.skills)
        stage.write(f'{HUB}/SKILL.md', build_hub(stage.read(f'{HUB}/SKILL.md'), kept, version))

        registry['modules'] = [dict(m, requires=[r for r in m['requires'] if r not in DROP])
                               for m in registry['modules'] if m['slug'] not in DROP]
        (stage.root / 'modules.json').write_text(json.dumps(registry, ensure_ascii=False, indent=2), encoding='utf-8')
        sys.dont_write_bytecode = True
        spec = importlib.util.spec_from_file_location('update_overview', ROOT / 'scripts/update_overview.py')
        overview = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(overview)
        card = overview.render(stage.root)
        for old, new in OVERVIEW_WORDING:
            card = once(card, old, new, 'overview.md')
        (stage.root / overview.RELATIVE_TARGET).write_text(card, encoding='utf-8')
        counts = overview.count(stage.root)
        if counts['helpers']:
            stop('helper notes are still counted; review supplementary().')

        skill = temp / 'out' / HUB
        shipped = {p.relative_to(stage.skills).as_posix() for p in stage.skills.rglob('*') if p.is_file()}
        folders = {posixpath.dirname(old) for old in shipped}
        for folder in list(folders):
            while '/' in folder:
                folder = posixpath.dirname(folder)
                folders.add(folder)
        errors, changes = [], []
        for old in sorted(shipped):   # flattening must stay reversible and collision-free
            if any(SEP in part for part in old.split('/')):
                errors.append(f'{old}: a name already contains "{SEP}", which marks a folder level here')
        placed = Counter(new_path(old) for old in shipped)
        errors += [f'{name}: {n} source files land on this name' for name, n in placed.items() if n > 1]
        if f'{KIT}/unpack_kit.py' in placed:
            errors.append('the workbench already has an unpack_kit.py')
        for old in sorted(shipped):
            target = skill / new_path(old)
            target.parent.mkdir(parents=True, exist_ok=True)
            source = stage.skills / old
            if source.suffix == '.md' and not in_kit(old):
                target.write_text(rewrite(source.read_text(encoding='utf-8'), old, shipped, folders, gone, errors, changes),
                                  encoding='utf-8')
            else:
                shutil.copyfile(source, target)     # kit files are restored to their tree unchanged
        (skill / KIT / 'unpack_kit.py').write_text(UNPACK_KIT.replace('@VERSION@', version), encoding='utf-8')
        shutil.copyfile(ROOT / 'LICENSE', skill / 'LICENSE')

        def notice_path(match):
            slug, _, rest = match.group(1).rstrip('/').partition('/')
            prefix = f'{slug}/{rest.replace("/", SEP)}{SEP}'
            if not any(name.startswith(prefix) for name in placed):
                errors.append(f'THIRD_PARTY_NOTICES.md: nothing shipped under {match.group(1)}')
            return f'`{prefix}*`'

        notices = (ROOT / 'THIRD_PARTY_NOTICES.md').read_text(encoding='utf-8')
        notices = re.sub(r'\[([^\]]+)\]\(sources\.lock\.json\)', r'\1', notices)
        notices = re.sub(r'`skills/([^`\s]+)`', notice_path, notices)
        (skill / 'THIRD_PARTY_NOTICES.md').write_text(
            notices
            + '\n## WorkBuddy 版说明\n\n平台只接受两级目录，本版本把每个模块的文件平铺在模块文件夹里，'
              f'文件名里的 `{SEP}` 代表原来的一层文件夹，上表的位置按此写成文件名前缀；各技能库的许可证文件随库保留'
              f'（文件名以 `{SEP}LICENSE` 结尾）。平台还限制安装包解压后不超过 3 MB，所以各技能库只收录每项方法的正文，'
              '上表提到的子助手说明和各方法下的补充参考资料、模板没有收录。像素办公室的角色图（来自 Claw-Empire，'
              'Apache-2.0）转成了 256 色索引 PNG，画面内容没有改动。\n', encoding='utf-8')

        errors += verify(skill, version)
        # The kit must come back byte for byte, in its original tree, from the shipped flat files.
        kit = temp / 'kit'
        run = subprocess.run([sys.executable, '-I', str(skill / KIT / 'unpack_kit.py'), '--to', str(kit)],
                             capture_output=True, text=True)
        if run.returncode:
            errors.append(f'unpack_kit.py failed: {run.stderr.strip()[-200:]}')
        wanted = {old.partition('/')[2] for old in shipped if in_kit(old)}
        got = {p.relative_to(kit).as_posix() for p in kit.rglob('*') if p.is_file()} if kit.is_dir() else set()
        if wanted != got:
            errors.append(f'unpacked kit differs: {len(wanted - got)} missing, {len(got - wanted)} unexpected')
        errors += [f'unpacked kit file differs: {rel}' for rel in sorted(wanted & got)
                   if (kit / rel).read_bytes() != (stage.skills / KIT / rel).read_bytes()]
        if errors:
            print('\n'.join(errors[:60]))
            stop(f'{len(errors)} problem(s); nothing written.')

        out = ROOT / 'dist' / f'Cap-skill-{version}-WorkBuddy.zip'
        out.parent.mkdir(exist_ok=True)
        files = sorted(p for p in skill.rglob('*') if p.is_file())
        unpacked = sum(p.stat().st_size for p in files)
        if unpacked > MAX_UNPACKED_BYTES - UNPACKED_HEADROOM:
            stop(f'package unpacks to {unpacked} bytes; the limit is {MAX_UNPACKED_BYTES} and '
                 f'{UNPACKED_HEADROOM} bytes are kept free. Nothing written.')
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path in files:
                info = zipfile.ZipInfo(f'{HUB}/{path.relative_to(skill).as_posix()}', (2026, 10, 31, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                archive.writestr(info, path.read_bytes())
        if out.stat().st_size >= MAX_ZIP_BYTES:
            size = out.stat().st_size
            out.unlink()
            stop(f'package is {size} bytes, over the {MAX_ZIP_BYTES}-byte limit; nothing written.')
        digest = hashlib.sha256(out.read_bytes()).hexdigest()
        (out.parent / f'{out.name}.sha256').write_text(f'{digest}  {out.name}\n', encoding='utf-8')
        print(json.dumps({
            'package': out.relative_to(ROOT).as_posix(), 'sha256': digest, 'files': len(files),
            'zip_bytes': out.stat().st_size, 'unpacked_bytes': unpacked,
            'unpacked_headroom_bytes': MAX_UNPACKED_BYTES - unpacked,
            'library_files_left_out': len(gone),
            'modules_kept': kept, 'modules_dropped': sorted(DROP),
            'card': {k: counts[k] for k in ('modules', 'methods', 'helpers', 'documents', 'libraries')},
            'images': images,
            'deepest_level': max(p.relative_to(skill).as_posix().count('/') for p in files) + 1,
            'folders': sorted({p.parent.name for p in files if p.parent != skill}),
            'longest_name_bytes': max(len(p.name.encode('utf-8')) for p in files),
            'kit_files': len(wanted),
            'backtick_paths_rewritten': len(changes),
            'files_patched': sorted(set(stage.log)),
        }, ensure_ascii=False, indent=2))
        if '--show-paths' in sys.argv[1:]:   # every back-ticked path that was rewritten, for review
            for old, token, fixed in changes:
                print(f'{old}\t{token}\t{fixed}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
