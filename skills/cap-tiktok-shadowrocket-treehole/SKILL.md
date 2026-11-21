---
name: cap-tiktok-shadowrocket-treehole
description: "处理 Shadowrocket 小火箭与树洞订阅链路：二维码导入、节点选择、Socks5 代理添加、Proxy Pass 设置、连接开关和网页连通性验收。"
---

# Shadowrocket 与树洞

## 工作方式

由课前准备入口发起（课前准备上下文）时，先读取 [课前准备流程控制契约](../cap-tiktok-prep/SKILL.md#流程控制契约全局硬规则)，继承当前步骤、状态和待返回位置。跳过、临时答疑、前置阻塞及结束条件按课前准备入口执行；缺少该依赖时不猜测控制规则、不继续顺序陪跑。模块内按现有 SOP 的独立结果建立固定节点编号，不能用“跳过”一次略过整套流程。

单独使用、没有课前上下文时，不套用课程 P 节点流程、跳过规则和结束祝词，只回答小火箭与树洞配置；本模块以外的问题简短说明不在本模块范围，交回[总入口](../cap-skill/SKILL.md)。单独使用时按[共用交接约定第 9 节“全程引导”](../cap-skill/references/shared-contracts.md#9-全程引导)带用户：每次留一个出口、卡住先诊断、会用的走快速模式。

用途仅限让网络环境稳定并与用户合法注册经营的市场一致；不协助绕过封禁或限制、多账号规避限制、伪造身份或规避平台审核。

读取 [references/relay.md](references/relay.md)。顺序：[Apple ID](../cap-tiktok-apple-id/SKILL.md) → [IP 购买](../cap-tiktok-ip-purchase/SKILL.md) → 本模块 → [IP 检测](../cap-tiktok-ip-diagnostics/SKILL.md)。所以小火箭路线注册 Apple ID 时手机上还没有小火箭和美国 IP，那一步用自家 Wi-Fi 注册（见 Apple ID 模块“开始前确认”）；美国 IP 要到本模块配好后才有，IP 检测放在最后。单独 IP 参数（Address、Port、Username、Password、协议类型）来自 IP 购买；缺少时先回 IP 购买，不自行编造。引导用户一次完成一个动作，每一步截图确认。

## 开始前确认

- 手机上已装好小火箭（Apple ID 模块的最后一步）。
- 有树洞账号和有效套餐：电脑连上粉猫后打开树洞 https://dash.gwshudong.com 注册登录（飞书 1.5 说可以用 QQ 邮箱注册），飞书 1.1 买的是 Pro 套餐，按月付费。付款前按[总入口硬规则 10](../cap-skill/SKILL.md) 说清楚：这单多少钱、是月付、会不会自动续费、怎么停止续费，都以树洞页面为准；用户本人付款。打不开树洞属于电脑准备（`cap-tiktok-computer-prep`），不在这里重教。
- 已经买好单独 IP，并在订单详情里把协议改成 Socks5（IP 购买模块）。

## 关键流程（飞书 1.5「基础版IP配置流程（小火箭Shadowrocket版）」）

一次只带一步，每步说清在画面上找什么、什么算完成。

1. 打开小火箭，弹出“使用无线数据”时选 **WLAN Only**（飞书截图选的这一项）；弹出通知权限选 **Allow**。完成：进入小火箭首页，显示 Not Connected。
2. 首页点 **Global Routing**，选 **Proxy**。完成：首页 Global Routing 右边显示 Proxy。
3. 点首页左上角的扫码图标，相机权限选 **Allow**。完成：出现扫码画面。
4. 电脑打开树洞用户中心，右侧“订阅地址”里点 **Shadowrocket 订阅**，下拉选 **扫描二维码添加订阅**，用手机扫屏幕上的二维码。截图验收：小火箭首页出现 `gw树洞` 订阅和一串节点。不要截电脑上的二维码发给 AI（二维码里就是订阅链接）。
5. 点首页右上角 **+**，在 Add Server 里点 **Type**（默认是 Subscribe），改成 **Socks5**。完成：Type 显示 Socks5，下面出现 Address、Port、User、Password。
6. 电脑打开 IP 订单详情页（以 IPRoyal 为例，协议已改成 SOCKS5），按顺序填 **Address**、**Port**、**User**、**Password**。填错任意一项都连不上，让用户自己逐项对一遍。
7. 关掉 **UDP Relay**；点 **Proxy Pass**，展开 `gw树洞`，优先选 **日本** 或 **新加坡** 节点。完成：Proxy Pass 右边显示所选节点名。
8. 点右上角 **Save**。截图验收：Add Server 页 Type 为 Socks5、UDP Relay 关、Proxy Pass 有节点（User 打码，Password 保持隐藏）。
9. 回首页点 **Connectivity Test**，等节点右边出现绿色毫秒数；再点选 **Local Servers** 下刚加的那一条（显示 `SOCKS5 > VMESS`），左边出现圆点就是选中了。
10. 打开首页第一行的开关。弹出 Install VPN Profile 点 **OK**，弹出添加 VPN 配置点 **Allow**（要输入手机锁屏密码时用户自己输）。完成：第一行显示已连接。
11. 用 Safari 打开 ipleak.net、ping0.cc、whoer.net 任一个，看显示的国家、运营商是不是所买 IP 的。截图验收后交给 [IP 检测](../cap-tiktok-ip-diagnostics/SKILL.md) 判定是否通过。

## 常见问题

- 中转是什么：课程里的“中转”就是树洞订阅节点，在 Proxy Pass 里当单独 IP 的前置线路；飞书列的中转渠道和排障思路见 [references/relay.md](references/relay.md)。
- Connectivity Test 没有绿色数字：先看树洞订阅是否到期、节点能不能测通，再逐项核对 Address、Port、User、Password 和 Type 是否为 Socks5。
- 用户用的是软路由不是小火箭：本模块不带软路由配置，指到飞书 1.5「基础版IP配置流程（软路由版）」，卡住转工作人员。
- 学员同一步第二次卡住：指到飞书 1.5 小火箭版那一节（链接见[飞书章节对照](../cap-skill/references/feishu-map.md)）；第三次转【船长电商】工作人员（在社交媒体上搜索“船长电商”找工作人员）。

不在对话中复述完整订阅链接、认证参数、UUID 或密码；用户发来的截图里露出用户名、密码或订阅链接时，提醒他打码后重发，不复述内容。
