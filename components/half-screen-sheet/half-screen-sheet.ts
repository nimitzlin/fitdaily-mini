/**
 * half-screen-sheet 半屏弹层（录入方式三选一）
 * prop: show；事件: close, choose(detail.type = photo|search|custom)
 */
Component({
  properties: {
    show: { type: Boolean, value: false },
  },
  methods: {
    onClose() {
      this.triggerEvent('close');
    },
    onChoose(e: WechatMiniprogram.TouchEvent) {
      const type = (e.currentTarget.dataset.type as string) || '';
      this.triggerEvent('choose', { type });
    },
    noop() {},
  },
});
