# FitDaily「每日健身伴侣」微信小程序 · PRD 主文档

> **版本**: v1.0 · 2026-08-24
> **状态**: 需求冻结 ✅ · 进入实施阶段
> **本文档为单一事实源（Single Source of Truth）**，后续开发以本文档为准，变更需记录到文末「变更日志」。
> 前置讨论稿见 `outline.md`（v2.0/v2.1），已被本文档取代。

---

## 0. 决策记录（全部已拍板）

| # | 日期 | 决策 |
|---|------|------|
| D1 | 8/24 16:46 | 饮食录入支持自定义；食物必须体现热量/三大营养素/GI 值/低GI 标识 |
| D2 | 8/24 17:28 | 日均 GI 按**可消化碳水加权**（医学 GL 口径） |
| D3 | 8/24 17:28 | 拍照 AI 识别要做，**BYOK 模式**（用户自配 API URL + Key），开发者零后端零成本 |
| D4 | 8/24 17:28 | 食物库来源：《中国食物成分表》+ OpenFoodFacts 清洗，GI 标注「参考值」 |
| D5 | 8/24 17:28 | M1 纯本地存储；M2 上微信云开发同步；低GI 开关与数值冲突时以数值为准 |
| D6 | 8/24 17:35 | **AI 识别第一版预设 MiniMax**（俊洪手头有 key）；服务商预设下拉中 MiniMax 排第一，其余厂商后续补充 |

---

## 1. 产品概述

### 1.1 一句话定位
专注饮食管理的轻量小程序——拍照或搜一下就能记录热量、三大营养素和升糖指数(GI)，支持任意自定义食物。无社交、无付费、无蓝牙，打开就用，关掉就走。

### 1.2 目标用户
- **减脂人群**：记热量 + 宏量营养素配比
- **血糖关注人群**：血糖敏感、吃饭会留意血糖波动的人，核心看 GI 分级

### 1.3 差异化
市面记录工具大多只做热量；本产品的 **GI 三色分级标识 + 每日 GI 加权评分** 是针对控糖人群的差异点。

---

## 2. 功能需求

### 2.1 饮食录入（三种方式并存）

```
[悬浮+] ──→ 半屏弹层三选一
        ├─ 📷 拍照识别(MiniMax VLM) → 结构化JSON → 预填草稿 → 人工确认 → 写入当日餐次
        ├─ 🔍 文字搜索 → 选中食物 → 设份量(默认100g) → 写入
        └─ ✍️ 自定义   → 空白表单填写(GI实时变色标签) → 存入「我的食物库」+ 写入当日餐次
```

#### 2.1.1 自定义录入表单（字段规格）

| 字段 | 必填 | 类型/约束 | 示例 |
|------|------|----------|------|
| 食物名称 | ✅ | 文本 ≤20字 | 自制鸡胸肉沙拉 |
| 份量 | ✅ | 数字>0，单位g/ml，默认100 | 300 |
| 热量 | ✅ | 数字≥0，kcal | 255 |
| 蛋白质 | ✅ | 数字≥0，g | 35 |
| 碳水化合物 | ✅ | 数字≥0，g | 12 |
| 脂肪 | ✅ | 数字≥0，g | 8 |
| 膳食纤维 | ⬜ | 数字≥0，g | 5 |
| 升糖指数 GI | ⬜ | 整数 0–100 | 45 |
| 是否低GI | 自动 | 开关；GI≤55 自动开；可手动改；**冲突时以GI数值为准**(D5) | ✅ |

**交互细节**：
- 输入 GI 时下方实时显示等级标签：≤55 绿「低GI」/ 56-69 黄「中GI」/ ≥70 红「高GI」
- 表单校验：名称必填、至少填热量；蛋白+碳水+脂肪折算热量与填写热量偏差 >30% 时温和提示（不阻断）
- 保存后自动进「我的食物库」，搜索时置顶展示

#### 2.1.2 拍照识别（BYOK + MiniMax 第一预设）

**配置项（vision-settings 页）**：

| 配置 | 默认值 | 说明 |
|------|--------|------|
| 服务商预设 | `MiniMax` | 下拉第一项；后续版本增加其他 OpenAI 兼容厂商 + 自定义 |
| API 地址 | `https://api.minimax.io/v1/chat/completions` | 国际站；国内站 `https://api.minimaxi.com/v1/chat/completions` 以俊洪 key 所属站点为准，两个都做预设项 |
| API Key | 空 | 掩码显示 👁 切换；仅存本地 storage |
| 模型名 | `MiniMax-M3` | 官方确认 M3 原生支持图片输入（image_url content part，JPEG/PNG/WEBP，≤10MB） |
| [测试连接] | — | 发一条纯文本最小请求验证 key + 网络，成功显示 ✅ |

