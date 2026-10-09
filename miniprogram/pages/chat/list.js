const util = require('../../utils/util.js')
const login = require('../../utils/login.js')

Page({
  data: {
    convList: [],
    loading: true
  },

  onShow() {
    login.ensureLogin().then(() => {
      this.load()
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    return util.call('chat', { action: 'listConvs' }).then(res => {
      const list = (res && res.list) || []
      const me = getApp().globalData.openid
      const formatted = list.map(c => {
        const isBuyer = c.buyerOpenid === me
        const unread = isBuyer ? (c.buyerUnread || 0) : (c.sellerUnread || 0)
        const otherName = isBuyer ? (c.sellerName || '卖家') : (c.buyerName || '买家')
        return Object.assign({}, c, {
          otherName,
          unread,
          timeText: util.timeAgo(c.lastTime),
          goodsTitle: c.goodsTitle || ''
        })
      })
      this.setData({ convList: formatted, loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  onConvTap(e) {
    const conv = e.currentTarget.dataset.conv
    if (conv && conv._id) {
      wx.navigateTo({ url: '/pages/chat/detail?convId=' + conv._id })
    }
  }
})
