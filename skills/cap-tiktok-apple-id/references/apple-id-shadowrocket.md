# 美国 Apple ID 与 Shadowrocket

## 使用说明

这份流程按飞书「第 1 章 · 1.6 纯正美区本土APPLE ID 注册」写，用于由学员自己注册一个长期可控的美国 Apple ID，在美国区 App Store 下载 Shadowrocket（小火箭）。AI 一次只指导一个动作，关键页面完成后让学员上传打码截图，再继续下一步。

账号、手机号、邮箱、密码、验证码、付款资料、账单地址和兑换码都属于学员个人敏感信息，禁止发送给 AI。截图时遮住这些内容。

学员同一步第二次还卡，按[飞书知识库章节对照](../../cap-skill/references/feishu-map.md)指到 1.6 对应段落；第三次转【船长电商】工作人员（在社交媒体上搜索“船长电商”找工作人员）。

## 一、开始前确认

飞书 1.6 第一部分要求注册前手机和网络先准备好。逐项确认，没做的交对应模块，做完再回来：

1. 手机已经抹掉或刷机（见[手机设备初始化](../../cap-tiktok-device-reset/SKILL.md)，飞书 1.3），并且拔掉了 SIM 卡，注册全程无卡。
2. 激活时语言选了 `English`、地区选了 `United States`，定位服务关闭，数据与诊断都选不共享。
3. 网络，先问学员走哪条路线，按路线分开做：
   - **软路由路线**（飞书 1.6「一、设备重置与硬环境伪装」里「软路由网络层接管」的做法）：手机连软路由发出的、已配好美国住宅 IP 的 Wi-Fi。连好后用 Safari 打开 `whoer.net` 或 `ipinfo.io`，确认显示美国、DNS 没有中国大陆的、手机时区已经跟 IP 所在城市一致。
   - **小火箭路线**（课程默认）：顺序是 Apple ID → IP 购买 → 小火箭 → IP 检测，这时手机上还没有小火箭，也还没有美国 IP。直接连自家 Wi-Fi 注册，不要求 `whoer.net` 显示美国，也不用先买 IP。飞书没写这种情况，按页面选 United States：注册时地区是激活时选好的 `United States`，第五部分 Review 里国家/地区也确认是 `United States`。时区先保持设备准备时选的美国时区，买好 IP 后在 IP 检测那一步再对齐。

验收：
- 软路由路线：学员发 `whoer.net` 或 `ipinfo.io` 的结果截图（显示国家和 DNS 的部分）。
- 小火箭路线：这一部分不要网络截图，验收放到第五部分，看 Review 页显示 `United States` 的截图。

## 二、注册素材

正式注册前准备好三样（飞书 1.6「二、注册素材整备」）：

- **邮箱**：默认在注册时直接创建一个 `@icloud.com` 邮箱（第三部分第 4 步）；也可以用一个全新、没绑过 Apple 账号的海外邮箱。
- **美国手机号**：用于短信验证，在 SMSPool（https://www.smspool.net）租一个能收 Apple 验证码的美国号码。**到了填手机号那一步再租**，注意接码倒计时。租号要花钱，先按[总入口硬规则 10](../../cap-skill/SKILL.md) 说清楚大概花多少（以 SMSPool 页面显示为准）、由学员自己付款。
- **本人 +86 手机号**：注册完要绑成第二个受信任号码，防止以后接码号码失效收不到 6 位验证码（见第四部分）。
- **账单地址**：学员自己能对应的真实美国地址，最好在不收销售税的州。怎么选见第五部分第 6 步。AI 不提供、不代找、不编地址。

## 三、在 iPhone 设置中创建 Apple ID

飞书要求放弃网页注册，从 iPhone 设置最上方的登录入口注册。一次只做一步：

1. 打开 `Settings`，点最上面的登录入口（新系统显示 `Apple Account`，旧系统显示 `Sign in to your iPhone`）。
2. 点蓝字 `Don't have an Apple Account?`（有的系统写 `Don't have an Apple Account or forgot it?`）。
3. 出现 `Age Range` 年龄段页面时选 `Adult（18 or older）`；旧系统弹窗时选 `Create Apple Account`。
4. `Name and Birthday`：姓名用本人姓名的拼音或英文名填 `First Name`、`Last Name`；`Birthday` 点 `Add` 填本人真实生日，必须满 18 岁（未满 18 岁的停在这里，转工作人员）。点 `Continue`。
5. `Email Address` 页面：点蓝字 `Don't have an email address?` → 弹窗里点 `Get an iCloud Email Address` → 输入想要的邮箱名（飞书建议名 + 姓 + 数字）→ `Continue` → 弹窗 `Create ...@icloud.com?` 点 `Create Email Address`。创建后不能改，先确认拼写。
   - 用自己已有的海外邮箱的：在这一页直接填邮箱，按屏幕提示去邮箱完成验证（Apple 官方《How to create a new Apple Account》https://support.apple.com/en-us/108647 ，2026-11-21 核对）。
