# 校园闲置汇 · 校园闲置二手交易小程序（从 0 开始）

面向本校学生的闲置交易小程序：商品展示、分类、搜索、站内聊天、线下当面成交。
**不做线上支付**：买卖双方在站内聊天约定后，线下当面交易；双方在聊天页确认"交易完成"后，商品自动下架并留存交易记录。卖家也可自行下架（不算成交）。

技术方案：微信云开发（云函数 + 云数据库 + 云存储），**不需要服务器、不需要域名、不需要备案**（演示用体验版完全不涉及审核/备案）。

---

## 一、项目结构

```
campus-secondhand/
├── project.config.json        # 开发者工具项目配置（要改 AppID）
├── miniprogram/               # 小程序前端（13 个页面）
│   ├── app.js / app.json / app.wxss
│   ├── utils/                 # 登录与工具函数
│   └── pages/                 # index 首页 / search 搜索 / publish 发布 /
│                              # goods/detail 详情 / chat 聊天 / orders 交易 /
│                              # favorites 收藏 / my-goods 我发布的 /
│                              # reviews 评价 / report 举报 / login 登录 / mine 我的
├── cloudfunctions/            # 云开发后端（10 个云函数）
│   ├── init     初始化：建集合 + 分类
│   ├── login    登录 / 学号注册 / 签到
│   ├── user     个人资料 / 数据统计
│   ├── goods    商品发布 / 列表 / 搜索 / 上下架
│   ├── favorite 收藏
│   ├── chat     会话 / 消息 / 未读
│   ├── order    交易确认（双方确认=成交）
│   ├── review   评价
│   ├── report   举报
│   └── admin    管理后台接口（审核 / 用户 / 举报 / 统计）
├── admin/index.html           # 管理后台（浏览器打开，Vue3 + ECharts）
└── tools/gen_icons.py         # tab 图标生成脚本（已运行，可忽略）
```

---

## 二、准备材料

1. 一个微信号（用于注册小程序账号）
2. 一台电脑（Windows / macOS 均可）
3. 学号信息（用于测试登录）

---

## 三、从 0 开始的完整步骤

### 第 1 步：注册小程序账号（拿 AppID）

1. 浏览器打开 <https://mp.weixin.qq.com> ，点右上角"立即注册"，选择"小程序"。
2. 用邮箱注册（激活邮件里的链接），选择主体类型：**个人**（演示/课程作业选个人即可，免费）。
3. 登录后台后，在 **设置 → 基本设置** 页面下方找到 **AppID（小程序ID）**，复制保存。

> 说明：名字、类目先不用纠结。只做演示的话，不提交审核，名字乱填也不影响（体验版不过审）。

### 第 2 步：安装微信开发者工具

1. 打开 <https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html>
2. 下载"稳定版"，一路下一步安装完成。

### 第 3 步：导入项目

1. 打开微信开发者工具，用你自己的微信扫码登录。
2. 点"导入项目"，目录选择本项目文件夹 `campus-secondhand`。
3. 此时会提示 AppID 不对：把项目里 `project.config.json` 中的
   `"appid": "touristappid"` 改成你第 1 步复制的 AppID（在开发者工具里：详情 → 基本信息 → 也可以直接改 AppID）。
4. 等待编译完成，能看到小程序界面（此时登录功能还需要第 4、5 步）。

### 第 4 步：开通云开发，创建环境

1. 在开发者工具顶部工具栏点 **云开发** 按钮（一朵云的图标），按提示开通（首次要授权）。
2. 创建环境：环境名称随便填（例如 `campus-demo`），**记下环境 ID**（形如 `campus-demo-xxxxx`）。
3. 开通后，左侧出现"云开发控制台"，可以看到数据库、云函数、存储。

### 第 5 步：部署云函数（10 个）

1. 在开发者工具左侧文件树找到 `cloudfunctions` 目录。
2. **逐个**右键每个云函数文件夹（init、login、user、goods、favorite、chat、order、review、report、admin），选择
   **"上传并部署：云端安装依赖"**（这一步会自动安装 wx-server-sdk，稍等 1-2 分钟）。
3. 全部上传成功后，到云开发控制台 → 云函数，能看到这 10 个函数都"部署成功"。

### 第 6 步：初始化数据库（建集合 + 分类）

1. 云开发控制台 → 云函数 → 找到 `init` 函数 → 点"测试"（云端测试，参数留空即可）。
2. 运行后返回 `created: [...]` 说明集合创建成功。
3. 到 云开发控制台 → 数据库，能看到 10 个集合：users、goods、categories、favorites、conversations、messages、orders、reviews、reports、feedback，且 categories 里已写入 7 个分类。

