# 每日健身伴侣 (FitDaily) 微信小程序 · 整体大纲

> 版本 v2.1 · 2026-08-24 · 基于《v2.0 强化饮食模块需求说明》整理
> 定位关键词：轻量工具 / 饮食+GI 管理 / 无社交无付费无蓝牙 / 本地优先
>
> **✅ 决策已拍板（2026-08-24 17:28 俊洪）**：
> ① 日均 GI 按**可消化碳水加权**（接近医学 GL 口径）
> ② **拍照识别确认要做**，采用 **BYOK 方案——用户自配 API URL + API Key**，开发者零成本零后端
> ③ 食物库：《中国食物成分表》+ OpenFoodFacts 清洗，GI 全部标注「参考值」
> ④ M1 纯本地存储，M2 上微信云开发同步
> ⑤ 低GI 开关与 GI 数值矛盾时，**以数值为准**，开关仅作快捷展示

---

## 一、产品定位

**一句话**：专注饮食管理的轻量小程序——拍照或搜一下就能记录热量、三大营养素和升糖指数(GI)，支持任意自定义食物，打开就用，关掉就走。

**目标用户**：
- 减脂人群（记热量 + 宏量营养素）
- 控糖人群（糖尿病前期 / 胰岛素抵抗 / 血糖敏感者，关注 GI）

**核心差异化**：市面记录工具大多只做热量，本产品的 GI 分级标识（绿/黄/红）+ 每日 GI 加权评分是针对控糖人群的差异点。

---

## 二、信息架构（4 Tab）

```
TabBar
├── ① 今日（首页）      —— 营养看板 + 当日饮食时间线 + 录入入口
├── ② 训练              —— 训练计划列表 + 打卡（v1 保持现状，不扩动作库）
├── ③ 数据              —— 体重曲线 + 周/月统计趋势 + 数据导出
└── ④ 我的              —— 目标设置 + 我的食物库 + AI识别设置 + 喝水设置 + 关于
```

> 喝水提醒不做独立 Tab，做成「今日」页内常驻小卡片（今日饮水量 + 快捷 +250ml），提醒用微信订阅消息。

---

## 三、页面清单

| # | 页面 | 路径建议 | 职责 | 关键元素 |
|---|------|---------|------|---------|
| 1 | 今日首页 | `pages/index` | 全天饮食总览 | 营养看板（热量环 + 4 项营养素进度条 + GI 评分卡）、早/午/晚/加餐四段分组列表、悬浮「+」按钮 |
| 2 | 录入方式选择 | 组件（半屏弹层） | 三选一 | 拍照识别 / 文字搜索 / 自定义录入 |
| 3 | 食物搜索页 | `pages/food-search` | 内置库 + 我的食物库检索 | 搜索框、分类筛选（主食/肉蛋/蔬果/零食/饮品…）、我的食物置顶、结果行带 GI 圆点 |
| 4 | 自定义录入表单 | `pages/food-edit` | 新建/编辑食物 | 名称、份量、热量、蛋白、碳水、脂肪、纤维(选填)、GI(选填)、低GI 自动开关；GI 输入实时变色标签 |
| 5 | 拍照识别确认页 | 复用 `pages/food-edit` | AI 预填 → 人工修正 | 顶部识别照片 + 置信度提示，下方同一张表单 |
| 6 | 食物详情浮层 | 组件 popup | 单条记录详情 | 热量/蛋白/碳水/脂肪/纤维 + GI 区块（数值+等级圆点）/ 编辑 / 删除 |
| 7 | 我的食物库 | `pages/my-foods` | 自定义食物 CRUD | 列表 + 左滑删除 + 点击进编辑表单 |
| 8 | 体重记录 | `pages/weight` | 体重输入 + 折线图 | echarts 曲线 + 目标线 |
| 9 | 历史统计 | `pages/stats` | 周/月维度 | 热量柱状图、平均 GI 趋势线、高GI 天数标记 |
| 10 | 我的/设置 | `pages/profile` | 个人配置 | 热量与四大营养素目标、GI 提醒开关、喝水目标、导出 CSV、关于 |
| 11 | AI 识别服务设置 | `pages/vision-settings` | BYOK 配置 | 服务商预设下拉、baseUrl、apiKey(掩码)、model、测试连接、安全提示 |

### 关键公共组件

- `gi-badge`：GI 三色标签（≤55 绿·低 / 56-69 黄·中 / ≥70 红·高+⚠️ / 空=灰·暂无）
- `nutrition-dashboard`：首页营养看板（进度环 + 4 条宏量进度 + GI 评分卡）
- `food-card`：列表条目（左侧 GI 圆点角标 + 名称 + 份量 + 热量）
- `meal-section`：餐次折叠分组

