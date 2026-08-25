/**
 * nutrition-dashboard 每日营养看板
 * props: stats (DailyStats), profile (UserProfile)
 * GI 口径（PRD D2）：可消化碳水加权；≤55 低GI✅ / >55 关注血糖波动💡
 */
Component({
  properties: {
    stats: { type: Object, value: null },
    profile: { type: Object, value: null },
  },
  data: {
    giCls: '',
    giText: '',
    highGiText: '',
  },
  observers: {
    stats(s: { avgGi: number | null; hasAnyLog: boolean; highGiFoods: Array<{ name: string; gi: number }> }) {
      if (!s || !s.hasAnyLog) {
        this.setData({ giCls: '', giText: '', highGiText: '' });
        return;
      }
      if (s.avgGi == null) {
        this.setData({
          giCls: 'nd-gi-none',
          giText: '今日记录的食物暂无 GI 数据，可在编辑里补填',
          highGiText: '',
        });
        return;
      }
      if (s.avgGi <= 55) {
        this.setData({ giCls: 'nd-gi-good', giText: '低GI饮食 ✅ 参考表现很稳，继续保持', highGiText: '' });
      } else {
        this.setData({
          giCls: 'nd-gi-warn',
          giText: '关注血糖波动 💡 建议减少高GI食物占比',
          highGiText: (s.highGiFoods || []).map((f) => `${f.name}(${f.gi})`).join('、'),
        });
      }
    },
  },
});
