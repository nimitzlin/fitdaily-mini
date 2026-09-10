import { foodsUserAll, profileGet, visionCfgGet, visionKeyGet } from '../../services/storage';
import { UserProfile } from '../../services/types';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.5',
    date: '2026-09-09',
    title: '界面升级 + 动效系统',
    items: [
      '🎨 全局设计语言升级：Pastel 配色 + Glassmorphism 玻璃质感',
      '🎨 Emoji 装饰元素统一为彩色 chip（11 种色板：食物/训练/饮水/搜索...）',
      '🆕 页面入场动效：子元素逐个滑入（50ms 间隔）',
      '🆕 列表交错入场：容器内元素依次出现（40ms 间隔）',
      '🆕 按压反馈：按钮/卡片按压 0.94 缩放 + 颜色变化',
      '🆕 持续动效：休息计时器呼吸、训练 hero 漂浮、卡路里数字流光',
      '🎨 弹层弹簧入场（更新日志 / 弹层 全部从底部弹出）',
      '🆕 PR 曲线页上线：卧推/深蹲/硬拉 + 重量趋势折线图',
      '🐛 修复训练页「PR 曲线」入口占位弹层误点',
      '🐛 修复 WXSS 解析器不支持 `> *` 选择器（编译错误）',
    ],
  },
  {
    version: 'v1.4',
    date: '2026-09-03',
    title: '文案调整',
    items: [
      '🔧 用户可见文案统一调整，原「拍照识别 / 智能匹配」类描述收敛为「拍照估算 / 扫描匹配」',
      '🔧 「拍照识别设置」导航栏与入口文案同步调整',
      '🔧 设置页接入密钥相关措辞收敛',
    ],
  },
  {
    version: 'v1.3',
    date: '2026-09-03',
    title: '体重补录 + 折线图异常修复',
    items: [
      '🆕 体重补录历史日期（日期 picker，默认今天，限制不能选未来）',
      '🆕 体重记录删除（历史列表每行「删除」胶囊按钮 + 确认模态框）',
      '🐛 修复体重趋势折线图异常（点跳位 / 线条角度错乱）',
    ],
  },
  {
    version: 'v1.2',
    date: '2026-09-02',
    title: '训练记录显示/统计修复',
    items: [
      '🐛 修复训练记录列表显示动作 ID 而非中文名',
      '🐛 修复训练/饮食列表的「删除」按钮不生效（e.detail vs dataset）',
      '🐛 修复训练动作单位错乱（8km 跑步显示「8kg × 30」）',
      '🐛 修复每日训练卡路里严重偏低（kcalForDay 用 V0 索引，导致 V1 动作查不到）',
    ],
  },
  {
    version: 'v1.1',
    date: '2026-08-28',
    title: '饮品补全 + Bug 修复',
    items: [
      '🆕 食物库新增 16 条常用饮品（红茶 / 绿茶 / 乌龙 / 普洱 / 茉莉花 / 豆奶 / 燕麦奶 / 酸奶 / 苹果汁 / 葡萄汁 / 柠檬水 / 酸梅汤 / 维他柠檬茶）',
      '🐛 修复食物编辑页 picker 显示 [object Object]（缺 range-key="label"）',
      '🐛 修复更新日志弹层不能滑动（scroll-view 缺 flex:1 + min-height:0 + height:100%）',
      '🐛 修复猜餐次边界错误（14 点被误判为晚餐，< 14 改 < 15）',
      '🐛 修复猜餐次只对拍照入口生效（默认 mealIndex 改为猜餐次）',
      '🐛 修复猜餐次覆盖用户选择（!mealIndex 永真 bug）',
    ],
  },
  {
    version: 'v1.0',
    date: '2026-08-27',
    title: '历史补登/编辑',
    items: [
      '🆕 历史补登页：6×7 月历视图 + 日期切换器',
      '🆕 食品记录修改：首页卡片右侧彩色编辑/删除按钮',
      '🆕 训练记录修改：每条记录编辑回填 + 更新模式',
      '🆕 训练打卡可补登任意历史日期',
      '🆕 饮水管理支持历史日期',
      '🔧 底层新增 trainingLogUpdate 函数',
    ],
  },
  {
    version: 'v0.3',
    date: '2026-08-26',
    title: '数据扩充 + 图片扫描匹配',
    items: [
      '🆕 内置食物库扩到 1751 种（中食物成分表第 6 版）',
      '🆕 搜索排序优化（同义词去重 + 最近用过优先）',
      '🆕 拍照后匹配数据库候选',
      '🆕 训练动作库 50 个 + MET 字段',
    ],
  },
  {
    version: 'v0.2',
    date: '2026-08-25',
    title: '运动模块上线',
    items: [
      '🆕 stats 数据页（4 区块纯 CSS）',
      '🆕 训练主页 + 训练记录页',
      '🆕 训练日目标自动 +300 kcal / +20g 蛋白',
      '🆕 MET 公式训练消耗估算',
      '🆕 Mifflin-St Jeor 每日目标计算',
    ],
  },
  {
    version: 'v0.1-dev',
    date: '2026-08-24',
    title: 'MVP 雏形',
    items: [
      '🆕 今日首页 + 四餐时间线 + 营养看板',
      '🆕 食物搜索 + 我的食物库 + 拍照记录',
      '🆕 体重记录页（纯 CSS 折线）',
      '🆕 拍照估算服务设置',
    ],
  },
];

Page({
  data: {
    profile: null as UserProfile | null,
    visionReady: false,
    currentVersion: CHANGELOG[0].version,
    currentDate: CHANGELOG[0].date,
    showChangelog: false,
    changelog: CHANGELOG,
  },

  onShow() {
    const cfg = visionCfgGet();
    this.setData({
      profile: profileGet(),
      visionReady: !!(cfg && visionKeyGet()),
    });
    void foodsUserAll().length;
  },

  goMyFoods() {
    wx.navigateTo({ url: '/pages/my-foods/my-foods' });
  },
  goVision() {
    wx.navigateTo({ url: '/pages/vision-settings/vision-settings' });
  },
  goWeight() {
    wx.navigateTo({ url: '/pages/weight/weight' });
  },
  goGoalSettings() {
    wx.navigateTo({ url: '/pages/goal-settings/goal-settings' });
  },

  /** 显示/隐藏更新日志弹层 */
  toggleChangelog() {
    this.setData({ showChangelog: !this.data.showChangelog });
  },
  closeChangelog() {
    this.setData({ showChangelog: false });
  },
});
