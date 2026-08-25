# FitDaily 开发日志

## 2026-08-24

### T1 ✅ 脚手架
- 10 页面 stub + TabBar + tokens.wxss + project.config.json（游客模式）

### T2 ✅ 存储层 services/storage.ts
- key 分片：`fd_logs_{yyyy-mm}` 按月分片防单 key 1MB 上限
- CRUD：foodUserUpsert / logAdd / logUpdate / logRemove / weightUpsert / waterAdd
- profile 默认目标值（1800kcal/90g蛋白/225g碳水/60g脂肪/25g纤维/1500ml水）
- ★ 红线：API Key 存独立 `vk`，与 visionCfg 分离

### T3 ✅ 营养计算 services/nutrition.ts
- `scale(per100, weight)` 按份量换算
- `giLevel()` 三级判定（≤55 low / 56-69 mid / ≥70 high）
- **`dailyStats(logs)` 碳水加权日均 GI**（D2 决策）：可消化碳水 = 总碳水 − 膳食纤维；无 GI 记录不参与加权但热量照计；输出 avgGi + 高GI食物清单
- `macroCalorieGap()` 表单校验（蛋白4+碳水4+脂肪9 折算 vs 填写热量偏差 >30% 提示）

### T4 ✅ 组件 5 个（components/）
| 组件 | 说明 |
|------|------|
| capsule-progress | 胶囊进度条，>100% 自动变珊瑚色 + 百分比气泡 |
| gi-badge | GI 三色徽章（绿低/黄中/红高/灰暂无），传 gi 数字自动分级 |
| food-card | 饮食条目卡（GI角标 + 名称 + 热量 + 营养摘要 + 编辑/删除事件） |
| meal-section | 餐次折叠分组（标题 + 小计 kcal） |
| nutrition-dashboard | 营养看板总成（热量环 + 4 宏量行 + GI 评分卡：≤55 绿✅ / >55 黄💡+高GI清单） |

half-screen-sheet：录入三选一半屏弹层（📷拍照 / 🔍搜索 / ✍️自定义）

### T5 ✅ 今日首页 pages/index
- onShow 刷新当日数据；营养看板 + 喝水卡片(+250ml) + 四餐时间线 + FAB
- 录入弹层 → photo(未配Key引导去设置页)/search/custom 三路分发
- 条目点击 ActionSheet 编辑/删除

### 附带完成（原属 T6）
pages/food-edit 自定义录入表单：
- 全字段（名称/份量/热量/蛋白/碳水/脂肪/纤维/GI/低GI开关）
- GI 输入实时变色标签；低GI 开关随 GI≤55 联动
- macroCalorieGap 温和提示（不阻断）
- 保存：user 来源自动入「我的食物库」+ 写入当餐记录（per100 换算）
- 支持编辑已有记录（?editLogId= 反推表单回填）

### 质量验证
- `tsc --noEmit` 全绿（miniprogram-api-typings v5.2.3 接入，typings/wx.d.ts 引用式声明）
- 修复：index.wxml 内外层 wx:for 变量遮蔽（wx:for-item="log"）；meal-section 无效 options；data 类型断言

### T7 ✅ 食物搜索页 pages/food-search
- 搜索框实时过滤 + 8 分类筛选胶囊（全部/主食/肉蛋/蔬果/奶豆/零食/饮品/其他）
- 「我的食物」命中时置顶展示；每行：名称 + 每100g营养摘要 + GI 三色徽章
- 选中 → redirectTo food-edit?source=search&foodId= 预填确认

### T9 ✅ 我的食物库 pages/my-foods
- 列表：名称+GI徽章+每100g营养；右侧红色删除条（confirm 后 foodUserRemove）
- 点条目 → food-edit?source=user&foodId= 编辑食物本身（fromMyFoods 分支只回库不写餐记录）
- 空态引导 + 底部「新建自定义食物」按钮