**调用链路**：
```
wx.chooseMedia(拍照/相册) → 压缩至长边≤1280px & ≤1MB
  → FileSystemManager.readFile(base64)
  → wx.request POST {baseUrl}
     Authorization: Bearer {apiKey}
     body: { model, messages:[
        {role:"system", content: FOOD_RECOG_PROMPT},
        {role:"user", content:[{type:"text",text:"识别这餐食物"},
                               {type:"image_url", image_url:{url:"data:image/jpeg;base64,..."}}]}],
       temperature:0.2 }
  → 解析 content 中 JSON（剥离可能的 ```json 围栏）
  → 成功: items[] 预填进编辑页逐条确认
  → 失败: 错误矩阵处理(见下)
```

**识别 Prompt（v1 草案，要求强制 JSON 输出）**：
```
你是营养分析助手。识别图片中的所有食物，对每种食物估算。严格只输出JSON，不要任何其他文字：
{"items":[{"name":"食物名(中文)","weight_g":估算克数,"calories":该份热量kcal,
"protein":g,"carbs":g,"fat":g,"fiber":g|null,
"gi_guess":0-100整数或null,"gi_source":"常见食物GI数据库估计"}],
"confidence":0-1}
注意：混合菜拆分为主要食材分别列出；无法判断GI时用null；不确定时宁可保守。
```

**错误处理矩阵**：

| 情况 | 处理 |
|------|------|
| 未配置 Key | 弹窗「先去设置 AI 识别服务」→ 跳 vision-settings |
| 网络失败/超时(15s) | toast + 「重试 / 手动录入」 |
| HTTP 401/余额不足 | 明确提示检查 Key，附跳转设置 |
| 返回非 JSON / 字段缺失 | 尝试宽松解析；仍失败 → toast + 手动录入兜底 |
| confidence < 0.6 | 结果照常预填但顶部黄条提示「AI 不太确定，请核对」 |
| 图片 >1MB 未压缩成功 | 先走 wx.compressImage 二次压缩再发 |

**平台限制（重要）**：正式版 wx.request 仅允许后台配置的合法域名。
- `api.minimax.io` / `api.minimaxi.com` 加入小程序后台 request 合法域名（一次性）
- 「自定义 URL」正式版会被拦：体验版+调试模式可用；M2 云函数无状态中转彻底解锁（key 前端传入云端不落盘）

### 2.2 食物详情浮层（点击任意已记录条目）

内容：名称、份量、热量、蛋白质、碳水、脂肪、膳食纤维、GI 区块（数值+等级圆点）、[编辑] [删除]
视觉：GI 三色圆点角标（绿/黄/红+⚠️）；未填 GI 显示灰色「暂无数据」

### 2.3 每日营养看板（首页顶部）

- 热量环/胶囊进度条：目标 vs 已摄入，超100% 变珊瑚色
- 四行营养素进度：蛋白质/碳水/脂肪/膳食纤维，各带目标值与差值徽章（如 `-25g`）
- **今日 GI 评分卡**：
  - 公式（D2 已拍板）：`日均GI = Σ(GI_i × 可消化碳水_i) ÷ Σ可消化碳水_i`
    （可消化碳水 = 总碳水 − 膳食纤维；无 GI 数据的食物不参与加权但热量照常累计）
  - ≤55 → 「低GI饮食 ✅」绿色；>55 → 「注意控糖 💡」黄色 + 当日高GI食物清单（名称+GI值）

### 2.4 其他模块（保持轻量）

| 模块 | M1 范围 |
|------|---------|
| 训练计划 | 沿用现有方案：训练项目列表 + 勾选打卡（不建动作库） |
| 体重记录 | 手动输入 + 折线图（echarts 分包） |
| 喝水提醒 | 今日页小卡片（水量 + 快捷+250ml）；订阅消息提醒放 M2 |
| 我的食物库 | 自定义食物 CRUD 列表，左滑删除 |
| 历史统计 | pages/stats (原 M2 提前到 v1.1)：今日完成度 + 本周 7 天柱状 + 营养素均值 + GI 加权趋势 | T16 |
| 运动模块 v1 | pages/training + pages/training-log：训练日打卡 + 训练日 vs 休息日目标调整 + 动作库 + 组次重记录 + 月历 + 休息计时器 | T17-T18 |
| 数据导出 | M2；CSV 含 GI 列 |

---

## 3. 信息架构与页面清单

```
TabBar: 🏠今日 | 💪训练 | 📊数据 | 👤我的
```

| # | 页面 | 路径 | 备注 |
|---|------|------|------|
| 1 | 今日首页 | pages/index | 看板+四餐时间线+FAB |
| 2 | 录入选择弹层 | 组件 half-screen-sheet | 三选一 |
| 3 | 食物搜索 | pages/food-search | 内置库+我的置顶 |
| 4 | 食物编辑表单 | pages/food-edit | 新建/编辑/AI预填复用 |
| 5 | 食物详情浮层 | 组件 popup | — |
| 6 | 我的食物库 | pages/my-foods | CRUD |
| 7 | AI 识别设置 | pages/vision-settings | MiniMax 预设+测试连接 |
| 8 | 体重记录 | pages/weight | 曲线图 |
| 9 | 历史统计 | pages/stats | M2 |
| 10 | 我的/设置 | pages/profile | 目标值设置+关于 |

公共组件：`gi-badge`(三色标签) / `nutrition-dashboard`(看板) / `food-card`(条目) / `meal-section`(餐次分组) / `capsule-progress`(胶囊进度条)

---

## 4. UI 设计规范（源自两张参考图分析）

**风格关键词**：日系手帐 · 抹茶绿马卡龙 · 大圆角贴纸卡片 · 无压力治愈系

### 4.1 设计 Token（WXSS 变量）

```css
page {
  /* 色板 */
  --bg-page: #F1FAF0;            /* 奶绿背景 */
  --bg-card: #FFFFFF;
  --primary: #8ED08F;            /* 抹茶绿：边框/按钮/完成态 */
  --primary-light: #C7F2C0;
  --primary-deep: #98D8A0;
  --text-main: #386641;          /* 深森林绿文字（不用纯黑） */
  --text-sub: #6B8F6E;
  --accent-coral: #FF9A76;       /* 热量进度/超标警示 */
  --accent-yellow: #FCD884;      /* 装饰星/次高亮 */
  --accent-blue: #98C1D9;        /* 喝水 */

  /* GI 红绿灯 */
  --gi-low: #5FA86B;   --gi-mid: #E9B44C;   --gi-high: #E57B64;
  --gi-none: #BFC7BF;

  /* 形状 */
  --radius-card: 32rpx;          /* 卡片大圆角 */
  --radius-pill: 999rpx;         /* 胶囊 */
  --border-card: 4rpx solid var(--primary);  /* 手绘感描边 */
  --shadow-card: 0 4rpx 16rpx rgba(56,102,65,.06); /* 极淡弥散阴影 */
}
```

### 4.2 关键组件样式

- **卡片**：白底 + 2px 抹茶绿实线描边 + 32rpx 圆角，层级靠边框不靠阴影
- **胶囊进度条**：全圆角轨道浅绿槽，填充蜜桃粉/抹茶绿；右侧气泡显示百分比
- **营养素差值徽章**：绿色胶囊 `-25g`
- **红绿灯状态点**：营养素行尾 8px 圆点，达标绿/接近黄/超标红
- **GI 角标**：food-card 左缘竖向色条或圆点 + 文字标签（低/中/高GI）
- **字体**：系统圆体优先（-apple-system 圆体回退），数字加粗放大；全文禁纯黑
- **插画策略**：MVP 用 emoji（🥗🔥🥩🌾🧈🥬📊💧）替代手绘素材；破框装饰（云朵/星星/小花）用 CSS 绝对定位点缀，后期有素材再替换
- **手帐质感**：饮食流水区背景铺极淡横向虚线纹理（CSS repeating-linear-gradient）

---

## 5. 数据模型（TypeScript 定义）

```typescript
interface Food {
  id: string;                    // 'f_' + 自增 或 hash
  name: string;
  source: 'builtin' | 'user';
  category: FoodCategory;        // 主食|肉蛋|蔬果|奶豆|零食|饮品|其他
  unit: 'g' | 'ml';
  per100: Nutrition;             // ★ 统一每100g口径存储
  gi: number | null;
}