6. `Apple Account Password`：在 `Password` 和 `Verify` 两栏填同一个密码。页面要求至少 8 位、含数字、大写和小写字母，飞书建议再加一个符号。密码学员自己记好，不发给 AI。
7. `Phone Number`：确认国家代码是 `+1 (United States)`，`Verify Using` 选 `Text Message`。这时去 SMSPool：左边 `快速订购`，`服务` 选 `Apple`，`定价选项` 选成功率最高的那项，国家选 `US`，点 `Purchase` 拿号码。把号码填进手机，点 `Continue`。
8. 回 SMSPool 刷新，拿到验证码后尽快填进手机。验证码不发给 AI。
9. `Terms and Conditions`：点 `Agree`。手机显示 `Signing in...`，等它进完。

验收：设置里 `Apple Account` 页面出现姓名和 `Personal Information`、`Sign-In & Security` 等选项（截图遮住邮箱）。

## 四、绑定本人 +86 手机号

飞书 1.6 要求注册完马上在设置里绑一个中国大陆 +86 手机号，防止之后二次验证收不到 6 位验证码。这一步要趁 SMSPool 的号码还能收短信时做。路径（与 Apple 官方《About trusted phone numbers and trusted devices for Apple Account》https://support.apple.com/en-us/122621 一致，2026-11-21 核对）：

1. `Settings` → 最上面的 Apple 账户（姓名）→ `Sign-In & Security` → `Two-Factor Authentication`。
2. 点 `Add Trusted Phone Number`。
3. 如果弹出 `Two-Factor Authentication` 验证码框、提示码发到原来那个 +1 号码（尾号对得上），回 SMSPool 刷新取码填入；要求输入锁屏密码就输入。
4. 国家选中国大陆 `+86`，填本人手机号，选短信验证，收到验证码填入。

验收：`Two-Factor Authentication` 页面的号码列表里能看到一个 +86 号码（截图遮住号码，只留前缀）。

Apple 官方也要求至少有一个自己能收验证码的受信任号码；SMSPool 号码过期后，以后收码就靠这个 +86 号码，所以这一步不能省。

## 五、补全 App Store 资料（下载前的关键一步）

此时账号已登录 iCloud，但还不能在 App Store 下载。

1. 打开 App Store，点右上角头像。
2. 提示这个账号还没在 iTunes Store 用过时，点 `Review`。
3. 国家/地区确认是 `United States`，打开同意条款的开关，点 `Next`。
4. `Payment Method`：选 `None`。从设置里注册的账号最容易出现 `None` 这个选项（飞书原意）；没有 `None` 时先截图诊断，不急着填付款资料。
5. `Billing Address`：填街道地址、城市、州、邮编和电话。
6. 账单地址怎么选：
   - 用学员自己能对应的真实美国地址，例如本人、本人公司，或对方同意让你使用的地址；城市、州、邮编必须互相对得上。
   - 能选的话放在不收销售税的州。飞书点名的是 Oregon、Delaware、Montana、New Hampshire、Alaska 五个州，推荐 Oregon 或 Delaware。原因：下面用 3 美金礼品卡买小火箭，账单地址在收税州时价格要加消费税，3 美金不够扣，会提示余额不足。最终扣多少以购买页面显示为准。
   - 学员没有能对应的真实美国地址：AI 不提供现成地址、不帮忙在地图上找别人的地址、不编地址，停在这一步转【船长电商】工作人员。
7. 点 `Next` 完成。

如果无法选美国区、资料不通过或提示账号地区异常，先截图诊断，不要连续修改地区和地址。

验收截图：`Review` 页国家/地区显示 `United States` 的截图（小火箭路线就以这张为准）；`Review` 完成后的页面；回到 App Store 搜索 `Shadowrocket` 的结果页。截图遮住账号邮箱、地址和余额。

## 六、充值美国区 App Store 余额

1. 软路由路线确认手机还连着美国 IP 的 Wi-Fi；小火箭路线这时还没有小火箭，照第一部分连自家 Wi-Fi 就行。打开 App Store。
2. 点击右上角头像。
3. 点击 `Redeem Gift Card or Code`。
4. 选择 `Enter Code Manually`。
5. 粘贴 16 位礼品卡兑换码（通常以 X 开头），点击右上角 `Redeem`。
6. 检查账户余额是否增加。成功时会弹出“You've successfully redeemed your code”，账户余额同步增加（3 美金卡显示 `$3.00`）。

### 兑换报错怎么查

飞书 1.6 没写兑换报错，下面按 Apple 官方支持文章《If you can't redeem your Apple Gift Card or App Store & iTunes Gift Card》（https://support.apple.com/en-us/108285，2026-11-21 核对）。先请学员照着屏幕念出提示原文，或发打码截图（遮住兑换码和余额），对上一行，只改一处：

