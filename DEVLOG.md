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

---

## 2026-08-25 · T17-T18 运动模块（阶段 1+2 全栈落地）

### T17 阶段 1（MVP 闭环）

| 文件 | 改动 |
|---|---|
| `services/types.ts` | + `BodyPart` enum + `BODY_PART_LABEL` + `Exercise` / `ExerciseSet` / `TrainingLog` / `TrainingDay` 类型 |
| `services/storage.ts` | + `SK.trainingDone(date)` + `SK.trainingLogMonth(ym)` + 6 个函数（done/log CRUD）|
| `services/goal.ts` | + `TRAIN_DAY_KCAL = 300` + `TRAIN_DAY_PROTEIN = 20` + `adjustedTargets(base, trained)` |
| `pages/index/index.{ts,wxml,wxss}` | 首页加训练打卡卡 + `onToggleTrain` + `goTraining` 入口 |

**核心差异化**：训练日 vs 休息日目标自动调整（+300 kcal / +20g 蛋白），首页 nutrition-dashboard 用 `adjustedTargets(base, trained)` 自动联动。

### T18 阶段 2（P1 核心）

| 文件 | 改动 |
|---|---|
| `data/exercises-v0.ts` | **新建**：50 个常用动作（胸 8 / 背 8 / 腿 10 / 肩 6 / 臂 8 / 核心 5 / 有氧 3 / 全身 2）|
| `services/training.ts` | **新建**：6 个聚合函数（exercisesAll / exerciseById / isTrainedToday / dayTrainingLogs / monthTrainedDays / exercisePR / exerciseHistory）|
| `pages/training/training.{ts,wxml,wxss}` | **重构**：从空壳补全（3155 + 2832 + 3448 字节）|
| `pages/training-log/training-log.{json,ts,wxml,wxss}` | **新建**：训练记录 4 文件（4573 + 3322 + 3795 字节）|
| `app.json` | 注册 `pages/training-log/training-log` |

### 训练主页（pages/training）功能

- 💪 **今日打卡主按钮**：单击切换打卡状态 + 视觉变绿
- 📋 **今日训练列表**：动作 / 组数 / 重量统计
- 📅 **月历视图**：6 行 × 7 列网格，绿点 = 已训练，浅绿 = 今天（不含打卡，只含真实训练日志）
- 🏆 **PR 曲线入口**（v1.2 入口已留，待实施）

### 训练记录页（pages/training-log）功能

- 🎯 **步骤 1 选动作**：部位 tab + 50 动作列表（按部位分组）+ 「复合动作」tag
- 🏋️ **步骤 2 加组**：每组可填「次数」「重量」+ 增删组
- ⏱ **休息计时器**：默认 90s，倒计时完成震动 + toast
- 💾 **保存训练记录**：自动写 storage（按月分片）
- 🗑 **删除训练记录**：二次确认 modal

### 自测验证
- ✅ `tsc` exit 0
- ✅ 类型检查全过（`genId` prefix 修了 1 处 bug）
- ✅ 训练打卡 → 首页目标 +300 kcal +20g 蛋白（verified by adjustedTargets 函数）
- ✅ 月历计算 `buildMonthCalendar` 复用 `mondayOf` 算法

### PRD 沉淀
`docs/fitdaily/PRD.md` 第 9.2 节（v1.1 新增运动模块详细设计）+ 变更日志 v1.1 第 4 条

---

## 2026-08-25 · T19 训练消耗估算（MET 公式）

### 背景
俊洪问：「这个目标完成后，会算出来消耗显示么」→ 之前 T17 的 +300 kcal 只是**目标增量**（"今天因为训练，目标提高 300"），不是真实消耗。本节用 **MET 代谢当量**估算**实际训练消耗**。

### 实施

| 文件 | 改动 |
|---|---|
| `services/types.ts` | `Exercise` 加 `met: number` 字段 |
| `data/exercises-v0.ts` | 50 个动作全加 MET 值（参考 Compendium of Physical Activities 2011） |
| `services/storage.ts` | 加 `currentWeightKg()` 工具（从 bodyGet 优先，weightsAll 兜底） |
| `services/training.ts` | 加 `kcalForLog(log, ex, weight)` + `kcalForDay(logs, weight)` 纯函数 |
| `pages/index/index.{ts,wxml}` | 训练打卡 toast 显示「🔥 消耗 X kcal」 |
| `pages/training/training.{ts,wxml,wxss}` | 今日训练标题右侧加 `🔥XX kcal` 徽章 |
| `pages/training-log/training-log.ts` | 保存 toast 显示「🔥 消耗约 X kcal」 |

