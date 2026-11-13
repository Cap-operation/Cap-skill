# Cap-skill v4.0

船长电商 TikTok 跨境电商 Skill 系统：一个总入口 + 六位业务大师 + 工作台、流量、营销、社媒、岗位、知识库六位扩展大师 + 课前准备与开店经营模块。适用于支持 `SKILL.md` 技能格式的 AI 客户端（Claude Code、Codex 等）。

> 版本：**4.1.0**。已通过结构校验和离线场景检查。店铺、广告或客服账户第一次接入时，会先只读核对数据和权限，确认无误后再执行任何修改。

## 安装

**一行安装（推荐，需要 Node.js）**：

```sh
npx skills add Cap-operation/Cap-skill
```

按提示选择你使用的 AI 客户端，并**选中全部 23 个技能**（模块之间互相引用，需装在同一目录）。

**手动安装（只需 Git 和 Python 3）**：

```sh
git clone https://github.com/Cap-operation/Cap-skill.git
cd Cap-skill
python3 scripts/install.py install --dest ~/.claude/skills --dry-run   # 先预览
python3 scripts/install.py install --dest ~/.claude/skills
```

**Windows**（PowerShell 或命令提示符，Python 3 用 `py` 启动）：

```sh
git clone https://github.com/Cap-operation/Cap-skill.git
cd Cap-skill
py -3 scripts\install.py install --dest %USERPROFILE%\.claude\skills --dry-run
py -3 scripts\install.py install --dest %USERPROFILE%\.claude\skills
```

PowerShell 里把 `%USERPROFILE%` 换成 `$HOME`。装好后运行一次 `status`（见下文“检查更新”），确认 23 个模块都是“已是最新”。

`--dest` 换成你的客户端技能目录：Claude Code 为 `~/.claude/skills`；Codex 等客户端以其文档中的技能目录为准。安装器不会删除任何文件：遇到你改过的模块会停下报告冲突；旧版 `captain-tiktok*` 只在加 `--disable-legacy` 时移入备份目录。回滚：

```sh
python3 scripts/install.py rollback --dest ~/.claude/skills
```

## 检查更新

```sh
git pull
python3 scripts/install.py status  --dest ~/.claude/skills   # 看哪些模块有新版本、哪些被你改过
python3 scripts/install.py install --dest ~/.claude/skills   # 更新
```

`status` 只读不写，会列出本机安装的版本、仓库版本、每个模块的状态（已是最新 / 可更新 / 本地改过 / 未安装）和本次更新内容摘要。用 `npx skills add` 安装的，重新运行该命令即可更新。

## 怎么用

直接说你要做的事，总入口 `cap-skill` 会判断场景并分派。商家请直接描述任务（如“评估这个商品”），不要以“开始使用”开头：这句话会进入课前准备，该会话之后只处理课前步骤；要做业务请新开会话。

| 场景 | 例子 | 处理模块 |
|---|---|---|
| 学员课前准备 | “开始使用” | `cap-tiktok-prep`（原 `captain-tiktok`，流程不变） |
| 商家经营 | “评估这个商品”“改个开头钩子”“看下广告报表” | 六位大师 / 店铺经营 |
| 系统维护 | “帮我审计并打包 Skill” | `cap-tiktok-governance` |

## 模块