### 第 7 步：真机体验（在自己微信里看到）

1. 开发者工具点 **上传**（版本号随意，如 1.0.0）。
2. 电脑浏览器打开 mp.weixin.qq.com → 管理 → 版本管理 → 开发版本，找到刚上传的版本，点 **"选为体验版"**。
3. 点 **"体验二维码"**，用你自己的微信扫码，就能在微信里正常使用了。
4. 想给老师同学看：**管理 → 成员管理 → 体验成员**，添加对方微信号，对方扫码即可打开。
5. 体验版**不经过内容审核、不需要备案**，二维码有效期 30 天，过期重新生成即可。

> 预览更快的方式：开发者工具点"预览"生成临时二维码，手机扫码即可，无需上传。

### 第 8 步：管理后台（审核商品 / 管理用户 / 看数据）

1. 云开发控制台 → 环境 → 开通 **云接入（HTTP 访问服务）**，添加路径 `/admin` 并绑定 `admin` 云函数。
2. 打开 `admin/index.html`，把顶部 `const BASE = 'https://YOUR_ENV_ID.service.tcloudbase.com/admin'`
   中的 `YOUR_ENV_ID` 改成你的环境 ID。
3. 双击用浏览器打开 `admin/index.html`，输入密钥 `admin123` 登录。
4. 功能：数据概览（图表）、商品审核（通过/拒绝/下架）、用户管理（封禁）、举报处理。

> 密钥在 `cloudfunctions/admin/index.js` 顶部 `ADMIN_KEY` 可改。

---

## 四、业务规则（与代码一一对应）

**商品状态机**：`pending 待审核 → on 在售 → sold 已成交`；卖家下架或审核拒绝为 `off / rejected`（可重新上架）。

**交易流程**：买家点"联系卖家"创建会话和一笔"进行中"订单 → 聊天约定 → 线下当面交易 →
买家/卖家各自点"确认成交" → 双方都确认 = **交易完成**（商品下架 sold，记录在"交易记录"）→ 可互相评价。
卖家自行下架 = 进行中的订单自动取消，**不算成交**。

**积分规则**：注册 +10、每日签到 +5、发布商品 +10、置顶 24 小时 -20。

**教材检索**：发布时选"教材书籍"分类可填书名和 ISBN，首页/搜索支持按书名、ISBN 搜索。

---

## 五、数据库集合一览

| 集合 | 用途 | 关键字段 |
|---|---|---|
| users | 用户 | studentNo 学号, name 姓名, nickname 昵称, points 积分, status 状态 |
| goods | 商品 | title, price, category, images, bookName, isbn, status, top 置顶 |
| categories | 分类 | key, name, sort |
| favorites | 收藏 | goodsId |
| conversations | 会话 | buyerOpenid, sellerOpenid, goodsId, 未读数 |
| messages | 消息 | convId, fromOpenid, content |
| orders | 交易 | status, sellerConfirmed, buyerConfirmed |
| reviews | 评价 | orderId, star, content |
| reports | 举报 | targetType, targetId, reason, status |
| feedback | 意见反馈 | content（预留） |

---

## 六、常见问题

**Q：编译报"未找到 app.json" / AppID 错误？**
检查 `project.config.json` 的 `appid` 是否已换成你自己的 AppID，然后重新编译。

**Q：调用云函数报"环境未开通"或 404？**
确认已开通云开发并创建环境；确认所有云函数都已"上传并部署"；确认 `init` 已执行。

**Q：上传图片失败？**
云开发存储未开通或未授权。到云开发控制台 → 存储，确认可用；若提示需购买免费额度，领取基础套餐即可（个人小程序有免费额度）。

**Q：聊天页消息不实时刷新？**
本版采用 3 秒轮询，关闭页面后自动停止，属正常设计。

**Q：想正式发布上线？**
正式发布需：微信认证（个人主体可认证）+ ICP 备案 + 类目审核。**个人主体无法开通"二手交易/社区"类目**（需企业/个体工商户主体及相应资质），所以本项目建议定位为课程演示，用体验版即可。如需正式上线，请先注册企业/个体工商户主体再申请对应类目。

---

## 七、管理后台账号

- 管理密钥：`admin123`（可改 `cloudfunctions/admin/index.js`）
- 后端地址：`https://<你的环境ID>.service.tcloudbase.com/admin`
