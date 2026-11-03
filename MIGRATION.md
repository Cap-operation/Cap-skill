# 从 3.1 升级到 v4.0

## 旧 → 新映射

| 3.1 模块 | v4.0 模块 | 说明 |
|---|---|---|
| `captain-tiktok` | `cap-tiktok-prep` | **课前准备入口**，语义不变；不是新总入口 |
| — | `cap-skill` | 新增：跨境电商总入口与共用规则 |
| `captain-tiktok-computer-prep` | `cap-tiktok-computer-prep` | 改名 |
| `captain-tiktok-device-reset` | `cap-tiktok-device-reset` | 改名 |
| `captain-tiktok-apple-id` | `cap-tiktok-apple-id` | 改名 |
| `captain-tiktok-shadowrocket-treehole` | `cap-tiktok-shadowrocket-treehole` | 改名 |
| `captain-tiktok-ip-purchase` | `cap-tiktok-ip-purchase` | 改名 |
| `captain-tiktok-ip-diagnostics` | `cap-tiktok-ip-diagnostics` | 改名 |
| `captain-tiktok-operations` | `cap-tiktok-operations` | 改名；商家场景不再套课程锁 |
| `captain-tiktok-shop` | `cap-tiktok-shop` | 改名；选品真源移到选品大师，专业任务改为路由 |
| `captain-tiktok-ads` | `cap-tiktok-ads` | 改名；即“船长投流大师”，业务规则与六份参考全部保留 |
| `captain-tiktok-governance` | `cap-tiktok-governance` | 改名；增加 v4 真源表 |
| — | `cap-tiktok-selection` / `-breakdown` / `-site` / `-listing` / `-service` | 新增五位大师 |

## 内容迁移

- 选品流程与评分：`captain-tiktok-shop/references/product-selection.md` → `cap-tiktok-selection/references/scoring-and-flow.md`；旧文件保留为跳转说明。
- 贡献利润公式：从选品文件提取到 `cap-skill/references/profit.md`，全系统共用。
- 课前流程控制契约：仍在课前入口（`cap-tiktok-prep/SKILL.md`），只在课程场景生效。
- 共用交接、证据、授权、结果状态、能力四层：新增 `cap-skill/references/shared-contracts.md`。
- `captain-tiktok` 字样在正文中统一改为新名称；运行数据目录忽略规则同时保留旧名（见 `.gitignore`）。

## 升级步骤

1. 预览：`python3 scripts/install.py install --dest <技能目录> --dry-run`
2. 查看报告中的 `legacy_found`（旧版模块）和 `conflicts`（你改过的模块）。
3. 有本地修改时，先自行备份或合并；确认可以替换再加 `--replace-modified`（原文件会移入备份目录，不删除）。
4. 避免新旧两套同时触发：加 `--disable-legacy`，旧 `captain-tiktok*` 文件夹会移入 `<技能目录>/.cap-tiktok-backup/<时间>/`。
5. 安装后运行一次 `python3 scripts/validate.py`（在仓库目录）。

不使用安装器时：把 `skills/` 下 17 个文件夹复制到技能目录，并手动把旧 `captain-tiktok*` 文件夹移出该目录。

## 回滚

```sh
python3 scripts/install.py rollback --dest <技能目录>
```

- 删除本次安装且未被改动过的模块，把备份目录里被替换或停用的旧文件夹移回原位。
- 安装后又被你改过的模块会保留，并提示你手动处理。
- 回滚只影响本地技能文件，不会撤销任何店铺、广告或消息平台上的操作。

也可以用你保存的 3.1 候选包恢复。注意 Git 标签 `v3.0.0` 是更早的版本，不含广告模块。