| 看到的提示 | 常见原因 | 怎么做 |
|---|---|---|
| Card is not valid（卡无效） | 码输错；输成了卡背面的序列号；或这张是只能在 Apple 零售店用的 Apple Store 礼品卡 | 手动输入以 X 开头的 16 位兑换码，注意 O 和 0 这类长得像的字符；确认卡能在 App Store 用 |
| Card has already been redeemed（已兑换过） | 可能已经充进去，只是余额没刷新 | 先看余额；在所有设备上退出 App Store 再登录，刷新余额；还是没有就找卖家 |
| Card is not activated（未激活） | 卖家没把卡激活 | 找卖家处理 |
| Code must be redeemed in a different country or region（须在其他国家或地区兑换） | 卡不是美国区的，或账号的 App Store 不是美国区 | 确认卡是美国区；按第五部分确认账号国家/地区是 United States，不反复切换 |

码刮花了、看不清，或都对过还是不行：联系卖家或 Apple 支持（Apple 支持可能会要卡的正反面照片、购买收据和序列号，序列号不是兑换码）。账号被锁、余额不足见下方“常见问题”。

只使用来源可靠、适用于美国区 App Store 的礼品卡。买卡按课程做法：在闲鱼搜“美区 Apple 礼品卡 3美金”或“美区苹果卡”，优先选信用极高（优秀/极好）、专门做自动发货的虚拟商家；价格过分低于汇率的不碰。警惕“黑卡”（盗刷信用卡生成的卡密）：新注册的账号一旦充了黑卡，会被永久锁定（Permanently Locked），前面的准备全部白费。要大批量或求稳，走美国亚马逊或 Apple 官网买官方最低面额的 Gift Card。买卡要花钱，先按[总入口硬规则 10](../../cap-skill/SKILL.md) 说清楚花多少、由学员自己付款。不要把礼品卡兑换码发给 AI；如果需要诊断，只上传打码后的结果页面。

## 七、下载 Shadowrocket（小火箭）

1. 在 App Store 搜索 `Shadowrocket`。
2. 核对开发者为 `Shadow Launch Technology Limited`，名称和图标都对，避开仿冒软件。
3. 确认账户余额够付页面显示的价格。飞书写的是 `$2.99`，免税州地址下扣完余额剩 `$0.01`；价格可能变，以 App Store 当时显示为准。
4. 点价格按钮，按提示双击侧边按钮用 Face ID、Touch ID，或输入 Apple ID 密码，由学员本人确认。
5. 等待下载和安装完成。
6. 打开 Shadowrocket，上传首页截图。

Shadowrocket 和“小火箭”是同一个 App，不需要分别下载。

### 下载验收

学员上传以下截图后，才进入后续的树洞节点导入流程：

1. App Store 搜索结果，确认名称和开发者；
2. Shadowrocket 已安装在桌面；
3. Shadowrocket 打开后的首页。

安装完成后，下一步是 `cap-tiktok-ip-purchase` 购买 IP，再由 `cap-tiktok-shadowrocket-treehole` 导入配置，最后 `cap-tiktok-ip-diagnostics` 检测。

## 八、常见问题

- **收不到短信验证码**：先看 SMSPool 里这个号码的倒计时还在不在；过期或一直没码，按 SMSPool 页面提示换号，退款规则以 SMSPool 页面为准。不要在手机上连续申请大量验证码。
- **以后登录要 6 位码、但 +1 号码已失效**：选发到 +86 号码；还没绑 +86 的，按 Apple 官方账号恢复流程处理，转工作人员。
- **账号创建失败**：上传原文提示，检查网络（回第一部分）、邮箱和设备时间。
- **没有 `None` 付款方式**：先截图；确认是从设置里注册的账号、地区是 United States，学员同一步第二次还卡指到飞书 1.6「三、iPhone 设置端注册实操流转」。
- **账号被锁或无法使用**：停止反复登录，使用 Apple 官方账号恢复或支持流程。
- **App Store 不是美国区**：先确认账号国家/地区，不反复切换商店。
- **礼品卡无法兑换**：按上面“兑换报错怎么查”对提示原文；学员同一步第二次还卡，指到飞书 1.6 的「四、消费激活与应用购买」。
- **搜不到 Shadowrocket**：确认 App Store 国家/地区，并上传搜索结果截图。
- **余额不足**：账单地址在收税州时，3 美金扣不够（价格加消费税）。补一张可靠来源的美国区礼品卡；不要为了免税去编一个免税州地址。
- **提示需要 Review 或完善资料**：按页面逐项完成，上传结果截图，不要反复切换国家/地区。
- **注册后无法找回账号**：停止继续修改，使用 Apple 官方账号恢复流程；如果账号来自第三方，不要把密码或恢复码发给 AI。

### 卡点查询规则

1. 先让学员提供报错原文、当前页面和已经完成的步骤。
2. 飞书 1.6 有的，按飞书；飞书没写的，查 Apple 官方支持文档、Apple 官方账号恢复或付款支持页面，并说清依据。
3. 将查询结果转成当前设备可执行的一步操作，再让学员截图确认。
4. 如果官方要求联系 Apple 支持、验证身份或处理付款争议，停止继续试错并转【船长电商】工作人员（在社交媒体上搜索“船长电商”找工作人员）。
5. 不使用来源不明的注册教程、虚构地址教程或共享账号教程替代上面的流程。

同一问题连续三轮无法解决时，整理现象、截图和已尝试步骤，转【船长电商】工作人员。
