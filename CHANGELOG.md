# FitDaily 更新日志

## v1.4 · 2026-09-03（T27 · 文案调整）

### 🔧 文案调整

用户可见文案中可能被商店审核判为「生成式 AI / AI 内容生成」类目的措辞统一收敛为中性表述，以提升审核通过率：
- 「拍照识别」→ 「拍照估算 / 拍照记录」
- 「拍照预填 / 拍照识别值」→ 「拍照预填 / 拍照估算值」
- 「拍照识别设置」→ 「拍照估算设置」（导航栏 + 入口文案）
- 「扫描匹配 / 排序优化」 替代 原「智能匹配 / 智能搜索」 类描述
- 「服务」 / 「接入密钥」 替代 原服务商名 / 「API Key」
- 文案本意不变：能力仍是拍照后估算营养，由第三方服务提供（仅作设置提示，不出现服务商名）

改动页面：components/half-screen-sheet、pages/food-edit、pages/food-search、pages/index、pages/my-foods、pages/profile、pages/vision-settings。历史版本的 CHANGELOG 文案不动，保持档案真实性。

---

## v1.3 · 2026-09-03（T26 · 体重补录 + 折线图异常修复）

### 🆕 新功能

**1. 体重补录历史日期**
- 录入卡新增「记录日期」picker，默认今天、可选过去任意日期
- `end="{{maxDate}}"` 限制不能选未来日期
- 按钮文案动态切换：「记录今天」↔「补录 YYYY-MM-DD」
- 补录后 toast 提示「已补录 YYYY-MM-DD」
- `weightUpsert` 按日期去重，重复补录同一天会覆盖

**2. 体重记录删除**
- 历史记录每行右侧新增珊瑚色「删除」胶囊按钮
- 点击弹确认模态框（显示日期 + 体重值）
- 新增 `storage.weightRemove(date)` 函数，按日期过滤删除

### 🐛 修复

- **体重趋势折线图异常（点跳位 / 线条角度错乱）**：
  - 容器 `.wg-chart` 未设显式 `width`（默认为内容宽度），百分比定位奇点位置跑到容器外
  - 折线 rotate 用「差值比」算角度，几何错误，导致从负角度画反方向、线条被 `overflow: hidden` 截断
  - 重写算法：引入 `CHART_W / CHART_H` 常量，用 `atan2(dy, dx)` 算正确几何角度，长度用勾股定理按容器实际像素算
  - `segments` 与 `chart` 拆为两个 wx:for，segments 只在 n≥2 时渲染
  - 单点数据下 x 轴 label 居中显示，避免「首尾两个一样的 label」

---

## v1.2 · 2026-09-02（T25 · 训练记录显示/统计修复）

### 🐛 修复

- **训练记录列表显示 `ex_comp_009`（动作 ID）而不是中文名**：data 页 wxml 直接渲染 `{{item.exerciseId}}`。改为 `viewTrainLog()` 预映射，查动作库得到中文名
- **训练 / 饮食列表的「删除」按钮不生效**：handler 从 `e.detail` 读参数，但 wxml 传的是 `data-*`（走 `e.currentTarget.dataset`）。改为读 dataset，删除路径正常工作
- **训练动作显示单位错乱（8km 跑步显示成「8kg × 30」）**：硬编码 `kg` 单位未区分动作类型。加 `formatSetSummary(log)` 工具：有氧按 km/分钟、力量按 kg/次数
- **每日训练卡路里严重偏低**：`kcalForDay` 用 `EXERCISES_V0` 建索引（50 条），但项目里动作库是 `ALL_EXERCISES`（99 条 = V0 + V1 Compendium）。V1 的跑步 4-8 mph / 跳绳 / 划船机 / 骑车全部查不到动作 → 落到默认 MET 4.0 + 力量公式按组数算时间 → 跑步 30 分钟只能算 7-15 kcal。改为 `ALL_EXERCISES` 索引，与单条 `kcalForLog` 口径一致

---

