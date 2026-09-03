import { todayStr, weightsAll, weightRemove, weightUpsert } from '../../services/storage';
import { WeightLog } from '../../services/types';

/** 图表区域尺寸常量（rpx）；与 .wg-chart css 保持一致 */
const CHART_W = 600;
const CHART_H = 260;

interface ChartPoint {
  /** 容器内 x 位置（百分比，0-100） */
  x: number;
  /** 容器内 y 位置（百分比，0-100，0=顶，100=底；体重越大 y 越小） */
  y: number;
  label: string;
  v: number;
}
interface ChartSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 连接线长度（百分比，0-100） */
  len: number;
  /** 旋转角度（deg），从水平看向上为负、向下为正 */
  deg: number;
}

Page({
  data: {
    input: '',
    /** 选中的记录日期（默认今天，可补录历史） */
    pickDate: '',
    /** 最大可选日期为今天，不允许补录未来 */
    maxDate: '',
    records: [] as WeightLog[],
    chart: [] as ChartPoint[],
    segments: [] as ChartSegment[],
    latest: null as WeightLog | null,
    diffFirst: 0, // 与第一条记录差值
  },

  onShow() {
    this.setData({ maxDate: todayStr() });
    if (!this.data.pickDate) {
      this.setData({ pickDate: todayStr() });
    }
    this.refresh();
  },

  refresh() {
    const all = weightsAll();
    const n = all.length;
    const chart: ChartPoint[] = all.map((w, i) => ({
      x: n > 1 ? (i / (n - 1)) * 100 : 50,
      y: this.normY(all, w.weightKg),
      label: w.date.slice(5),
      v: w.weightKg,
    }));
    // 连线段：n>=2 才有。几何长度按 CHART_W/H 算，CSS rotate 用 atan2 求角度
    const segments: ChartSegment[] = [];
    for (let i = 1; i < n; i++) {
      const a = chart[i - 1];
      const b = chart[i];
      const dxPx = (b.x - a.x) * (CHART_W / 100);
      const dyPx = (b.y - a.y) * (CHART_H / 100);
      const lenPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
      const deg = Math.atan2(dyPx, dxPx) * (180 / Math.PI);
      segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, len: (lenPx / CHART_W) * 100, deg });
    }
    this.setData({
      records: all.slice().reverse(),
      chart,
      segments,
      latest: n ? all[n - 1] : null,
      diffFirst: n ? Math.round((all[n - 1].weightKg - all[0].weightKg) * 10) / 10 : 0,
    });
  },

  /** 把体重 v 映射为 0-100 的 y 百分比。体重越大 y 越小（画在更高的位置） */
  normY(all: WeightLog[], v: number): number {
    if (!all.length) return 50;
    const vs = all.map((w) => w.weightKg);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    if (max === min) return 50;
    return 90 - ((v - min) / (max - min)) * 80;
  },

  onInput(e: WechatMiniprogram.Input) {
    this.setData({ input: e.detail.value });
  },

  onPickDate(e: WechatMiniprogram.PickerChange) {
    // date picker 下 detail.value 是字符串 'YYYY-MM-DD'，但 TS 类型是 union
    const v = e.detail.value;
    this.setData({ pickDate: typeof v === 'string' ? v : String(v) });
  },

  onSave() {
    const v = parseFloat(this.data.input);
    if (!(v >= 20 && v <= 300)) {
      wx.showToast({ title: '请输入合理体重 (20–300 kg)', icon: 'none' });
      return;
    }
    const date = this.data.pickDate || todayStr();
    weightUpsert({ date, weightKg: Math.round(v * 10) / 10 });
    this.setData({ input: '' });
    this.refresh();
    wx.showToast({
      title: date === todayStr() ? '已记录今日 ✅' : `已补录 ${date}`,
      icon: 'none',
    });
  },

  onDelete(e: WechatMiniprogram.TouchEvent) {
    const { date, value } = e.currentTarget.dataset as { date: string; value: number };
    if (!date) return;
    wx.showModal({
      title: '删除这条体重记录？',
      content: `${date} · ${value} kg\n该操作不可撤销`,
      confirmColor: '#E57B64',
      success: (r) => {
        if (r.confirm) {
          const ok = weightRemove(date);
          this.refresh();
          wx.showToast({ title: ok ? '已删除' : '未找到该记录', icon: ok ? 'success' : 'none', duration: 1200 });
        }
      },
    });
  },
});
