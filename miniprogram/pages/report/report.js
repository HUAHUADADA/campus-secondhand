const util = require('../../utils/util.js')
const login = require('../../utils/login.js')

const REASONS = ['虚假描述', '违规商品', '诈骗行为', '恶意骚扰', '其他']

Page({
  data: {
    targetType: 'goods',
    targetId: '',
    reasons: REASONS,
    reasonIndex: 0,
    content: '',
    submitting: false
  },

  onLoad(options) {
    this.setData({
      targetType: options.targetType || 'goods',
      targetId: options.targetId || ''
    })
  },

  onReasonChange(e) {
    this.setData({ reasonIndex: Number(e.detail.value) })
  },

  onContent(e) {
    this.setData({ content: e.detail.value })
  },

  onSubmit() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    login.requireLogin().then(() => {
      util.call('report', {
        action: 'create',
        targetType: this.data.targetType,
        targetId: this.data.targetId,
        reason: this.data.reasons[this.data.reasonIndex],
        content: this.data.content.trim()
      }).then(res => {
        this.setData({ submitting: false })
        if (res && res.ok) {
          wx.showToast({ title: '举报成功，感谢反馈', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 1200)
        } else {
          wx.showToast({ title: (res && res.msg) || '举报失败', icon: 'none' })
        }
      }).catch(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '网络异常', icon: 'none' })
      })
    }).catch(() => {
      this.setData({ submitting: false })
    })
  }
})