## v1.1 · 2026-08-28（T24 · 饮品补全 + Bug 修复）

### 🆕 新功能

**1. 食物库新增 16 条常用饮品**
- 纯茶类：红茶 / 绿茶 / 乌龙茶 / 普洱茶 / 茉莉花茶（都是 1 kcal/100g）
- 植物奶：豆奶（54 kcal）/ 燕麦奶（47 kcal）
- 乳饮：酸奶原味（65 kcal）
- 果汁：苹果汁（46 kcal）/ 葡萄汁（48 kcal）
- 含糖饮品：柠檬水（40 kcal）/ 酸梅汤（32 kcal）/ 维他柠檬茶（47 kcal）
- 数据源：中国食物成分表第 6 版 + 主流商品营养标签（每 100g/ml 口径）

### 🐛 修复

- **picker 显示 `[object Object]`**：食物编辑页餐次 picker 缺 `range-key="label"`，导致显示整个对象。已加上，picker 正常显示中文标签
- **更新日志弹层不能滑动**：scroll-view 在 flex 列容器里必须显式声明 `flex: 1; min-height: 0; height: 100%;` 才能正确撑开可滚动区域；同时 sheet 改为写死 `height: 80vh` + `overflow: hidden`。已修
- **猜餐次边界错误（14 点变晚餐）**：旧逻辑 `h < 14 ? lunch : h < 21 ? dinner : ...` 在 14:00-14:59 被判为晚餐。改为 `h < 15 ? lunch`（中餐延伸到 14:59）
- **猜餐次只对拍照入口生效**：默认 `mealIndex: 1`（午餐）使首页手动点击「录入」跳到 food-edit 时始终是午餐。改为初始化就调用 `guessMealIndex()`，根据当前时段智能默认
- **猜餐次覆盖用户选择**：`if (!data.mealIndex)` 在 mealIndex=1（午餐）时永真，会重置用户已选的餐次。改为 `if (data.mealIndex == null)` 严格判定未设置时才自动猜

---

## v1.0 · 2026-08-27（T23 · 历史补登/编辑 + 食品/训练编辑）

### 🆕 新功能

**1. 食品记录修改**
- 首页食品卡片右侧新增「✏️ 编辑」+「🗑️ 删除」两个彩色胶囊按钮
- 入口更直观，从「整卡点击弹 ActionSheet」改为「右侧按钮直点」
- 编辑模式自动回填所有字段（份量/营养/餐次/GI/低GI开关）

**2. 训练记录修改**
- 训练记录页「今日训练」每条新增「✏️ 编辑」+「🗑️ 删除」按钮
- 点击编辑：动作 + 组数 + 重量 + 次数自动回填，顶部 banner 提示「正在编辑这条记录」
- 保存按钮文案动态切换：「保存训练记录」↔「更新训练记录」

**3. 历史补登 / 修改**
- 新增 tabBar 「数据」入口背后的 **补登页**（从 stats 页底部入口进入）
- 顶部日期选择器（`‹ 8/25 周二 ›` 左右切日 + 「回到今天」按钮）
- 6×7 月历视图：绿点 = 有饮食 / 🔥 = 有训练 / 橙色字 = 今天 / 绿底白字 = 选中
- 未来日期不可选（自动拦截）
- 当日汇总：热量 / 蛋白 / 消耗 kcal 三宫格
- 训练打卡可补（之前只能打卡今天）
- 饮水管理支持历史日期（+250ml / 长按减/清零/自定义）
- 饮食 + 训练记录列表：每条 ✏️ 编辑 / 🗑️ 删除
- 底部固定 FAB：「🍱 补录饮食」+「🏋️ 补录训练」

### 🔧 底层改动

- `services/storage.ts` 新增 `trainingLogUpdate(log)`（之前只有 add / remove）
- `services/training.ts` 新增 `updateTrainingLog(log)` wrapper
- `pages/training-log/training-log.ts` 支持 `?date=YYYY-MM-DD` query 参数，可补登任意日期
- tabBar 保持不变（仍是 今日 / 训练 / 数据 / 我的 4 项）

