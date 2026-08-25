import { weightsAll, weightUpsert } from '../../services/storage';
import { WeightLog } from '../../services/types';

Page({
  data: {
    input: '',
    records: [] as WeightLog[],
    /** 图表用的简化序列 */
    chart: [] as Array<{ x: number; y: number; label: string; v: number }>,
    latest: null as WeightLog | null,
    diffFirst: 0, // 与第一条记录的差值
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const all = weightsAll();
    const chart = all.map((w, i) => ({
      x: all.length > 1 ? (i / (all.length - 1)) * 100 : 50, // 0-100 归一化
      y: this.normY(all, w.weightKg),
      label: w.date.slice(5),
      v: w.weightKg,
    }));
    this.setData({
      records: all.slice().reverse(),
      chart,
      latest: all.length ? all[all.length - 1] : null,
      diffFirst: all.length ? Math.round((all[all.length - 1].weightKg - all[0].weightKg) * 10) / 10 : 0,
    });
  },

  /** 简单折线：把体重映射到 0-100 的 y（值越大 y 越小） */
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

  onSave() {
    const v = parseFloat(this.data.input);
    if (!(v >= 20 && v <= 300)) {
      wx.showToast({ title: '请输入合理体重(kg)', icon: 'none' });
      return;
    }
    const d = new Date();
    const date = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
    weightUpsert({ date, weightKg: Math.round(v * 10) / 10 });
    this.setData({ input: '' });
    this.refresh();
    wx.showToast({ title: '已记录 ✅', icon: 'none' });
  },

  onDelete(e: WechatMiniprogram.TouchEvent) {
    // 简化：暂不支持删除（storage 无对应方法），T12.1 可加
    void e;
  },
});