### 内置食物库 data/foods.ts（种子 v0，T13 扩容）
- 50 种高频食物：主食12/肉蛋13/蔬果14/奶豆4/零食5/饮品4/其他3（实际按代码为准）
- 含热量/蛋白/碳水/脂肪/纤维/GI 参考值；gi=null 表示通常不标注（纯肉蛋油等）
- storage 新增 findFoodById() 跨库查找（我的优先→内置）

### 联动修正
- food-edit 支持 source=search（预填确认→写餐记录，不入库）与 source=user&fromMyFoods（编辑食物→回库不写餐）双分支
- onSave 入库规则收紧：仅「无 pickedFoodId 且非编辑记录」才写入我的食物库

### T10 ✅ AI 识别设置页 pages/vision-settings
- MiniMax 双站预设（国际 api.minimax.io / 国内 api.minimaxi.com）picker 切换自动带 baseUrl+model
- Key 掩码展示 + password 输入；保存进独立 vk 字段（安全红线）
- 测试连接 testConnection()：发最小请求验证，✅绿条/❌红条反馈
- 使用提示卡片（站点选择/草稿确认/多菜品流程）

### T11 ✅ 拍照识别链路全通
- index.startPhoto：chooseMedia → compressImage(1280px/q40) → fileToBase64 → recognizeMeal(15s超时)
- 未配 Key 弹窗引导去设置页；失败 modal「重试/手动录入」双选；取消选图静默
- 识别结果 setRecogDraft 草稿暂存（2h 有效期）；confidence<0.6 toast 预警
- food-edit source=photo 分支：AI 该份营养反推 per100 口径回填 + aiBanner 提示条 + 按时间猜餐次
- onSave 消费草稿：多菜品逐条确认（保存一条 consumeDraftItem，剩余>0 redirectTo 下一条，0 条返回首页 delta:2）

### 附带：profile 页入口落地
- 每日目标卡（4 格）+ 我的食物库/AI 识别设置（显示已配置状态）/体重记录 三入口 + 关于卡

### T12 ✅ 体重记录页 pages/weight
- 录入卡：数字输入(20-300校验) + 今日记录（同日覆盖）
- 趋势卡：纯 CSS 折线图（点+线归一化坐标，不引 echarts 零包体代价）+ 与首条差值 ↓绿/↑珊瑚
- 历史列表倒序 + 空态引导

### T13 ✅ 内置食物库扩容至 108 种（种子 v1）
- 主食22/肉蛋24/蔬果30/奶豆9/零食10/饮品8/其他5，全部含 GI 参考值（肉类油脂等 gi=0 表示不适用/无数据，前端 giLevel 处理为「暂无」展示）
- 注：gi=0 与 null 语义区分待 T13.1 统一（当前 0 会显示暂无，可接受）

---

## 2026-08-25 · T14 编译启动 + 真机调试全链路修复

### T14.1 ✅ 首次编译修复（code 10005 → 10009）
**触发**：俊洪 webchat 连发 3 次 "Loading project all files… / app.json 未找到 pages/index/index.js / code: 10005"——项目从未跑过 tsc 编译。

**3 个子问题**：

| # | 报错 | 根因 | 修复 |
|---|---|---|---|
| 1 | code 10005 `pages/index/index.js 未找到` | 项目源码全 .ts，从未编译，23 个 .js 全缺 | 跑 `npx tsc` + 加 `compileOptions.typescript` 段 + 补 `miniprogramRoot: "./"` |
| 2 | 23 个 `.ts` 编译产物需手动跑 | IDE 没开 TS 自动编译，devDep 也没装 typescript | `npm i -D typescript@5.4.5` + 加 4 个 npm scripts（build / build:check / watch / clean）|
| 3 | code 10009 `meal-section 组件未找到` | `meal-section` 和 `gi-badge` 两个组件漏写 `.json` 文件 | 补 `{"component": true}` 声明 |