---

## 四、核心流程

### 4.1 三种录入流

```
[+] ──→ 半屏弹层
        ├─ 📷 拍照识别 → 读相册/拍照 → base64 → 用户自配的多模态API(BYOK直连)
        │     → 返回结构化JSON(菜品+分量估算+营养+GI猜测+置信度)
        │     → 进 food-edit 预填为草稿 → 人工确认修正 → 写入当日餐次
        ├─ 🔍 文字搜索 → 选中食物 → 设份量(默认100g) → 写入
        └─ ✍️ 自定义   → food-edit 空表单 → 填写(实时GI标签) → 存入「我的食物库」+ 写入当日餐次
```

### 4.2 GI 评分逻辑（首页看板）

- 单食物分级：≤55 低GI绿 / 56-69 中GI黄 / ≥70 高GI红⚠️ / 未填=灰色「暂无数据」
- 低GI 开关：GI ≤55 时自动勾选，允许手动覆盖（冲突时以 GI 数值为准）
- **日平均 GI**：✅ 已拍板按**可消化碳水加权**（医学 GL 口径）：
  `日均GI = Σ(GI_i × 可消化碳水_i) / Σ可消化碳水_i`，无 GI 数据的食物不参与加权但计入热量
- 平均 GI ≤55 → 「低GI饮食 ✅」绿色；>55 → 「注意控糖 💡」黄色 + 列出当日高GI食物清单

### 4.3 营养口径（重要工程决策）

所有食物营养值**统一按每 100g 存储**，记录时按实际份量线性换算。
需求示例中「份量300g / 热量255kcal」是换算后的展示值，存储层必须分开，否则内置库与自定义食物无法统一计算。

### 4.4 AI 拍照识别流程（BYOK）

```
未配置 Key？
 ├─ 是 → 弹窗「先去设置 AI 服务」→ pages/vision-settings → 配置完回来继续
 └─ 否 ↓
wx.chooseMedia(相机/相册) → 压缩至 ≤1MB → base64 data URI
  → wx.request POST {baseUrl}/chat/completions   (15s 超时)
     messages = [system: 识别prompt(强制JSON schema), user: 图片]
  → 解析 JSON {items:[{name,weight_g,calories,protein,carbs,fat,fiber,gi_guess}],confidence}
  → 成功 → food-edit 预填草稿（多菜品=多条草稿逐条确认）
  → 失败/超时/解析异常 → toast 说明 + 一键转手动录入
```

---

## 五、数据模型草案

```jsonc
// 食物（内置 + 自定义共用一张结构）
Food {
  id: "f_10086",
  name: "白米饭",
  source: "builtin" | "user",
  category: "主食",
  unit: "g",
  per100: {                    // ★ 统一每100g口径
    calories: 116, protein: 2.6, carbs: 25.9, fat: 0.3, fiber: 0.3
  },
  gi: 73,                      // 0-100，null=未填
  giLevel: "low"|"medium"|"high"|null
}

// 单次摄入记录
MealLog {
  logId, date:"2026-08-24",
  meal: "breakfast"|"lunch"|"dinner"|"snack",
  foodId, foodNameSnapshot,    // 冗余快照，防食物被改后历史失真
  weight: 300,                 // 实际克数
  intake: { calories, protein, carbs, fat, fiber },  // 换算后
  gi, giLevel,
  source: "photo"|"search"|"custom",
  createdAt
}

// 其他
WeightLog { date, weightKg }
WaterLog   { date, ml }
UserProfile{ calorieTarget:1800, proteinTarget:90, carbsTarget:225,
             fatTarget:60, fiberTarget:25, waterTargetMl:1500,
             giRemindOn:true }

// AI 识别配置（★ 仅存本地，云同步时强制排除此字段）
VisionConfig {
  preset: "openai"|"zhipu"|"dashscope"|"moonshot"|"siliconflow"|"openrouter"|"custom",
  baseUrl,                    // 默认随预填，custom 可改
  model,                      // 如 qwen-vl-max
  apiKeyMasked,               // 展示用掩码；真实 key 单独存 storage key `vk`
  lastTestOk: bool            // 测试连接结果缓存
}
```

---

## 六、技术选型

