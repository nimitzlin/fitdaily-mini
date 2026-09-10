import { exerciseHistory, exercisesAll } from '../../services/training';

/** 图表区域尺寸常量（rpx）；与 .prc-chart css 保持一致 */
const CHART_W = 600;
const CHART_H = 280;

interface ChartPoint {
  /** 容器内 x 位置（百分比，0-100） */
  x: number;
  /** 容器内 y 位置（百分比，0-100，0=顶，100=底；重量越大 y 越小） */
  y: number;
  label: string;
  v: number;
  date: string;
}
interface ChartSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  len: number;
  deg: number;
}
interface ExerciseOption {
  id: string;
  name: string;
  hasData: boolean;
  prKg: number;
}

Page({
  data: {
    options: [] as ExerciseOption[],
    activeId: '',
    activeName: '',
    prKg: 0,
    history: [] as { date: string; topWeight: number }[],
    chart: [] as ChartPoint[],
    segments: [] as ChartSegment[],
    diffFirst: 0,
    diffPR: 0,
  },

  onLoad() {
    this.buildOptions();
  },

  onShow() {
    this.buildOptions();
    if (this.data.activeId) this.refresh(this.data.activeId);
  },

  /** 列出 3 大经典动作（卧推/深蹲/硬拉）+ 任何有数据的其他动作 */
  buildOptions() {
    const all = exercisesAll();
    const classics = ['ex_bench', 'ex_squat', 'ex_deadlift'];
    const list: ExerciseOption[] = [];
    const seen = new Set<string>();

    for (const id of classics) {
      const ex = all.find((e) => e.id === id);
      if (!ex) continue;
      seen.add(id);
      const hist = exerciseHistory(id);
      list.push({
        id,
        name: ex.name,
        hasData: hist.length > 0,
        prKg: hist.length ? Math.max(...hist.map((h) => h.topWeight)) : 0,
      });
    }

    // 追加任何有训练记录的其他动作（按 PR 重量降序，最多 5 个）
    const others: ExerciseOption[] = [];
    for (const ex of all) {
      if (seen.has(ex.id)) continue;
      const hist = exerciseHistory(ex.id);
      if (hist.length === 0) continue;
      seen.add(ex.id);
      others.push({
        id: ex.id,
        name: ex.name,
        hasData: true,
        prKg: Math.max(...hist.map((h) => h.topWeight)),
      });
    }
    others.sort((a, b) => b.prKg - a.prKg);
    list.push(...others.slice(0, 5));

    // 默认 active 选第一个有数据的
    const firstWithData = list.find((o) => o.hasData);
    this.setData({ options: list });
    if (!this.data.activeId && firstWithData) {
      this.refresh(firstWithData.id);
    } else if (this.data.activeId) {
      // 确保 activeName 同步
      const cur = list.find((o) => o.id === this.data.activeId);
      if (cur) this.setData({ activeName: cur.name, prKg: cur.prKg });
    }
  },

  onPickExercise(e: WechatMiniprogram.TouchEvent) {
    const id = (e.currentTarget.dataset.id as string) || '';
    if (!id || id === this.data.activeId) return;
    this.refresh(id);
  },

  refresh(id: string) {
    const hist = exerciseHistory(id);
    const opt = this.data.options.find((o) => o.id === id);
    const name = opt ? opt.name : '';
    const prKg = hist.length ? Math.max(...hist.map((h) => h.topWeight)) : 0;
    const n = hist.length;

    const chart: ChartPoint[] = hist.map((h, i) => ({
      x: n > 1 ? (i / (n - 1)) * 100 : 50,
      y: this.normY(hist, h.topWeight),
      label: h.date.slice(5),
      v: h.topWeight,
      date: h.date,
    }));

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

    // diffFirst: 起点到当前 PR 的差
    const diffFirst = n >= 2 ? Math.round((hist[n - 1].topWeight - hist[0].topWeight) * 10) / 10 : 0;
    // diffPR: 当前 PR 与 6 个月前首条差（用于 "PR +Xkg" 标签）
    const diffPR = Math.round((prKg - (n ? hist[0].topWeight : 0)) * 10) / 10;

    this.setData({
      activeId: id,
      activeName: name,
      prKg,
      history: hist,
      chart,
      segments,
      diffFirst,
      diffPR,
    });
  },

  normY(hist: { topWeight: number }[], v: number): number {
    if (!hist.length) return 50;
    const vs = hist.map((h) => h.topWeight);
    const minV = Math.min(...vs);
    const maxV = Math.max(...vs);
    if (maxV === minV) return 40;
    // 上方留 20% 空白、下方 15%
    return 20 + ((maxV - v) / (maxV - minV)) * 65;
  },
});
