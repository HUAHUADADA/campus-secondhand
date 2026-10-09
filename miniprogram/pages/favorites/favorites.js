const util = require('../../utils/util.js')
const login = require('../../utils/login.js')

Page({
  data: {
    goodsList: [],
    loading: true
  },

  onShow() {
    login.ensureLogin().then(() => {
      this.load()
    }).catch(() => this.setData({ loading: false }))
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    return util.call('favorite', { action: 'list' }).then(res => {
      const list = (res && res.list) || []
      const formatted = list.map(g => Object.assign({}, g, {
        priceText: util.price(g.price),
        timeText: util.timeAgo(g.createTime),
        statusText: util.statusText(g.status)
      }))
      this.setData({ goodsList: formatted, loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  onGoodsTap(e) {
    wx.navigateTo({ url: '/pages/goods/detail?id=' + e.currentTarget.dataset.id })
  },

  onRemove(e) {
    const id = e.currentTarget.dataset.id
    util.call('favorite', { action: 'remove', goodsId: id }).then(res => {
      if (res && res.ok) this.load()
    })
  }
})