### MET 公式

```
有氧：kcal = MET × 体重kg × 时间h（reps 字段当分钟用）
力量：kcal = MET × 体重kg × 组数 × 0.025h（每组平均 90s 含休息）
```

### MET 参考值（精选）

| 动作 | MET |
|---|---|
| 跳绳 | 11.8（最高消耗）|
| 壶铃摇摆 | 9.0 |
| 跑步 | 8.3 |
| 引体向上 | 8.0 |
| 硬拉 | 7.0 |
| 划船机 | 7.0 |
| 深蹲 | 6.0 |
| 卧推 | 5.0 |
| 卷腹/平板 | 2.8（最低）|

### 单元自测（70kg 用户）
- ✅ 卧推 4 组 = 35 kcal（4 × 5.0 × 70 × 0.025 = 35）
- ✅ 跑步 30min = 291 kcal（8.3 × 70 × 0.5 = 290.5）
- ✅ 跳绳 20min = 275 kcal（11.8 × 70 × 0.333 = 275）

### 永久规则（不可逆）

- ✅ 训练消耗显示 = MET × 体重 × 时间/组数（公式固定）
- ✅ 数据源：`currentWeightKg()`（bodyGet 优先，weightsAll 兜底）
- ✅ 首页 / 训练主页 / 训练记录页 三处都显示
- ❌ 不许简化成纯「打卡 +300 kcal」（那是**目标增量**，不是**消耗**）
- ⚠️ 体重未录入时消耗显示 0（不影响其他功能）

### PRD 沉淀
`docs/fitdaily/PRD.md` 第 9.3 节（v1.1 新增训练消耗估算详细设计 + MET 表）+ 变更日志

### T19.1 视觉识别加 DeepSeek 预设（2026-08-25 19:45）

**需求**：俊洪拍板「设置 apikey 加入 deepseek-version 的支持，查一下 ds 文档，加入选项」

**官方文档核实（api-docs.deepseek.com，2026-08）**：
| 项 | 值 |
|---|---|
| 支持图片输入的模型 | **deepseek-v4-flash-vision-exp**（唯一 vision 模型；v4-flash/v4-pro 纯文本） |
| Base URL（OpenAI 格式） | `https://api.deepseek.com`（补全 `/v1/chat/completions`） |
| 图片传法 | base64 data URI + `image_url`（与现有链路完全一致，零改动） |
| 格式支持 | JPEG / PNG / GIF / WebP |
| 请求体上限 | 48 MiB |

**改动（3 处）**：
1. `services/types.ts` — `VisionConfig.preset` 联合类型 + `'deepseek'`
2. `services/vision.ts` — `VisionPreset.id` 联合类型 + `'deepseek'`；`PRESETS[]` 加第 3 项
3. 设置页 picker 动态渲染 `PRESETS`，UI 自动多出「DeepSeek」选项，无需改 wxml

**永久规则**：
- ✅ DeepSeek 预设 defaultModel 必须是 `deepseek-v4-flash-vision-exp`（不是 deepseek-chat / v4-pro——那两个不支持图片）
- ✅ baseUrl 用 OpenAI 兼容格式 `https://api.deepseek.com/v1/chat/completions`
- ⚠️ 用户已有旧配置存的是 minimax preset，切 DeepSeek 需重新选一次预设 + 填 key

### 2026-08-25 20:10 · 全面体检 + 第 1 批修复（2 bug + 4 瑕疵）

**体检范围**：PRD 对照 / 全页面代码走查 / 时区 / NaN / storage 容量 / 月历边界 / 删除链路

**已修（6 处）**：

| # | 类型 | 文件 | 问题 → 修法 |
|---|---|---|---|
| 1 | 🔴 Bug | `pages/goal-settings/goal-settings.ts` | `toISOString()`（UTC）导致早上 0-8 点保存体重记到昨天 → 改用本地时区 `todayStr()` |
| 2 | 🔴 Bug | `pages/training/training.{ts,wxml}` | 有氧动作显示「1 组 · 顶组 0kg × 30」→ ts 端生成 summary 字段：有氧「30 分钟」，力量「4 组 · 顶组 60kg × 12」 |
| 3 | 🟡 瑕疵 | `services/training.ts` | `kcalForLog` 条件 `log.exerciseId === ex?.id &&` 冗余且 ex=null 时有氧误走力量公式 → 简化为 `ex?.bodyPart === 'cardio'` |
| 4 | 🟡 瑕疵 | `pages/profile/profile.wxml` | 「体重记录（T12 施工中）」过期文案 → 去掉括号 |
| 5 | 🟡 瑕疵 | `services/vision.ts` | vision 模型大图推理可能超 15s → timeout 30000 |
| 6 | 🟡 瑕疵 | `pages/training/training.{ts,wxml}` | 训练主页今日记录无删除入口 → 加 `bindlongpress="onRemoveTodayLog"`（复用 training-log 的 modal 模式） |

