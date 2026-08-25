import { PRESETS } from '../../services/vision';
import { visionCfgGet, visionCfgSet, visionKeyGet, visionKeySet } from '../../services/storage';
import { testConnection } from '../../services/vision';

Page({
  data: {
    presets: PRESETS,
    presetIndex: 0,
    baseUrl: PRESETS[0].baseUrl,
    model: PRESETS[0].defaultModel,
    keyMasked: '', // 展示用；真实 key 不回填输入框
    hasKey: false,
    showKey: false,
    keyInput: '', // 仅新输入时使用
    testing: false,
    testOk: null as boolean | null,
    testMsg: '',
  },

  onLoad() {
    const cfg = visionCfgGet();
    if (cfg) {
      const idx = PRESETS.findIndex((p) => p.id === cfg.preset);
      this.setData({
        presetIndex: idx >= 0 ? idx : 0,
        baseUrl: cfg.baseUrl,
        model: cfg.model,
        hasKey: !!visionKeyGet(),
        testOk: cfg.lastTestOk,
      });
    }
  },

  onPreset(e: WechatMiniprogram.PickerChange) {
    const i = Number(e.detail.value);
    this.setData({
      presetIndex: i,
      baseUrl: PRESETS[i].baseUrl,
      model: PRESETS[i].defaultModel,
    });
  },

  onUrl(e: WechatMiniprogram.Input) {
    // 改 URL 视为切到自定义，预设保持但 baseUrl 覆盖
    this.setData({ baseUrl: e.detail.value });
  },

  onModel(e: WechatMiniprogram.Input) {
    this.setData({ model: e.detail.value });
  },

  onKeyInput(e: WechatMiniprogram.Input) {
    this.setData({ keyInput: e.detail.value });
  },

  toggleShowKey() {
    this.setData({ showKey: !this.data.showKey });
  },

  async onTest() {
    const key = this.data.keyInput.trim() || '';
    if (!key && !this.data.hasKey) {
      wx.showToast({ title: '请先填 API Key', icon: 'none' });
      return;
    }
    const useKey = key || visionKeyGet();
    // 测试前先把当前配置落盘
    this.save(useKey);

    this.setData({ testing: true, testMsg: '' });
    const result = await testConnection(
      { baseUrl: this.data.baseUrl.trim(), model: this.data.model.trim() },
      useKey,
    );
    let msg: string;
    if (result.ok) {
      msg = '连接成功 ✅ 可以开始拍照识别了';
    } else if (result.status === 401) {
      msg = '连接失败：Key 无效或未授权（401），请检查 Key';
    } else if (result.status) {
      msg = `连接失败：服务返回 ${result.status}`;
    } else if (result.errMsg?.includes('url not in domain list')) {
      msg = '连接失败：域名不在小程序合法域名列表\n→ IDE 详情→本地设置 勾「不校验合法域名」\n→ 或 mp.weixin.qq.com 配置 request 合法域名';
    } else if (result.errMsg?.includes('timeout')) {
      msg = '连接失败：请求超时，请检查手机网络';
    } else if (result.errMsg?.includes('fail')) {
      msg = `连接失败：${result.errMsg}`;
    } else {
      msg = '连接失败：请检查网络 / Key / 站点选择';
    }
    this.setData({
      testing: false,
      testOk: result.ok,
      testMsg: msg,
    });
    // 回写测试结果
    const cfg = visionCfgGet();
    if (cfg) {
      cfg.lastTestOk = result.ok;
      visionCfgSet(cfg);
    }
  },

  save(finalKey?: string) {
    const preset = PRESETS[this.data.presetIndex];
    const newKey = (finalKey ?? this.data.keyInput).trim();
    if (newKey) {
      visionKeySet(newKey); // ★ 只进独立 vk 字段
      this.setData({ hasKey: true, keyInput: '', keyMasked: mask(newKey) });
    }
    visionCfgSet({
      preset: preset.id,
      baseUrl: this.data.baseUrl.trim() || preset.baseUrl,
      model: this.data.model.trim() || preset.defaultModel,
      lastTestOk: this.data.testOk,
    });
  },

  onSaveTap() {
    this.save();
    wx.showToast({ title: '已保存（仅存本机）', icon: 'none' });
  },
});

function mask(k: string): string {
  if (!k) return '';
  if (k.length <= 8) return '••••••••';
  return `${k.slice(0, 4)}••••••••${k.slice(-4)}`;
}
