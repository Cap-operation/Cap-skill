#!/usr/bin/env python3
"""接口插座示例：把后台导出的 CSV 汇总成工作台的标准 live.json。（接口阶段才用）

为什么先用导出表：不用碰任何密码或令牌，老板从后台点“导出”就行；
确认数字和画面都对了，再换成官方接口（写法相同，只是数据来源换成 API）。

  python3 connectors/csv_to_live.py --csv 订单导出.csv --kpi orders=count --kpi gmv=sum:实付金额
  python3 connectors/csv_to_live.py --csv 订单导出.csv --kpi gmv=sum:Order Amount --watch 60

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


def run(a):
    rows = list(csv.DictReader(open(a.csv, encoding=a.encoding, newline='')))
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
    data['kpis'] = kpis
    data['updatedAt'] = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    data.setdefault('logs', []).append({'id': 'csv-' + data['updatedAt'], 'roleId': a.role, 'text': f'已从导出表读取 {len(rows)} 行', 'level': 'info'}) if a.role else None
    data['logs'] = data.get('logs', [])[-30:]
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{data["updatedAt"]} 已写入 {out_path.name}：' + '，'.join(f'{k}={v}' for k, v in kpis.items()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv', required=True)
    ap.add_argument('--kpi', action='append', default=[], required=True)
    ap.add_argument('--role', help='日志记到哪个岗位（岗位 id）')
    ap.add_argument('--encoding', default='utf-8-sig')
    ap.add_argument('--watch', type=int, default=0, help='每隔多少秒重读一次（导出表会被覆盖更新时用）')
    a = ap.parse_args()
    run(a)
    while a.watch:
        time.sleep(max(10, a.watch))
        run(a)


if __name__ == '__main__':
    main()
