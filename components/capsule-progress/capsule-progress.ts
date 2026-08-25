/**
 * capsule-progress 胶囊进度条
 * props: value 已值, target 目标, showBubble 是否显示气泡(默认true), fill 可选填充色
 */
Component({
  properties: {
    value: { type: Number, value: 0 },
    target: { type: Number, value: 1 },
    showBubble: { type: Boolean, value: true },
  },
  data: {
    percent: 0,
    over: false,
  },
  observers: {
    'value, target'(this: WechatMiniprogram.Component.TrivialInstance, v: number, t: number) {
      const ratio = t > 0 ? (v / t) * 100 : 0;
      this.setData({
        percent: Math.min(100, Math.round(ratio)),
        over: ratio > 100,
      });
    },
  },
});
