import { giLevel } from '../../services/nutrition';

const LABEL: Record<string, string> = {
  low: '低GI',
  mid: '中GI',
  high: '高GI',
  none: '暂无数据',
};

/**
 * gi-badge 三色徽章
 * prop: gi number|null → 自动分级着色
 */
Component({
  properties: {
    gi: { type: null, value: null }, // number | null
  },
  data: {
    cls: 'gb-none',
    label: LABEL.none,
  },
  observers: {
    gi(this: WechatMiniprogram.Component.TrivialInstance, v: number | null) {
      const lv = giLevel(v == null || (v as number) < 0 ? null : Number(v));
      const key = lv ?? 'none';
      this.setData({ cls: `gb-${key}`, label: `${LABEL[key]}${v != null && v >= 0 ? ' ' + v : ''}` });
    },
  },
});