| 模块 | 名称 | 做什么 |
|---|---|---|
| `cap-skill` | 总入口 | 场景判断、路由、共用规则（交接约定、利润口径、宿主适配） |
| `cap-tiktok-selection` | 船长选品大师 | 八环节选品、100 分评分、FastMoss 可选 |
| `cap-tiktok-breakdown` | 船长拆解大师 | 参考文案拆解、钩子、中文口播、多版本 |
| `cap-tiktok-site` | 船长建站大师 | 独立站 / 承接页，Shopify 与 Sites 分路径 |
| `cap-tiktok-listing` | 船长上架大师 | 商品采集、优化、核价、经 DSers 推送到 Shopify / Wix；TikTok Shop 只出资料包，原生上架由店铺经营负责 |
| `cap-tiktok-ads` | 船长投流大师 | TikTok 官方广告 MCP、Ads/Smart+、GMV Max、分析与授权执行；Meta、Google、亚马逊等平台报表只读诊断 |
| `cap-tiktok-service` | 船长客服大师 | 客服十能力域、Chatwoot、知识库、人工交接 |
| `cap-tiktok-workbench` | 船长工作台大师 | 按六步走：视觉风格（先把公司名字挂上画面）→ 功能按键 → 应用场景 → 优化 → 接口 → 交付；用零件库和 GitHub 开源项目拼出炫酷的 OPC 工作台，先模拟调试，最后接数据插座和执行插座 |
| `cap-tiktok-traffic` | 船长流量大师 | 独立站 SEO 与 GEO：被谷歌搜到、被 ChatGPT 等 AI 推荐；中文体检结论与修复清单；随包 SEO 33 项、GEO 16 项方法，另装完整版检测程序时自动抓取打分 |
| `cap-tiktok-marketing` | 船长营销大师 | 客户研究、卖点、文案、促销定价、转化优化、邮件短信、上新与复购（27 项方法） |
| `cap-tiktok-social` | 船长社媒大师 | 找爆款与趋势、拆竞品和达人、挖评论、Instagram 与 YouTube 运营（37 项方法） |
| `cap-tiktok-roles` | 船长岗位大师 | 经营报告、现金流、库存、对账、采购、合同初审、招聘与 SOP（43 项方法） |
| `cap-tiktok-knowledge` | 船长知识库大师 | Obsidian 知识库：需求诊断、资料加工、结构设计、星空图谱、长期复用 |
| `cap-tiktok-shop` | 店铺经营主线 | 市场、主体、注册、合规、上线、定价、达人、履约、财务 |
| `cap-tiktok-operations` | 运营诊断 | TikTok 账号功能与平台提示 |
| `cap-tiktok-prep` | 课前准备 | 学员课前固定流程 |
| `cap-tiktok-computer-prep` 等 6 个 | 基础模块 | 电脑、手机、Apple ID、小火箭与树洞、IP 购买与检测 |
| `cap-tiktok-governance` | 源码维护 | 版本、来源、发布与回滚 |

完整清单见 [modules.json](modules.json)。

## 外部工具（不随本仓库分发）

FastMoss、Shopify 官方工具、DSers MCP Product、TikTok 官方广告 MCP、Chatwoot，以及流量大师可选的 claude-seo、geo-seo-claude 完整版检测程序，需要你在自己的客户端里单独安装和授权。没有这些工具时，各大师会交付方案、稿件、资料包或基于你导出数据的分析，并注明交付层级，不会假装已经连上。

## 商家档案

商家任务会在你当前工作文件夹里建一个 `cap-商家档案/`（先问你同意）：店铺和账户地图、各国家成本率、投流结果回流。问过一次的不再问；里面不存密码、令牌或买家个人信息。不想保存时直接说“别记”。

## 校验

```sh
python3 scripts/validate.py            # 结构、链接、唯一真源、课前流程回归、校验值
python3 tests/run_offline_checks.py    # 打包、干净环境安装、迁移冲突、回滚（只用临时目录）
```

静态校验不等于模型行为测试，也不等于真实平台联调；三者的结果分别记录在 [tests/](tests/)。

## 其他文档

- [CHANGELOG.md](CHANGELOG.md)：v4.0 变更
- [MIGRATION.md](MIGRATION.md)：从 3.1 / `captain-tiktok*` 升级与回滚
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)、[sources.lock.json](sources.lock.json)：来源与许可
- [RELEASE_READINESS.md](RELEASE_READINESS.md)：能力状态与发布前待办

## 许可

© 2026 船长电商（Cap-operation）。本仓库自有内容按 [CC BY-NC-SA 4.0](LICENSE)（署名-非商业性使用-相同方式共享）授权：

- 可以免费安装、使用、修改和分享，需注明出处；
- 不得用于商业目的，包括转售本 Skill、改编成付费课程或付费产品、打包进收费服务；
- 修改后再分享，须使用同样的许可证。

**额外许可**：用本 Skill 经营你自己的店铺、账号或业务（选品、写文案、上架、投流、客服等），不视为上述“商业目的”，可以直接使用。

需要商业授权，请联系【船长电商】工作人员。第三方依赖各自的许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