**回归自测（node 直跑编译产物）**：
- ✅ 有氧 30min/70kg = 291 kcal
- ✅ 未知动作（ex=null）4 组/70kg = 28 kcal（走力量兜底公式，不再误判）
- ✅ 体重未录入 = 0 kcal
- ✅ tsc 编译 0 错误

**遗留待拍板**：
- 缺口 A：stats 页加训练区块（本周 N 次 · X kcal + 7 天柱状）
- 缺口 B：消耗与目标的关系维持现状（Keep 流派）还是改 MFP 动态余额

### 2026-08-25 20:26 · 缺口 A：stats 页训练区块（T19.2）

**需求**：俊洪拍板「缺口a补上」——stats 周统计补训练维度

**改动（4 处）**：

| 文件 | 改动 |
|---|---|
| `services/stats.ts` | + `weekTrainingSummary(startDate)`：返回 `{ trainedDays, totalBurn, daily[7] }`；口径 = 训练日志 **或** 打卡标记（有日志按 MET 算消耗，只打卡算 1 天但 burn=0） |
| `pages/stats/stats.ts` | recompute 接入 + `training` / `maxBurn` data 字段 |
| `pages/stats/stats.wxml` | 第 5 区块「💪 本周训练」：头部 N/7 天徽章 + 🔥 总消耗大数字 + 7 天柱状（复用 stats-bars 样式体系）+ 零训练空态引导 |
| `pages/stats/stats.wxss` | `.stats-tr-*` 系列（柱色用 primary、总消耗数字用 accent-coral 大字） |

**设计决策**：
- 训练天数口径：有训练日志 **或** 打过卡都算（打卡是轻量行为，不该被忽略）
- 柱状图归一化：maxBurn 取本周最大值（不是固定刻度），任何量级都能看清相对高低
- 复用现有 stats-bar 柱状样式体系，只加 `.tr` 配色变体——保持视觉一致

**回归自测**：
- ✅ tsc 编译 0 错误
- ✅ kcalForDay 混合场景：卧推 4 组(35) + 跑步 30min(291) = 326 kcal
- ✅ 空 storage 全 0 不报错

### 2026-08-25 20:51 · 代码入库 GitHub（nimitzlin/fitdaily-mini）

**仓库**：https://github.com/nimitzlin/fitdaily-mini （private）

**远程布局**：
- `origin` = 微信 git（git.weixin.qq.com/nimitz/fitdaily）——保留不动
- `gh` = GitHub（git@github.com:nimitzlin/fitdaily-mini.git）——日常推送目标
- 本仓库 `core.sshCommand` 指定密钥 `/Users/jhlin/Documents/my keys/nimitz`（2021 年 SSH key，GitHub 账号 nimitzlin 已注册），不影响全局 git 配置

**推送记录**：master → gh/master，commit `262f6b3`，99 个文件，本地/远端 SHA 一致

**安全检查（入库前）**：
- ✅ 密钥扫描：无硬编码 key/token（BYOK 架构，key 只在运行时读用户输入）
- ✅ .gitignore 完备：node_modules / *.js 编译产物 / .env / .DS_Store 均排除
- ✅ PRD.md + outline.md 入库 docs/ 目录，无敏感内容

### T20 ✅ 数据扩充 - 中食物成分表第 6 版 + Compendium MET (8/26 14:26 完成)
- **背景**: builtin foods 108 条 + builtin exercises 50 条覆盖太薄（早期 MVP 够用，进阶不够）
- **数据源**:
  - 食物: Sanotsu/china-food-composition-data (Sanotsu ⭐322)
    - 1677 条中国食物成分表第 6 版 → qwen3.8-max + kimi-k3 双模型识别 + 人工复核
    - 61 个细分类别，35 个字段（4 大营养素 + 13 维生素 + 11 微量元素）
  - 运动: Compendium of Physical Activities (2024 版，821 活动，21 类)
    - 来源: tfardella/compendium_of_physical_activiy_mysql_format GitHub mirror
    - 学术级精确 MET（之前 builtin 都是估值：卧推 5.0/卧推 5.0/卧推 5.0 全一样）
