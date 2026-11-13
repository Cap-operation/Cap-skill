# 第三方来源与许可

除下文「随包分发」一节列出的内容外，本仓库**没有复制或打包**任何第三方源码、二进制或文档正文。下表项目是运行时可选依赖或方法参考，需要用户自行安装并遵守其许可。版本与提交见 [sources.lock.json](sources.lock.json)；未知的提交写为 `null`，不以本地哈希冒充上游提交。

| 项目 | 许可 | 在本仓库中的使用方式 |
|---|---|---|
| [FastMoss CLI](https://github.com/FastMoss/cli) | npm 元数据为 UNLICENSED，独立再分发许可未确认 | 只写自有适配说明，不附带任何 FastMoss 文件 |
| [Shopify AI Toolkit](https://github.com/Shopify/Shopify-AI-Toolkit) | MIT | 只引用链接，描述条件路径 |
| [DSers MCP Product](https://github.com/rhkiswani/dsers-mcp-product) | MIT | 用自己的话描述 v1.3.3 的行为与副作用，未复制代码或文档 |
| TikTok for Business 官方广告 MCP | TikTok 条款 | 运行时连接，未附带任何官方材料 |
| [Chatwoot skills](https://github.com/fxckcode/chatwoot-skills) / [Chatwoot 文档](https://www.chatwoot.com/docs) | MIT | 只引用链接，客服模块为自写摘要 |
| [claude-seo](https://github.com/AgriciDaniel/claude-seo) / [geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) | MIT | 流量大师的可选运行时工具，由用户自行安装；本仓库只写调用顺序和中文交付规则，未复制代码或文档 |
| [marketingskills](https://github.com/coreyhaines31/marketingskills) social / ad-creative | MIT | 仅作方法参考，拆解模块为原创文字 |

## 随包分发

| 项目 | 许可 | 打包位置与改动 |
|---|---|---|
| [Claw-Empire](https://github.com/GreenSheep01201/claw-empire)（GreenSheep01201，提交 `66a24ea7df2435ef897c48c147deb7ec572c01c2`） | Apache-2.0 | `skills/cap-tiktok-workbench/assets/parts/pixel-office/`：家具绘制代码（经船长OPC工作台从 PixiJS 改写为 Canvas 2D，再改为按岗位数自动布局）与 60 张角色像素图（等比缩小到 160px 高，未改画面内容）。完整许可证在该目录 `LICENSE`，来源说明在 `part.js` 文件头。原工作台中的第三方动漫形象图未打包。 |

| [claude-seo](https://github.com/AgriciDaniel/claude-seo)（AgriciDaniel，提交 `cca7e4a`） | MIT | `skills/cap-tiktok-traffic/references/library/claude-seo/`：33 项技能与 19 个子助手的 Markdown 正文 |
| [geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude)（Zubair Trabzada，提交 `989cae0`） | MIT | `skills/cap-tiktok-traffic/references/library/geo-seo-claude/`：16 项技能与 5 个子助手 |
| [marketingskills](https://github.com/coreyhaines31/marketingskills)（Corey Haines） | MIT | `skills/cap-tiktok-marketing/references/library/marketingskills/`：27 项技能的 Markdown 正文 |
| [social-media-research-skills](https://github.com/ScrapeCreators/social-media-research-skills)（ScrapeCreators） | MIT | `skills/cap-tiktok-social/references/library/social-media-research-skills/`：13 项 |
| [instagram-agent-skill](https://github.com/Jakeschincariol/instagram-agent-skill)、[youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill)（Jake Schincariol） | MIT | `skills/cap-tiktok-social/references/library/` 下同名文件夹：13 项、11 项 |
| [claude-ads](https://github.com/AgriciDaniel/claude-ads)（AgriciDaniel） | MIT | `skills/cap-tiktok-ads/references/library/claude-ads/`：19 项 |
| [knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)（Anthropic） | Apache-2.0 | `skills/cap-tiktok-roles/references/library/knowledge-work-plugins/`：34 项 |
| [claude-skills](https://github.com/alirezarezvani/claude-skills)（Alireza Rezvani） | MIT | `skills/cap-tiktok-roles/references/library/claude-skills/`：9 项 |

以上参考库的统一改动：只收录 Markdown 正文；每个技能的 `SKILL.md` 改名为 `guide.md`；指向未收录文件的链接改为纯文字；本机绝对路径改为 `~`；脚本、数据文件和图片未收录；正文未改写。各来源文件夹内附原始 `LICENSE`。Apache-2.0 来源的修改说明即本段。Cap 自有的中文规则写在各模块 `SKILL.md`，按本仓库许可发布；第三方原文仍按其原许可。

工作台大师运行时经用户确认从 GitHub 安装的项目或 Skill 不属于本仓库，来源登记在用户自己的工作台 `THIRD_PARTY_NOTICES.txt` 或 Skill 文件夹的 `SOURCE.txt` 中。

若以后实质复制上述 MIT 项目的文本或代码，需固定上游提交，并在本文件附上对应的完整版权与许可声明。

第三方 MIT 许可不决定本仓库自有内容的许可证；本仓库自有内容按 CC BY-NC-SA 4.0 授权，见 LICENSE 与 README。