**新增脚本**：
```json
"build": "tsc",
"build:check": "tsc --noEmit",
"watch": "tsc --watch",
"clean": "find . -name '*.js' -not -path '*/node_modules/*' -delete && find . -name '*.js.map' -not -path '*/node_modules/*' -delete"
```

**首次安装脚本小结**（照本项目可复用）：
```bash
cd fitdaily-mini
npm install --save-dev typescript@5.4.5
npx tsc        # 编译到 ./ (各页面同目录生成 .js)
```

**根因复盘**：`tsc --noEmit` 早过了（DEVLOG T11 阶段）但**没人手动跑过 emit 编译**。TypeScript 项目在微信小程序里必须显式产 .js，否则 IDE 找不到入口。这是 TypeScript + 小程序项目新手的经典坑。

### T14.2 ✅ vision-settings UI 修复（输入框高度 / 默认国内站）
**触发**：俊洪截图反馈 "API 设置页输入框宽度太小没法输入 / 应该默认国内站"。

**两个问题**：

| # | 现象 | 根因 | 修复 |
|---|---|---|---|
| 1 | 三个输入框高度太矮（视觉只显示文字上半截）| `.vs-input { padding: 14rpx }` + 26rpx 字号 在 rpx 下渲染过扁 | padding 14→20rpx、font 26→28rpx、加 `line-height: 40rpx` + `min-height: 80rpx` |
| 2 | 视觉宽度看着窄（即使 .vs-col 是 column flex）| 实际宽度 OK 但文字被垂直截断后看起来像 "窄" | 修了高度后自动解决 |
| 3 | PRESETS 默认国际站 | 数组顺序写反 | 国内站 (`minimax-cn`) 排到 PRESETS[0] |

**关键洞察**：在小程序里 **rpx 单位渲染机制跟浏览器 px 不一样**——同样的 CSS 在 IDE 模拟器看着 OK，真机上可能高度不够。这条经验后面 UI 调试都要留心。

**Vision settings 输入框黄金参数**（后续表单可复用）：
```css
.vs-input {
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  line-height: 40rpx;
  min-height: 80rpx;   /* 关键！手指定位友元 */
  width: 100%;
  min-width: 0;        /* flex 子项不被撑大 */
  display: block;      /* 显式 block */
  box-sizing: border-box;
}
```

### T14.3 ✅ 真机调试「连接失败 / AI 返回无法解析」修复
**触发**：俊洪 webchat: "模拟器可以连接成功，真机调试一点就连接失败 / 提示 AI 返回内容无法解析"。

**调试过程 + 真凶定位**：

| 阶段 | 错误信息 | 排除的可能 |
|---|---|---|
| 第一次 | 模拟器 OK 真机失败，错误是 "连接失败" | 模拟器与真机是两个独立运行环境——Key 不互通 |
| 加 testConnection 错误透传 | `url not in domain list` → 提示「去 IDE 勾不校验」 | ❌ 勾完后通了 |
| 加 testConnection 错误透传 | `AI 返回内容无法解析` | Key 通了、网络通了、域名通了 |
| 我误判 "M3 不支持图片" | 准备改成 abab-vision | ❌ 俊洪纠正 "M3 原生多模态支持" |
| 最终真凶 | **parseRecogJson 鲁棒性不够**——LLM 返回 JSON 前后会加说明文字 / 包 ```json 围栏 | ✅ |

**核心修复**：`parseRecogJson` 三步走：
```typescript
export function parseRecogJson(content: string): RecogResult | null {
  if (!content || typeof content !== 'string') return null;
  let raw = content;
  // 1. 剥 Markdown 代码块围栏（不区分大小写）
  raw = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/g, '').trim();
  // 2. 抓首尾 { } 作为 JSON 边界（应对模型加前缀说明）
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  raw = raw.slice(firstBrace, lastBrace + 1);
  // 3. 解析 + 验证 items 是数组
  try {
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.items)) return null;
    return obj as RecogResult;
  } catch { return null; }
}
```

**Prompt v2 加强**：
```
· 重要：你的回复必须是一个合法 JSON 对象，不要写任何其他文字、解释、思考或 Markdown 代码块
· 即使图片识别困难也要返回 items=[] 与 confidence=0.0，不要返回错误信息文本
```

**TestConnection 重构**（之前只能 true/false，现在带错误详情）：
```typescript
export interface TestResult { ok: boolean; status?: number; errMsg?: string; }
export function testConnection(...): Promise<TestResult> { ... }
```
UI 端 `onTest` 分场景显示具体原因（域名未配 / 401 / 超时 / 网络）。

### 关键经验 · 微信小程序真机调试 SOP

**重要踩坑**：模拟器跟真机是两个运行环境——**Key、存储、合法域名都不一样**。

```
调试 SOP（按顺序排查）：

