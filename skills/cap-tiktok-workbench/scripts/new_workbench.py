#!/usr/bin/env python3
"""把「视觉卡、公司卡 → 公司配置」拼成一个能打开的工作台文件夹。标准库实现。

用法（详见 references/build-and-debug.md）：
  python3 new_workbench.py --list-parts
  python3 new_workbench.py --list-templates
  python3 new_workbench.py --template tiktok-shop --out <目录> --gallery   # 第一步：还没问需求就先给老板看效果
  python3 new_workbench.py --template tiktok-shop --name "老板的公司名" --out <目录> --gallery --update   # 名字上墙：换成老板的公司名再刷新
  python3 new_workbench.py --company company.json --check
  python3 new_workbench.py --company company.json --out <工作台目录>
  python3 new_workbench.py --company company.json --out <工作台目录> --update   # 已有工作台：只换核心、零件和配置
  python3 new_workbench.py --company company.json --out <工作台目录> --gallery  # 风格画廊：装上全部零件，用老板的岗位实时预览

company.json 字段见 references/state-contract.md（纯 JSON，不带 window.WB_COMPANY 前缀）。
生成时会在输出文件夹里另存一份 company.json，以后 --update 就用这一份。
还会放进 AGENTS.md、CLAUDE.md（只在没有时新建）和 给AI看的说明/（本技能 references 的副本），
老板用 AI 编程工具打开工作台文件夹时，工具会先读到规矩。
老板自己的改动放 custom/：custom.css、custom.js、parts/<id>/，更新时不动，并自动挂进 index.html。
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / 'assets'
STARTER = ASSETS / 'starter'
PARTS = ASSETS / 'parts'
TEMPLATES = ASSETS / 'templates'
REFERENCES = HERE.parent / 'references'
SKILLS_DIR = HERE.parent.parent
# 带路菜单里“搭知识库”“自学”两条路要用的说明，从兄弟模块复制；文件名避开 AGENTS.md / CLAUDE.md，免得被 AI 工具当成本文件夹的规矩
EXTRA_NOTES = [
    ('cap-tiktok-knowledge/references/why-and-framework.md', '知识库/why-and-framework.md'),
    ('cap-tiktok-knowledge/assets/vault-AGENTS.md', '知识库/vault-AGENTS.md'),
    ('cap-tiktok-learning/assets/learning-folder/AGENTS.md', '自学/learning-AGENTS.md'),
]
PALETTES = {'cyber', 'neon', 'aurora', 'amber', 'jade', 'ice'}
KEEP_ON_UPDATE = {'data/live.json', 'vendor', 'connectors/local_config.json'}


def load_parts(custom_dir=None):
    parts = {}
    for base, custom in ((PARTS, False), (custom_dir, True)):
        if base is None or not base.is_dir():
            continue
        for p in sorted(base.iterdir()):
            meta_file = p / 'part.json'
            if not (p.is_dir() and (p / 'part.js').is_file()):
                continue
            if custom and p.name in parts:
                print(f'提醒：custom/parts/{p.name} 和零件库里的零件同名，没用它；换一个 id')
                continue
            meta = json.loads(meta_file.read_text(encoding='utf-8')) if meta_file.is_file() else {'id': p.name}
            meta['_dir'] = p
            meta['_custom'] = custom
            parts[p.name] = meta
    return parts


def check(cfg, parts, gallery=False):
    errors, warns = [], []
    if gallery:
        theme = cfg.setdefault('theme', {})
        if theme.get('main_scene') not in parts:
            theme['main_scene'] = next(iter(parts))
        if theme.get('palette') not in PALETTES:
            theme['palette'] = 'cyber'
        theme.setdefault('role_default', theme['main_scene'])
    if cfg.get('schema') != 'cap-workbench/1':
        errors.append('schema 必须是 cap-workbench/1')
    name = (cfg.get('company') or {}).get('name')
    if not name:
        errors.append('company.name 必填')
    theme = cfg.get('theme') or {}
    if theme.get('main_scene') not in parts:
        errors.append(f'theme.main_scene「{theme.get("main_scene")}」不在零件库：{", ".join(parts)}')
    if theme.get('palette') not in PALETTES:
        errors.append(f'theme.palette 只能是 {", ".join(sorted(PALETTES))}')
    fx = theme.get('fx', ['grid'])
    fx = [fx] if isinstance(fx, str) else fx
    bad_fx = [x for x in fx if x not in {'grid', 'stars', 'rain', 'aurora', 'bokeh', 'scan'}]
    if bad_fx:
        errors.append(f'theme.fx 里有不认识的背景：{bad_fx}（可选 grid、stars、rain、aurora、bokeh、scan）')
    for key, allowed in (('motion', {'calm', 'normal', 'wild'}), ('celebrate', {'fireworks', 'confetti', 'comet', 'none'}), ('opening', {'boot', 'reveal', 'none'})):
        if theme.get(key) is not None and theme[key] not in allowed:
            errors.append(f'theme.{key} 只能是 {"、".join(sorted(allowed))}')
    for key in ('accent', 'accent2'):
        if theme.get(key) and not re.fullmatch(r'#[0-9a-fA-F]{6}', str(theme[key])):
            errors.append(f'theme.{key} 要写成 #RRGGBB 形式的颜色')
    if theme.get('role_default') and theme['role_default'] not in parts:
        errors.append(f'theme.role_default「{theme["role_default"]}」不在零件库')
    roles = cfg.get('roles') or []
    if not 2 <= len(roles) <= 14:
        errors.append(f'岗位数量要在 2–14 个之间，现在是 {len(roles)}')
    ids = [r.get('id') for r in roles]
    if len(set(ids)) != len(ids):
        errors.append('岗位 id 有重复')
    for r in roles:
        rid = r.get('id') or '?'
        if not re.fullmatch(r'[a-z][a-z0-9-]{0,23}', rid):
            errors.append(f'岗位 id「{rid}」只能用小写英文、数字和连字符')
        if not r.get('name'):
            errors.append(f'岗位 {rid} 缺 name')
        if not r.get('duties'):
            warns.append(f'岗位 {rid} 没写 duties，模拟时只会显示“日常工作”')
        if not r.get('keywords'):
            warns.append(f'岗位 {rid} 没写 keywords，老板下令时很难自动派给它')
        if r.get('module') and r['module'] not in parts:
            errors.append(f'岗位 {rid} 的 module「{r["module"]}」不在零件库')
        if not r.get('module') and not theme.get('role_default'):
            warns.append(f'岗位 {rid} 没配 module，也没有 theme.role_default，点开会是空白')
        for k in ('token', 'password', 'secret', 'cookie', 'api_key'):
            if k in json.dumps(r, ensure_ascii=False).lower():
                errors.append(f'岗位 {rid} 的配置里出现了「{k}」字样：密钥类信息不能写进工作台')
    kpis = cfg.get('kpis') or []
    if not 3 <= len(kpis) <= 6:
        errors.append(f'顶栏数字要 3–6 个，现在是 {len(kpis)}')
    keys = [k.get('key') for k in kpis]
    if len(set(keys)) != len(keys):
        errors.append('kpis 的 key 有重复')
    flow_ids = {f.get('id') for f in cfg.get('flows') or []}
    for r in roles:
        if r.get('flow') and r['flow'] not in flow_ids:
            errors.append(f'岗位 {r.get("id")} 的 flow「{r["flow"]}」没有在 flows 里定义')
    live = cfg.get('live') or {}
    if live.get('enabled') and not live.get('url'):
        errors.append('live.enabled 为 true 时必须写 live.url')
    presets = (cfg.get('commands') or {}).get('presets') or []
    if not presets:
        warns.append('没有 commands.presets：派活栏不会有快捷指令')
    used = {theme.get('main_scene')} | {r.get('module') for r in roles if r.get('module')}
    if theme.get('role_default'):
        used.add(theme['role_default'])
    if len(used - {None}) < 3:
        warns.append('只用了 1–2 种零件，画面可能单调；建议岗位模块至少用 3 种不同零件')
    return errors, warns, sorted(u for u in used if u)


def copy_tree(src, dst):
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns('.DS_Store', '__pycache__'))


def build(cfg, parts, used, out, update):
    out.mkdir(parents=True, exist_ok=True)
    if any(out.iterdir()) and not update:
        sys.exit(f'目标文件夹不是空的：{out}\n已有工作台请加 --update（会保留 data/live.json、vendor/ 和连接配置）。')
    for name in ('core', 'sources', 'connectors'):
        if (STARTER / name).is_dir():
            if update and name == 'connectors' and (out / name).exists():
                for f in (STARTER / name).iterdir():
                    if f.is_file() and not (out / name / f.name).exists():
                        shutil.copy2(f, out / name / f.name)
                continue
            copy_tree(STARTER / name, out / name)
    for f in STARTER.iterdir():
        if f.is_file() and f.name not in ('index.html', 'gallery.html') and f.name != '.DS_Store':
            shutil.copy2(f, out / f.name)
    (out / 'data').mkdir(exist_ok=True)
    (out / 'data' / 'company.js').write_text(
        'window.WB_COMPANY = ' + json.dumps(cfg, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    (out / 'company.json').write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if REFERENCES.is_dir():
        copy_tree(REFERENCES, out / '给AI看的说明')
        for src, dst in EXTRA_NOTES:
            if (SKILLS_DIR / src).is_file():
                (out / '给AI看的说明' / dst).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(SKILLS_DIR / src, out / '给AI看的说明' / dst)
    if not (out / 'CLAUDE.md').exists():
        (out / 'CLAUDE.md').write_text(
            '# 给 Claude 的说明\n\n本文件夹的规矩写在 AGENTS.md（Codex、Cursor 等工具也读它），先读它：\n\n@AGENTS.md\n\n'
            '## 老板自己的长期要求\n\n（写在这里；生成器更新工作台时不会覆盖本文件。）\n', encoding='utf-8')
    if (out / 'parts').exists():
        shutil.rmtree(out / 'parts')
    notices = ['第三方与来源说明（由 new_workbench.py 生成）\n']
    for pid in used:
        meta = parts[pid]
        if meta.get('_custom'):
            notices.append(f'{pid}（{meta.get("name", pid)}，老板自己的零件，在 custom/parts/）\n  来源：{meta.get("source", "未登记")}\n  许可：{meta.get("license", "未登记")}\n')
            continue
        copy_tree(meta['_dir'], out / 'parts' / pid)
        notices.append(f'{pid}（{meta.get("name", pid)}）\n  来源：{meta.get("source", "未登记")}\n  许可：{meta.get("license", "未登记")}\n')
    vendor = out / 'vendor'
    if vendor.is_dir():
        notices.append('\nvendor/ 下的第三方代码见各自的许可证文件。\n')
    (out / 'THIRD_PARTY_NOTICES.txt').write_text('\n'.join(notices), encoding='utf-8')
    tags = '\n'.join(f'  <script src="{"custom/parts" if parts[pid].get("_custom") else "parts"}/{pid}/part.js"></script>'
                     for pid in used)
    css_tag = '  <link rel="stylesheet" href="custom/custom.css" />\n' if (out / 'custom' / 'custom.css').is_file() else ''
    js_tag = '  <script src="custom/custom.js"></script>\n' if (out / 'custom' / 'custom.js').is_file() else ''
    title = (cfg.get('company') or {}).get('name', 'OPC').replace('<', '')
    for page in ('index.html', 'gallery.html'):
        html = (STARTER / page).read_text(encoding='utf-8')
        html = re.sub(r'<!-- PARTS:BEGIN -->.*?<!-- PARTS:END -->',
                      '<!-- PARTS:BEGIN -->\n' + tags + '\n  <!-- PARTS:END -->', html, flags=re.S)
        html = re.sub(r'<!-- CUSTOM-CSS:BEGIN -->.*?<!-- CUSTOM-CSS:END -->',
                      '<!-- CUSTOM-CSS:BEGIN -->\n' + css_tag + '  <!-- CUSTOM-CSS:END -->', html, flags=re.S)
        html = re.sub(r'<!-- CUSTOM-JS:BEGIN -->.*?<!-- CUSTOM-JS:END -->',
                      '<!-- CUSTOM-JS:BEGIN -->\n' + js_tag + '  <!-- CUSTOM-JS:END -->', html, flags=re.S)
        html = html.replace('<title>OPC 工作台</title>', '<title>' + title + ' · OPC 工作台</title>')
        (out / page).write_text(html, encoding='utf-8')
    return out / 'index.html'


def main():
    ap = argparse.ArgumentParser(description='拼装 OPC 工作台')
    ap.add_argument('--company', help='公司配置 JSON 文件')
    ap.add_argument('--out', help='输出的工作台文件夹')
    ap.add_argument('--check', action='store_true', help='只检查配置，不生成')
    ap.add_argument('--update', action='store_true', help='更新已有工作台')
    ap.add_argument('--gallery', action='store_true', help='装上全部零件，生成风格画廊 gallery.html')
    ap.add_argument('--list-parts', action='store_true')
    ap.add_argument('--template', help='用行业示范模板代替 --company（tiktok-shop / shopify / amazon / factory）')
    ap.add_argument('--list-templates', action='store_true')
    ap.add_argument('--name', help='第 1 步“名字上墙”：用老板公司的名字替换配置里的名字（Logo 字默认取第一个字）')
    ap.add_argument('--mark', help='Logo 上的一个字（可选，默认取名字的第一个字）')
    a = ap.parse_args()
    parts = load_parts(Path(a.out).expanduser().resolve() / 'custom' / 'parts' if a.out else None)
    if a.list_parts:
        for pid, m in parts.items():
            print(f'{pid:14} {m.get("name", ""):8} {m.get("kind", ""):6} 适合：{"、".join(m.get("best_for", []))}  风格：{"、".join(m.get("style", []))}')
        return
    if a.list_templates:
        for t in sorted(TEMPLATES.glob('*.json')):
            d = json.loads(t.read_text(encoding='utf-8'))
            print(f'{t.stem:12} {d["company"]["name"]}  {len(d["roles"])} 个岗位  主场景 {d["theme"]["main_scene"]}  配色 {d["theme"]["palette"]}')
        return
    if a.template:
        src = TEMPLATES / f'{a.template}.json'
        if not src.is_file():
            sys.exit(f'没有模板 {a.template}，可选：' + '、'.join(t.stem for t in sorted(TEMPLATES.glob('*.json'))))
        a.company = str(src)
    if not a.company:
        ap.error('需要 --company 或 --template')
    try:
        cfg = json.loads(Path(a.company).expanduser().read_text(encoding='utf-8'))
    except (OSError, ValueError) as e:
        sys.exit(f'读不了公司配置：{e}')
    if a.name is not None:
        nm = ' '.join(a.name.split())[:40]
        if not nm:
            sys.exit('--name 不能是空的')
        co = cfg.setdefault('company', {})
        co['name'] = nm
        co['mark'] = (a.mark or '').strip()[:2] or nm[0]
    elif a.mark:
        cfg.setdefault('company', {})['mark'] = a.mark.strip()[:2]
    errors, warns, used = check(cfg, parts, a.gallery)
    if a.gallery:
        used = sorted(parts)
    for w in warns:
        print('提醒：' + w)
    if errors:
        print('配置有问题，先改好再生成：')
        for e in errors:
            print('  - ' + e)
        sys.exit(1)
    print(f'配置检查通过：{len(cfg["roles"])} 个岗位，{len(cfg["kpis"])} 个数字，用到零件 {"、".join(used)}')
    if a.check:
        return
    if not a.out:
        ap.error('需要 --out')
    index = build(cfg, parts, used, Path(a.out).expanduser().resolve(), a.update)
    print(f'已生成：{index}')
    if a.gallery:
        print(f'风格画廊：{index.parent / "gallery.html"}（先挑主场景，再点“下一步：挑配色”打开 pick.html；视觉卡定了，问完市场和岗位就生成正式工作台）')
    print('双击 index.html 就能打开（模拟数据）；接真实接口时再用 启动工作台 脚本。')


if __name__ == '__main__':
    main()