interface Nutrition {
  calories: number; protein: number; carbs: number; fat: number; fiber: number | null;
}

interface MealLog {
  id: string;
  date: string;                  // '2026-08-24'
  meal: 'breakfast'|'lunch'|'dinner'|'snack';
  foodId?: string;
  nameSnapshot: string;          // 快照防历史失真
  weight: number;
  intake: Nutrition;             // 按 weight 换算后的实际摄入
  gi: number | null;
  source: 'photo'|'search'|'custom';
  createdAt: number;
}

interface VisionConfig {
  preset: 'minimax-intl'|'minimax-cn';   // 第一版只有 MiniMax 两站
  baseUrl: string;
  model: string;                 // 'MiniMax-M3'
  lastTestOk: boolean | null;
  // apiKey 单独存 storage key 'vk'，永不进云同步/日志
}

// storage key 规划分：
// fd_foods_user / fd_logs_{yyyy-mm} / fd_weights / fd_waters_{date} / fd_profile / fd_vision_cfg / vk
```

---

## 6. 技术架构

| 层 | 选型 | 说明 |
|----|------|------|
| 框架 | 原生 WXML/WXSS + TypeScript + Skyline(可选) | 单端不引编译层 |
| UI | TDesign 小程序版 | 弹层/表单/Toast |
| 图表 | echarts-for-weixin（分包） | 体重曲线、统计 |
| 存储 | wx.setStorageSync 本地分片 | 月度日志按月分 key 防 1MB 单key上限 |
| AI | MiniMax OpenAI 兼容接口直连(BYOK) | 见 2.1.2 |
| 登录 | 无需登录；静默 openid 仅 M2 云同步用 | 打开即用 |

**工程目录（规划）**：
```
fitdaily-mini/
├── app.json / app.ts / app.wxss(token变量)
├── config/tokens.wxss
├── components/{gi-badge,capsule-progress,nutrition-dashboard,food-card,meal-section,half-screen-sheet}
├── pages/{index,training,data,profile,food-search,food-edit,my-foods,vision-settings,weight,stats}
├── services/{storage.ts, nutrition.ts(GI加权计算), vision.ts(MiniMax调用), export.ts}
├── data/foods-v1.json           ← 分包 or 独立chunk
└── utils/
```

---

## 7. 里程碑与施工清单

### M1 · MVP（目标 1~2 周）——按序施工

- [x] T1 项目脚手架：TS 模板 + 目录结构 + tokens.wxss + app.json TabBar
- [x] T2 存储层 services/storage.ts（分片读写 + 类型封装）
- [x] T3 营养计算 services/nutrition.ts（per100换算 + 碳水加权日均GI）
- [x] T4 公共组件：capsule-progress → gi-badge → food-card → meal-section → nutrition-dashboard
- [x] T5 今日首页：看板 + 四餐时间线 + FAB + 录入弹层
- [x] T6 食物编辑表单页（含 GI 实时标签 + 校验）
- [x] T7 食物搜索页（内置库检索 + 我的食物置顶）
- [x] T8 食物详情浮层（查看/编辑/删除）
- [x] T9 我的食物库页
- [x] T10 vision-settings 页（MiniMax 预设 + 掩码输入 + 测试连接）
- [x] T11 services/vision.ts（压缩/base64/请求/解析/错误矩阵）+ 拍照流接入
- [x] T12 体重记录页（输入+曲线）
- [x] T13 内置食物库数据 v1（首批 100 种高频食物先行，逐步扩至 500；脚本清洗生成 JSON）
- [x] T14 真机联调 + 体验版发布（俊洪手机验收）

### M2（+1 周）
喝水订阅消息提醒 / 历史统计页 / CSV 导出含 GI 列 / 云开发同步(visionConfig 与 vk 排除) / 云函数中转解锁自定义 URL / 其他厂商预设(智谱/通义/OpenRouter)

### M3（可选）
TDEE 目标智能建议 / 食物库 2000+ / 识别历史复用 / 手绘插画素材替换 emoji

---

## 8. 风险与红线

1. **API Key 安全红线**：真实 key 只存本地 storage `vk`；云同步排除；日志/报错禁止输出；UI 掩码
2. **域名白名单**：正式版前必须把 MiniMax 两域名加入后台合法域名；自定义 URL 的限制提前告知用户
3. **主包 2MB**：食物库 JSON 与 echarts 放分包
4. **AI 误识**：结果一律「预填草稿」强制人工确认；confidence<0.6 黄条警示
5. **GI 数据争议**：界面标注「参考值」，保留整数
6. **storage 单 key 1MB 上限**：日志按月分片，超期归档提示导出

---

## 9. 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-08-24 | v1.0 | 首版冻结：整合 outline.md v2.1 + MiniMax 第一预设(D6) + 两张参考图视觉规范 |
| 2026-08-24 | v1.0.1 | T12 体重页 + T13 食物库扩至108种落地，M1 全部任务完成，进入真机验收阶段 |
| 2026-08-25 | v1.1 | T14 编译启动 + 真机调试全链路修复（tsc / 组件 .json / 输入框高度 / parseRecogJson 鲁棒化）；T15 喝水管理 + 每日目标 Mifflin-St Jeor 智能计算；T16 历史统计页（从 M2 提前），4 个区块纯 CSS 实现；T17-T18 运动模块（训练打卡 + 目标联动 + 轻动作库 + 组次重记录 + 月历 + 休息计时器 + PR 曲线）；T19 训练消耗估算（MET 公式）|

### 9.1 v1.1 新增章节：历史统计页详细设计（PRD v1.1 补全）

> **位置**：tabBar 第 3 项「📊 数据」 → pages/stats/stats（M2 提前到 v1.1）
> **本节是 PRD v1.0 未明确、T16 新拍板补齐的设计规范**

#### 设计目标
- **零外部依赖**：纯 CSS 实现（不引 echarts），保持主包不超 2MB
- **一屏总览**：用户进 stats 页 5 秒内看到「这周吃得怎么样 / 跟目标差多远 / GI 控制得如何」
- **复用首页组件**：今日完成度区直接复用 nutrition-dashboard 逻辑
- **滑动友好**：4 个区块顺序展示，每块不超 1.5 屏高度

#### 4 个区块设计

| # | 区块 | 内容 | 复用源 |
|---|---|---|---|
| 1 | **今日完成度** | 热量环形 + 蛋白/碳水/脂肪/纤维 4 行进度条 + 饮水进度条 | 复用首页 nutrition-dashboard |
| 2 | **本周 7 天热量柱状图** | 横轴周一到周日 + 柱高=当日摄入 + 目标虚线 + 完成度百分色（绿达标/黄欠/红超） | 纯 CSS grid/flex |
| 3 | **本周营养素均值** | 5 个横条（蛋白/碳水/脂肪/纤维/水），条长=本周日均 vs 目标 | 纯 CSS |
| 4 | **GI 加权评分趋势** | 本周日均 GI 折线（点+线，纯 CSS 跟 weight 页同套路）+ 三色分级标识 + 高 GI 警示列表 | 复用 weight 折线 CSS |

#### 数据源

| 函数 | 文件 | 用途 |
|---|---|---|
| `logsOfMonth(ym)` | services/storage.ts | 取整月日志 |
| `dailyStats(logs)` | services/nutrition.ts | 算每日 GI 加权 + 营养素汇总 |
| `waterOf(date)` | services/storage.ts | 取每日饮水 |
| `weightsAll()` | services/storage.ts | 取体重历史（备用）|

#### 时间范围

- MVP 只做**本周（周一-周日）**
- 切换周/月：v1.2 加 weekSwitcher（M2 再说）

#### 设计 Token 复用

完全沿用 PRD 第 4.1 节 Design Token（抹茶绿 + GI 红黄绿三色），不引入新色板。

#### 实施位置

- `pages/stats/stats.{ts,wxml,wxss}`（已有空壳，补全）
- `services/stats.ts`（新建，纯函数：`weekSummary()` / `weekDailyStats()`）
- 复用现有 nutrition-dashboard 组件

#### MVP 验收标准

- 今日空数据 → 显示空态引导「今天还没记录，去首页+」- 本周空数据 → 显示空态「本周还没记录，等你周一」
- GI 加权无数据 → 显示「暂无可计算 GI 的食物」
- 纯 CSS 折线/柱状图渲染快，**首屏 < 200ms**（< 50 条日志）

### 9.3 v1.1 新增章节：训练消耗估算（T19）

> **位置**：首页 nutrition-dashboard 下方 + 训练记录页保存后 toast
> **公式**：MET（代谢当量）= 动作单位体重单位时间消耗
> **kcal = MET × 体重kg × 时间h**（有氧）或 **MET × 体重kg × 总组数 × 0.5h**（力量）

#### MET 参考表（给 50 个动作加 met 字段）

| 部位 | 动作 | MET |
|---|---|---|
| cardio | 跑步 8km/h | 8.3 |
| cardio | 跑步 10km/h | 9.8 |
| cardio | 划船机 | 7.0 |
| cardio | 跳绳 | 11.8 |
| chest | 卧推/哑铃卧推 | 5.0 |
| back | 划船/下拉 | 5.0 |
| legs | 深蹲/硬拉 | 6.0 |
| shoulders | 推举/侧平举 | 4.5 |
| arms | 弯举/三头下压 | 4.0 |
| core | 卷腹/平板 | 2.8 |
| fullbody | 壶铃摇摆/波比 | 8.0 |

#### 实施

- `data/exercises-v0.ts`：50 个动作各加 `met` 字段
- `services/training.ts`：加 `kcalForLog(log, body)` 纯函数
- `pages/index/index.ts`：训练打卡后显示「🔥 消耗 X kcal」toast
- `pages/training-log/training-log.ts`：保存后 toast

#### MVP 验收

- ✅ 力量训练（卧推 4 组）→ 约 30 kcal / 70kg
- ✅ 有氧训练（跑步 30min）→ 约 240 kcal / 70kg
- ✅ 首页 + 训练记录页都能看到「🔥 消耗 X kcal」

> **位置**：tabBar 第 2 项「💪 训练」 → pages/training + pages/training-log
> **本节是 PRD v1.0 仅一句话「训练计划：沿用现有方案」扩成完整模块的设计规范**

#### 设计目标（按俊洪产品定位：单兵 / 游客模式 / 隐私优先 / 无社交）
- **训练日 vs 休息日目标自动调整**（+300 kcal 增量）：核心差异化，跟 T15 目标系统衔接
- **轻动作库**：50 个常用动作（无图），按身体部位分组
- **组数 × 次数 × 重量记录**：力量训练核心
- **训练日历**：月历视图，哪天练了标绿点
- **休息计时器**：组间 90s 倒计时
- **打不社交**：训练记录仅本机，不分享

#### 功能拆解

##### T17 阶段 1（MVP 闭环）
| # | 功能 | 描述 |
|---|---|---|
| 1 | **训练日打卡** | pages/training 页：勾选「今天练了」，存 `fd_training_done_{date}` |
| 2 | **训练日 vs 休息日目标调整** | 打卡日 +300 kcal；首页 nutrition-dashboard 用调整后目标 |
| 3 | **目标重算工具** | services/goal.ts 加 `adjustedTargets(body, trained)` |
| 4 | **今日页训练打卡入口** | 首页 +「💪 今天练了」按钮 |
| 5 | **取消打卡** | 训练日可取消，目标自动还原 |

##### T18 阶段 2（P1 核心）
| # | 功能 | 描述 |
|---|---|---|
| 6 | **轻动作库 v0** | 50 个常用动作，按身体部位分组 |
| 7 | **训练记录（组次重）** | pages/training-log：选动作 → 加组（次数/重量）→ 保存 |
| 8 | **训练日历视图** | pages/training 加月历 grid |
| 9 | **休息计时器** | pages/training-log 组间 90s 倒计时，可调 |
| 10 | **PR 曲线** | 卧推 / 深蹲 / 硬拉历史最大重量折线 |

#### 数据模型

```typescript
interface TrainingDay { date: string; done: boolean; note?: string; }
interface Exercise { id: string; name: string; bodyPart: BodyPart; equipment: string; isCompound: boolean; }
interface ExerciseSet { reps: number; weightKg: number; restSec: number; }
interface TrainingLog { id: string; date: string; exerciseId: string; sets: ExerciseSet[]; note?: string; createdAt: number; }
```

#### 实施位置
- `pages/training/training.{ts,wxml,wxss}`：原空壳补全 + 月历 + 打卡
- `pages/training-log/`：**新建 4 文件**
- `services/training.ts`：**新建**
- `services/goal.ts`：加 `adjustedTargets()`
- `data/exercises-v0.ts`：**新建** 50 动作
- `services/types.ts`：`TrainingDay/Exercise/ExerciseSet/TrainingLog/BodyPart`
- `services/storage.ts`：SK + training 函数

#### MVP 验收
- T17: 打卡后首页立刻看到目标 +300 kcal + 蛋白 +20g
- T18: 能记录 1 组卧推 60kg×12；月历绿点；90s 倒计时可用
- 训练日历 < 200ms 首屏（50 条训练日志内）
- 数据完全本地，无社交分享入口