| 层 | 选择 | 理由 |
|----|------|------|
| 框架 | **原生 WXML/WXSS + TS** | 仅微信单端，不引 uni-app/Taro 编译层，保轻量 |
| UI 库 | TDesign 小程序版 或 Vant Weapp | 表单/弹层/进度条现成 |
| 图表 | echarts-for-weixin（按需打包体积 ~150KB，放分包） | 体重曲线 + 统计图 |
| 存储 | **MVP 纯本地 wx.storage**（结构化 key 分片） | 免后端、免登录授权、隐私友好 |
| 同步(M2) | 微信云开发（云数据库按 openid 免费额度）；**visionConfig/apiKey 字段排除在云同步外，永不上传** | 换手机不丢数据 |
| AI 识别(M1) | **BYOK 直连**：wx.request → 用户自配的 OpenAI 兼容多模态接口（`/chat/completions` + image base64 data URI），返回结构化 JSON | 开发者零成本零后端；照片只发给用户自己配的服务商 |
| 登录 | 静默 `wx.login` 取 openid，无需手机号授权 | 打开即用 |

### AI 识别服务配置页（`pages/vision-settings`）设计

```
┌──────────────────────────────────┐
│ 📷 AI 拍照识别                    │
│                                  │
│ 服务商预设: [通义千问 ▾]          │ ← 预设: OpenAI兼容/智谱/通义/Moonshot/
│                                  │    SiliconFlow/OpenRouter/自定义
│ API 地址:                        │ ← 选预设自动填充，可改
│   https://dashscope.aliyuncs.com/compatible-mode/v1
│ API Key:  [••••••••••] 👁       │ ← 掩码显示，仅存本地 storage
│ 模型名称: [qwen-vl-max]          │ ← 选预设带默认值
│                                  │
│ [测试连接]   ✅ 连接成功          │
│ ⚠️ Key 仅保存在你的手机本地，      │
│    不上传服务器、不参与云同步      │
└──────────────────────────────────┘
```

**调用约定**：统一走 OpenAI 兼容协议（`POST {baseUrl}/chat/completions`，messages 里塞 image_url=base64 data URI），内置识别 prompt 强制返回 JSON。解析失败/超时(15s)/置信度低 → 引导手动录入兜底。

**域名白名单策略（关键约束）**：正式版 `wx.request` 只能请求小程序后台配置的合法域名。
- 预设厂商域名（dashscope.aliyuncs.com / open.bigmodel.cn / api.moonshot.cn / api.siliconflow.cn / openrouter.ai 等）→ 后台一次性加入 request 合法域名列表，正式版直接可用
- 「自定义 URL」→ 正式版受白名单限制无法任意填；两条路：
  - a) 体验版 + 打开调试模式可用（极客用户够用）
  - b) M2 加云函数无状态中转（key 仍由前端每次传入、云端不落盘不存 key），解锁任意地址

---

## 七、里程碑

| 阶段 | 内容 | 备注 |
|------|------|------|
| **M1 · MVP（1~2周）** | 今日页 + 营养看板(GI评分) + 搜索录入 + 自定义录入表单 + 详情浮层 + 我的食物库 + 内置食物库 v1(500种) + 体重记录 + **AI 拍照识别(BYOK 直连，含 vision-settings 页)** | 纯本地，开发者零后端零成本 |
| **M2（+1周）** | 喝水卡片+订阅消息提醒、历史统计页、CSV 导出（含 GI 列）、云开发数据同步、**云函数中转（解锁任意自定义 URL）** | 需开通云开发 |
| **M3（可选）** | 训练计划增强、目标智能建议（TDEE 计算）、食物库扩至 2000+、识别历史复用 | 看使用反馈 |

---

## 八、已拍板决策（2026-08-24 17:28 俊洪确认）

| # | 决策点 | 结论 |
|---|--------|------|
| 1 | 平均 GI 加权口径 | ✅ 按**可消化碳水加权**（医学 GL 口径） |
| 2 | 拍照识别成本 | ✅ **要做**，BYOK——用户自配 API URL + Key，开发者零成本 |
| 3 | 食物库来源 | ✅ 《中国食物成分表》+ OpenFoodFacts 清洗，GI 标注参考值 |
| 4 | 云同步时机 | ✅ M1 纯本地，M2 上云开发 |
| 5 | 低GI 开关 vs 数值矛盾 | ✅ 以数值为准，开关仅快捷展示位 |

---

## 九、风险提示

- 主包 2MB 限制 → 食物库与图表库必须分包加载
- **request 域名白名单**：正式版无法请求任意用户自填 URL → 预设厂商域名进后台白名单；自定义 URL 在体验版调试可用，M2 云函数中转彻底解决
- **API Key 安全红线**：真实 key 仅存本地 storage 且独立字段；云同步排除；日志/报错信息严禁打印 key；UI 掩码显示
- AI 识别准确率有限（中餐混合菜误差大）→ 结果一律定位为「预填草稿」，强制人工确认；解析失败自动降级手动录入
- GI 数据本身学术争议大（同食物不同来源差 10+）→ 展示时保留整数 + 「参考值」措辞
