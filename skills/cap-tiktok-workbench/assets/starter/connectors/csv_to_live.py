#!/usr/bin/env python3
"""接口插座示例：把后台导出的 CSV 汇总成工作台的标准 live.json。（接数据以后才用）

为什么先用导出表：不用碰任何密码或令牌，老板从后台点“导出”就行；
确认数字和画面都对了，再换成官方接口（写法相同，只是数据来源换成 API）。

  python3 connectors/csv_to_live.py --csv 订单导出.csv --kpi orders=count --kpi gmv=sum:实付金额
  python3 connectors/csv_to_live.py --csv 订单导出.csv --kpi gmv=sum:Order Amount --watch 60
  python3 connectors/csv_to_live.py --csv 订单导出.csv --kpi orders=count --dry-run   # 只算给你看，不写文件
  python3 connectors/csv_to_live.py --csv 订单导出.csv --kpi orders=count --where 订单状态=已付款   # 只算符合条件的行

--kpi 格式：<公司配置里的 kpi key>=count  或  <key>=sum:<列名>
输出写到 data/live.json，并保留文件里已有的其他字段。页面需要用 启动工作台 脚本打开才能读取。
"""

import argparse
import csv
import json
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def number(v):
    s = str(v or '').replace(',', '').replace('$', '').replace('¥', '').replace('RM', '').strip()
    try:
        return float(s)
    except ValueError:
        return None


def read_rows(a):
    path = Path(a.csv).expanduser()
    if not path.is_file():
        raise SystemExit(f'找不到导出表：{path}')
    try:
        return list(csv.DictReader(open(path, encoding=a.encoding, newline='')))
    except UnicodeDecodeError:
        if a.encoding != 'utf-8-sig':
            raise SystemExit(f'用 {a.encoding} 读不了这张表，换一种 --encoding 再试')
        print('提醒：这张表不是 UTF-8，按 GB18030（中文 Excel 常见）读取')
        return list(csv.DictReader(open(path, encoding='gb18030', newline='')))


def keep(rows, wheres):
    for spec in wheres:
        if '=' not in spec:
            raise SystemExit(f'看不懂 --where {spec}，应为 列名=值')
        col, val = spec.split('=', 1)
        if rows and col not in rows[0]:
            raise SystemExit(f'CSV 里没有列「{col}」。现有列：{", ".join(rows[0].keys())}')
        rows = [r for r in rows if (r.get(col) or '').strip() == val.strip()]
    return rows


def run(a):
    total = read_rows(a)
    rows = keep(total, a.where)
    if a.where:
        print(f'共 {len(total)} 行，符合 {"、".join(a.where)} 的 {len(rows)} 行')
    out_path = ROOT / 'data' / 'live.json'
    data = json.loads(out_path.read_text(encoding='utf-8')) if out_path.exists() else {}
    kpis = data.get('kpis', {})
    for spec in a.kpi:
        key, how = spec.split('=', 1)
        if how == 'count':
            kpis[key] = len(rows)
        elif how.startswith('sum:'):
            col = how[4:]
            if rows and col not in rows[0]:
                raise SystemExit(f'CSV 里没有列「{col}」。现有列：{", ".join(rows[0].keys())}')
            vals = [number(r.get(col)) for r in rows]
            kpis[key] = round(sum(v for v in vals if v is not None), 2)
        else:
            raise SystemExit(f'看不懂 --kpi {spec}，应为 key=count 或 key=sum:列名')
    if a.dry_run:
        print(f'只算不写（{len(rows)} 行）：' + '，'.join(f'{k}={kpis[k]}' for k in (s.split("=", 1)[0] for s in a.kpi)))
        return
    data['kpis'] = kpis
    data['updatedAt'] = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    data.setdefault('logs', []).append({'id': 'csv-' + data['updatedAt'], 'roleId': a.role, 'text': f'已从导出表读取 {len(rows)} 行', 'level': 'info'}) if a.role else None
    data['logs'] = data.get('logs', [])[-30:]
    tmp = out_path.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    tmp.replace(out_path)  # 先写临时文件再改名，页面不会读到半个文件
    print(f'{data["updatedAt"]} 已写入 {out_path.name}：' + '，'.join(f'{k}={v}' for k, v in kpis.items()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv', required=True)
    ap.add_argument('--kpi', action='append', default=[], required=True)
    ap.add_argument('--role', help='日志记到哪个岗位（岗位 id）')
    ap.add_argument('--encoding', default='utf-8-sig')
    ap.add_argument('--watch', type=int, default=0, help='每隔多少秒重读一次（导出表会被覆盖更新时用）')
    ap.add_argument('--dry-run', action='store_true', help='只算出数字给你看，不写 data/live.json')
    ap.add_argument('--where', action='append', default=[], help='只算某列等于某值的行，如 订单状态=已付款；可写多个，同时满足')
    a = ap.parse_args()
    run(a)
    while a.watch and not a.dry_run:
        time.sleep(max(10, a.watch))
        run(a)


if __name__ == '__main__':
    main()