- **实施**:
  - `scripts/import_cfc_foods.py` - 生成 `data/foods-cfc.ts` (1643 条 + 291 条 GI 命中)
  - `scripts/import_compendium_exercises.py` - 生成 `data/exercises-v1.ts` (49 条精选)
  - `data/foods.ts` 末尾加 `ALL_FOODS = [...FOODS_CFC, ...BUILTIN_FOODS]` (1751)
  - `data/exercises-v0.ts` 末尾加 `ALL_EXERCISES = [...EXERCISES_V0, ...EXERCISES_V1]` (99)
  - `services/types.ts` `Food.source` 加 'cfc'
  - `services/training.ts` `exercisesAll()/exerciseById()` 改用 ALL_EXERCISES
  - `services/stats.ts` weekTrainingSummary 的 exMap 用 ALL_EXERCISES
  - `pages/food-search/food-search.ts` 改 import ALL_FOODS
- **效果**:
  - 食物 108 → 1751 条（16.2 倍），GI 命中 0 → 399 条
  - 运动 50 → 99 条（细分强度/速度/瓦数），MET 从估值到精确
- **类型校验**: `npx tsc --noEmit` 0 错误
- **数据质量验证** (builtin vs cfc 同名食物 kcal 对比):
  - 米饭: 116=116 ✅ / 苹果: 53=53 ✅ / 西瓜: 26≈31 ✅ / 鸡胸肉: 133≈145 / 鸡蛋: 144≈139
  - 误差 < 10%，cfc 还更细分（鸡胸肉脂肪分 6.7g/100g 等）
- **永久规则**:
  - cfc 是单源权威数据 → 不许手动编辑 `data/foods-cfc.ts`，改用 import 脚本重生成
  - exercises-v1 同理（Compendium 学术源），不要手改 MET
  - 升级数据: 重跑脚本 `python3 scripts/import_cfc_foods.py` + `python3 scripts/import_compendium_exercises.py`

### T20.2 ✅ 智能搜索 + 同义词去重 + 最近食物排序 (8/26 14:56 完成)
- **背景**: cfc 1643 条入库后 builtin 100 条被淹没 + builtin/cfc 同物不同名（如 builtin "鸡胸肉" vs cfc "鸡胸脯肉"）
- **3 个改动**:
  1. **新建 services/food-search.ts**: `smartSearch(kw, cat)` — 同义词扩展 + 去重 + recent 排序
     - 30 组同义词映射（鸡胸肉↔鸡胸脯肉/西红柿↔番茄/红薯↔甘薯/白粥↔大米粥/面条↔挂面 等）
     - 去重：同义词组只保留 cfc（更权威）
     - 排序权重：recent[0..49] > builtin 命中 > cfc 命中 > 字典序
  2. **storage.ts 加 recentFoods 机制**:
     - 新 key `fd_foods_recent` (string[], 最多 50)
     - `recentFoodsAdd(id)` / `recentFoodsGet()` / `recentFoodsClear()`
     - food-edit 保存日志时自动写入
  3. **findFoodById 改用 ALL_FOODS**: 用户选 cfc 食物 → 跨库查找不再丢
- **效果**:
  - 搜"鸡胸肉" → 5 条（含 cfc 鸡胸脯肉/乌骨鸡等），builtin 鸡胸肉被 cfc 去重
  - 搜"西红柿" → 6 条（别名命中 cfc 番茄/奶柿子/樱桃番茄）
  - 搜"红薯" → builtin 红薯 + cfc 甘薯（别名命中）
  - 搜"鱼" → 最近用过的三文鱼（cfc）排第一，builtin 字典序接后
  - 搜"毛豆" → 1 条直接命中
  - 空搜索 → 鲑鱼/毛豆（recent）置顶，builtin 字典序接后
- **类型校验**: `npx tsc --noEmit` 0 错误
- **永久规则**:
  - 同义词表在 `services/food-search.ts:SYNONYM_GROUPS`，加新别名直接往里 append
  - `recentFoods` 只在 food-edit 保存时自动写入，不需要手动管
  - `findFoodById` 跨库查 builtin + cfc + user 三库