### 🐛 修复

- 「simulator launch failed」调试器噪音（开发者工具偶发，非功能 bug）
- TypeScript 编译不再依赖 IDE 自动 watch（手动 `npx tsc` emit JS）

---

## v0.3 · 2026-08-26（T20-T22 · 数据扩充 + OCR 智能匹配）

### 🆕 新功能

- **T20**: 内置食物库扩到 1751 种（主食 + 肉蛋 + 蔬果 + 奶豆 + 零食 + 饮品 + 调料 + 中食物成分表第 6 版 1643 条）
- **T20.2**: 智能搜索（同义词去重、最近用过排序、user 食物库支持）
- **T21**: 拍照识别后智能匹配数据库候选（3 个最匹配的食物，点一下采用精确数据）
- **T21**: 常用快捷入口（首页 FAB 优化）

### 🔧 改动

- `data/foods.ts`：1751 种食物种子
- `data/exercises-v0.ts`：50 动作库 + MET 字段
- 训练主页 `services/training.ts`：训练日 vs 休息日目标调整（+300 kcal / +20g 蛋白）
- `services/goal.ts`：Mifflin-St Jeor 公式智能计算每日目标
- `pages/goal-settings/`：目标设置页

---

## v0.2 · 2026-08-25（T15-T19 · 运动模块上线）

### 🆕 新功能

- **T15**: 今日饮水管理（+250ml / 长按减 / 清零 / 自定义）
- **T15**: 每日目标智能计算（Mifflin-St Jeor 公式 + 性别/年龄/身高/体重/活动量）
- **T16**: stats 数据页（今日完成度 / 本周热量柱状图 / 营养素均值 / GI 加权评分 / 训练统计）
- **T17**: 训练日打卡（首页训练卡单击切换 + 视觉变绿）
- **T17**: 训练主页（月历 + 今日训练 + 打卡 + PR 入口）
- **T18**: 训练记录页（50 动作库 / 多组录入 / 休息计时器 90s）
- **T18**: 月历视图（6×7 grid，绿点 = 已训练）
- **T19**: 训练消耗估算（MET 公式，70kg 卧推 4 组 ≈ 35 kcal）

### 🔧 改动

- `services/stats.ts`（新建 6 个函数）
- `services/training.ts`（新建）
- `services/goal.ts`（新建）
- `pages/stats/stats.{ts,wxml,wxss}`（4 区块纯 CSS 实现）
- `pages/training/{training,training-log}.{ts,wxml,wxss}`（新建）

---

## v0.1-dev · 2026-08-24（T1-T14 · MVP 雏形）

### 🆕 核心功能

- **T1**: 脚手架（10 页面 stub + TabBar + tokens.wxss）
- **T2**: 存储层（fd_logs 按月分片 / CRUD / profile 默认目标 / API Key 独立 'vk'）
- **T3**: 营养计算（碳水加权日均 GI / 营养素折算校验）
- **T4**: 5 个组件（capsule-progress / gi-badge / food-card / meal-section / nutrition-dashboard）
- **T5**: 今日首页（四餐时间线 + 营养看板 + 喝水 + FAB）
- **T7**: 食物搜索页
- **T9**: 我的食物库（自定义食物 CRUD）
- **T10**: AI 识别设置（MiniMax BYOK）
- **T11**: 拍照识别链路（拍照 → 压缩 → base64 → MiniMax → 草稿 → food-edit）
- **T12**: 体重记录页（数字录入 + 纯 CSS 折线趋势）
- **T13**: 内置食物库 108 种

### 🎨 设计

- 视觉：日系手帐抹茶绿马卡龙（#8ED08F 主色 / #FF9A76 珊瑚 / #F1FAF0 底 / #386641 深绿文字）
- design token 入 PRD 4.1
- 大圆角贴纸卡片 + 手绘感描边

---

_🤖 本日志由 FitDaily 自动维护，每次发版更新。_
