---
name: cap-tiktok-ip-purchase
description: "指导选择和购买 TikTok 业务所需的目标地区 IP：东南亚优先 911Proxy，欧美优先 Miya 或 IPRoyal，并核对静态住宅、ISP、独享、城市和 ASN 等规格。"
---

# IP 购买

## 工作方式

由课前准备入口发起（课前准备上下文）时，先读取 [课前准备流程控制契约](../cap-tiktok-prep/SKILL.md#流程控制契约全局硬规则)，继承当前步骤、状态和待返回位置。跳过、临时答疑、前置阻塞及结束条件按课前准备入口执行；缺少该依赖时不猜测控制规则、不继续顺序陪跑。模块内按现有 SOP 的独立结果建立固定节点编号，不能用“跳过”一次略过整套流程。

单独使用、没有课前上下文时，不套用课程 P 节点流程、跳过规则和结束祝词，只回答IP 选择与购买；本模块以外的问题简短说明不在本模块范围，交回[总入口](../cap-skill/SKILL.md)。单独使用时按[共用交接约定第 9 节“全程引导”](../cap-skill/references/shared-contracts.md#9-全程引导)带用户：每次留一个出口、卡住先诊断、会用的走快速模式。

用途仅限让网络环境稳定并与用户合法注册经营的市场一致；不协助绕过封禁或限制、多账号规避限制、伪造身份或规避平台审核。

读取 [references/purchase-specifications.md](references/purchase-specifications.md)。开头只问一个问题：目标国家（在哪个国家开店经营）；已经知道就不问。其余规格不逐项追问，按下方当前业务口径直接给默认推荐，用户有特别要求再改：

- 服务商：按目标国家所在区域选（见下方）。
- 类型：独享的静态住宅或 ISP（IPRoyal 选 ISP 产品）。
- 地区：选目标国家；州、城市是可选项，用户有指定再加。
- ASN：欧美要真实宽带运营商的 ISP-ASN（飞书举的例子：Comcast、AT&T、Spectrum、Verizon）；不选 Hosting、Datacenter、Cloud、VPS。
- 数量 1 个 IP；周期选页面常规套餐（飞书截图示例为 30 天），以页面当前选项为准。

给完推荐后，请用户付款前对照订单页逐项核对这几项（清单见 references 的“下单前核对”），对不上再问。付款由用户本人完成；附加选项会加价，先让用户看清页面上的金额再决定。IP 质量检测由 `cap-tiktok-ip-diagnostics` 负责。

## 当前业务口径（飞书 1.5「IP购买渠道」）

- 东南亚：优先 `911Proxy`（https://www.911proxy.com）。
- 欧美：优先 `IPRoyal`（https://iproyal.com）或 `Miya`（https://miyaip.com）；IPRoyal 下单时加附加需求，见 references。
- 优先目标地区匹配、长期稳定、独享的静态住宅或 ISP。
- 避免 Hosting、Datacenter、Cloud、VPS，除非目标产品就是该类型。

## 一步一步（以 IPRoyal 为例，飞书写得最全）

1. 电脑连上粉猫（系统代理），用 Chrome 打开 IPRoyal，语言切中文，用 Google 账号登录。完成：看到 IPRoyal 主页。
2. 主页找到 **ISP** 卡片，点 **现在购买**。完成：进入 ISP 独享订单页（Create ISP Dedicated order）。
3. 按 references 的“IPRoyal 订单页怎么选”填周期、数量、国家、欺诈分档和附加需求。截图验收：订单页填好、还没付款的样子。
4. 付款前按[总入口硬规则 10](../cap-skill/SKILL.md) 说清楚：这单多少钱（Premium 档和附加需求会加价，以 Summary 金额为准）、是一次性还是按周期续费、怎么停止续费。用户本人付款，AI 不碰付款信息。
5. 付款后到 **我的订单** → 打开这笔订单的 **代理详情**，把 **协议** 从 HTTP 改成 **SOCKS5**，格式保持 `HOST:PORT:USER:PASS`。截图验收：协议栏显示 SOCKS5（用户名、密码打码）。

购买后只确认 Address（页面上叫“主持人”或 IP 地址）、Port、Username、Password、协议是否齐全，不要求用户把完整参数发给 AI。下一步：手机用小火箭的交给 `cap-tiktok-shadowrocket-treehole`。用软路由的，本技能包没有软路由配置模块，指到飞书 1.5「基础版IP配置流程（软路由版）」，卡住转工作人员。

## 常见问题

- 学员同一步第二次卡住：指到飞书 1.5「基础版IP配置流程（软路由版）」的「3.IP 购买」，或小火箭版的「IP购买渠道」那一段（链接见[飞书章节对照](../cap-skill/references/feishu-map.md)）；第三次转【船长电商】工作人员（在社交媒体上搜索“船长电商”）。
- 911Proxy、Miya 飞书只给了网址，没有下单步骤：进官网选静态住宅或 ISP 产品，按 references 的“下单前核对”逐项看，以页面为准，付款前说清楚花多少钱、怎么续费；看不懂就转工作人员，不按印象补写按钮。