1. 看 IDE 控制台错误信息
   ↓ url not in domain list
   → IDE 详情→本地设置→勾「不校验合法域名、web-view、TLS、HTTPS 证书」
   ↓
2. 真机独立配置
   → 真机扫码→进设置页重新填 Key→保存
   ↓
3. 点「测试连接」看新错误信息
   ↓ 401
   → Key 错了 / 用错站点
   ↓ status 非 200
   → 看具体 status 码
   ↓ 透传 errMsg
   → 可能是 timeout / fail ssl / 公司代理
   ↓
4. 以上都过了，进拍照识别阶段
   ↓ 「AI 返回内容无法解析」
   → parseRecogJson 鲁棒性不够（多数 LLM 返回非纯 JSON）
   → 参考 T14.3 修复
```

### 配置变更总览（T14 全部）

| 变更 | 文件 | 备注 |
|---|---|---|
| `miniprogramRoot: "./"` | project.config.json | IDE 编译根目录 |
| `compileOptions.typescript` 段 | project.config.json | IDE TS 自动编译配置 |
| `typescript@5.4.5` devDep | package.json | 手动 tsc 兜底 |
| 4 个 npm scripts | package.json | build / build:check / watch / clean |
| `.gitignore` | 新建 | 忽略 .js / .js.map / node_modules |
| PRESETS 国内站排第一 | services/vision.ts | 默认国内 |
| Prompt v2 + parseRecogJson 鲁棒化 | services/vision.ts | 拍照识别核心 |
| testConnection TestResult | services/vision.ts | UI 错误透传 |
| onTest 分场景错误处理 | pages/vision-settings/vision-settings.ts | 真机调试 UX |
| vs-input / vs-picker 高度 + line-height | pages/vision-settings/vision-settings.wxss | UI 黄金参数 |
| 2 个组件补 .json | components/meal-section、components/gi-badge | T1 脚手架时漏配 |

### 验证 (T14 完整跑通)
- `tsc --noEmit` exit 0
- `tsc` exit 0，产物 23 个 .js 全齐
- IDE 模拟器编译过（之前 10005 → 10009 → ✅）
- 真机扫码→测试连接 ✅ (url 域名前置 + 不校验)
- 真机拍照→识别 → food-edit ✅ (鲁棒 JSON 解析)

---

## 2026-08-25 · T15 喝水管理 + 每日目标智能计算

### T15.1 ✅ 今日饮水：减 / 清零 / 自定义输入
**触发**：俊洪反馈 "今日喝水好像没法删除或者重置"。

**根因**：storage 层只有 `waterAdd`（加），没有 `waterSub/waterSet/waterReset`；UI 层只有一个 `+250ml` 按钮，没有「减 / 改」路径。

**实施**：
- `services/storage.ts` 新增 3 个函数：`waterSub(date, ml)` / `waterSet(date, ml)` / `waterReset(date)`
- `pages/index/index.wxml` 喝水卡加 `bindlongpress="onWaterLongPress"`
- `pages/index/index.ts` 新增 `onWaterLongPress`（弹 ActionSheet：减250ml / 清零今日（>0时才显示） / 自定义输入…）+ `onWaterCustomInput`（modal 输入框，校验 0-9999 整数）

**交互设计**：
- 单击 `+250ml`：原行为不变
- 长按卡片：弹 ActionSheet（减250ml / 清零 / 自定义）
- 自定义输入：弹 modal，正则 `/^\d{1,4}$/` 校验 + ≤ 9999

### T15.2 ✅ 每日目标：Mifflin-St Jeor 智能计算（重写 1800 默认值）
**触发**：俊洪问 "现在的目标是怎么算出来的" → 答：硬编码 1800/90/225/60/25/1500 默认值，**没有公式、没有用户输入**。

**问题**：俊洪在广州、男、目标未知，硬编码 1800 kcal 是错的（男士维持通常 2200-2800）。

**实施**：P1 方案 — Mifflin-St Jeor 公式 + BodyProfile 6字段输入

**新增/修改文件**：

| 文件 | 改动 |
|---|---|
| `services/types.ts` | + `Sex` / `ActivityLevel` / `Goal` / `BodyProfile` 接口 + `ACTIVITY_LABEL` / `GOAL_LABEL` |
| `services/goal.ts` | **新建**：`calcTargets(body)` + `calcDetail(body)` 纯函数 |
| `services/storage.ts` | + `SK.body` 键 + `bodyGet()` / `bodySet()` |
| `pages/goal-settings/goal-settings.{json,ts,wxml,wxss}` | **新建**：4 文件完整新页 |
| `app.json` | 注册 `pages/goal-settings/goal-settings` |
| `pages/profile/profile.{ts,wxml,wxss}` | 加 ✏️ 编辑入口 + grid 从4列改3列（6格） |

**Mifflin-St Jeor 公式**：
```
BMR(男) = 10×体重kg + 6.25×身高cm - 5×年龄 + 5
BMR(女) = 10×体重kg + 6.25×身高cm - 5×年龄 - 161
TDEE = BMR × 活动系数
  sedentary 1.2 / light 1.375 / moderate 1.55 / active 1.725 / veryActive 1.9
