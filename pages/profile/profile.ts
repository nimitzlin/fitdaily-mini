import { foodsUserAll, profileGet, visionCfgGet, visionKeyGet } from '../../services/storage';
import { UserProfile } from '../../services/types';

Page({
  data: {
    profile: null as UserProfile | null,
    visionReady: false,
  },

  onShow() {
    const cfg = visionCfgGet();
    this.setData({
      profile: profileGet(),
      visionReady: !!(cfg && visionKeyGet()),
    });
    // 静默消费 lint：展示库内数量
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
});