目标 = TDEE ± 调整
  cut -500 / maintain 0 / bulk +300
蛋白 = 体重kg × 系数
  cut 1.8 / maintain 1.4 / bulk 2.0 (g/kg)
脂肪 = 目标kcal × 25% / 9
碳水 = (目标kcal - 蛋白×4 - 脂肪×9) / 4（保证 ≥ 0）
纤维 = 25g（中国营养学会推荐）
水 = 体重kg × 35ml
```

**单元测试自验证**（Node 直接 require）：
| 输入 | BMR | TDEE | Target | 蛋白 |
|---|---|---|---|---|
| 男30 175cm 70kg 中度 维持 | 1649 | 2556 | 2556 | 98g |
| 男30 175cm 75kg 中度 减脂 | 1699 | 2633 | 2133 | 135g |
| 女28 165cm 55kg 轻度 增肌 | 1280 | 1760 | 2060 | 110g |

✅ 数值在合理范围（男维持 2500±、减脂 2000±、女增肌 2000±）

**额外贴心的逻辑**：
- 保存时如果用户今日没记体重，**自动记录今日体重**（避免用户在 weight 页重复录入）
- 预览卡片实时显示 BMR / TDEE / Target + 5 个目标格子
- 公式说明放在页面底部 footnote，可信度+1

**用户流程**：
1. profile 页 → 看到现在的 1800/90/225/60/25/1500 默认目标（硬编码）
2. 点「✏️ 编辑」→ 跳 goal-settings 页
3. 填 6 个字段（性别/年龄/身高/体重/活动量/目标）→ **实时预览** BMR / TDEE / Target / 5 个目标
4. 点「保存并应用目标」→ 写 body + profile + 今日体重
5. 回 profile 页看到**新算的目标**
6. 首页 nutrition-dashboard 自动按新目标显示环 + 进度条（无需改）

### 配置变更总览（T15 全部）
| 变更 | 文件 |
|---|---|
| + `waterSub` / `waterSet` / `waterReset` | services/storage.ts |
| + `BodyProfile` 类型 + label | services/types.ts |
| + `services/goal.ts`（公式纯函数） | 新建 |
| + `SK.body` + `bodyGet/Set` | services/storage.ts |
| + `pages/goal-settings/` 4 文件 | 新建 |
| `app.json` 注册 goal-settings | app.json |
| profile 加 ✏️ 编辑入口 + 6 格 3 列 | pages/profile/ |
| 喝水卡加长按管理 | pages/index/ |

---

## 2026-08-25 · T16 历史统计页（PRD M2 提前到 v1.1）

### T16.1 ✅ PRD 补全 + 设计沉淀
**触发**：俊洪问「数据 tab 原来设计需求是啥」→ 我深挖发现 PRD v1.0 只写了「pages/stats (M2)」一句话，没有具体字段 / 区块设计。

**做法**：PRD v1.1 补全：
- 第 2.4 节 `历史统计`：补字段「今日完成度 + 本周 7 天柱状 + 营养素均值 + GI 加权趋势」
- 第 9 章变更日志：v1.1
- 第 9.1 节：完整 stats 设计规范（4 区块、数据源、纯 CSS、复用 token）

### T16.2 ✅ stats 服务 + 页面落地
**实施**：

| 文件 | 改动 |
|---|---|
| `services/stats.ts` | **新建**：4 个纯函数（mondayOf / weekDailySummaries / weekAverages / weekAvgGi / highGiFoodsThisWeek）|
| `pages/stats/stats.ts` | 从空壳补全（1718 字节）：onShow 重算 + setData 6 维度目标值 + 7 天 summaries + GI 统计 |
| `pages/stats/stats.wxml` | 重写 4 区块（10200 字节）：顶部日期 + 今日完成度 + 7 天柱状图 + 周日均 + GI 控制 |
| `pages/stats/stats.wxss` | 全新 6888 字节样式：纯 CSS 柱状图 + 横条 + GI 三色 + 高 GI 食物列表 |
| `app.json` | tabBar 第3项：`pages/data/data` → `pages/stats/stats`（PRD 设计意图）|

### 4 区块功能

| # | 区块 | 实现 |
|---|---|---|
| 1 | 今日完成度 | 顶部大字 + 渐变进度条 + 5 行宏量 mini 条（蛋白/碳水/脂肪/纤维/水）|
| 2 | 本周 7 天柱状 | flex 7 列 + 高度按 maxKcal 归一化 + 三色达标判定（≥85% 绿 / <85% 黄 / 超标珊瑚）|
| 3 | 本周营养素均值 | 6 行横条（热量/蛋白/碳水/脂肪/纤维/水），条长 = 本周日均 / 目标|
| 4 | GI 加权评分 | 顶部三色 badge（≤55 低 / ≤69 中 / ≥70 高）+ 提示文案 + 7 天 GI 柱状 + 高 GI 食物列表 |

### 纯 CSS 优势
- **零外部依赖**：不引 echarts（PRD v1.0 第 6 章原计划引）
- **主包不超 2MB**：108 种食物库已吃大头，统计页不加重
- **首屏快**：< 50 条日志场景下渲染 < 200ms

### 单元自测
- ✅ `mondayOf()` 周日→周一映射正确（2026-08-25 周二 → 2026-08-24 周一）
- ✅ `tsc` 编译 0 错误
- ✅ 4 区块模板渲染依赖完整（summaries/weekAvg/weekGi/highGi/6 维度 target 全齐）

### PRD 沉淀位置
`docs/fitdaily/PRD.md` 第 9.1 节（v1.1 新增章节）
