const util = require('../../utils/util.js')
const login = require('../../utils/login.js')

Page({
  data: {
    orderId: '',
    order: null,
    star: 5,
    content: '',
    list: [],
    submitting: false,
    mode: 'form'
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({ orderId: options.orderId, mode: 'form' })
      this.loadOrder()
    } else {
      this.setData({ mode: 'list' })
      login.ensureLogin().then(() => this.loadList())
    }
  },

  loadOrder() {
    util.call('order', { action: 'detail', convId: '', orderId: this.data.orderId }).then(res => {
      if (res && res.order) {
        const o = res.order
        this.setData({ order: Object.assign({}, o, { priceText: util.price(o.price) }) })
      }
    })
  },

  loadList() {
    util.call('review', { action: 'listMine' }).then(res => {
      const list = (res && res.list) || []
      const formatted = list.map(r => Object.assign({}, r, {
        timeText: util.timeAgo(r.createTime)
      }))
      this.setData({ list: formatted })
    })
  },

  onStar(e) {
    this.setData({ star: Number(e.currentTarget.dataset.star) })
  },

  onContent(e) {
    this.setData({ content: e.detail.value })
  },

  onSubmit() {
    if (this.data.submitting) return
    if (!this.data.content.trim()) return wx.showToast({ title: '请填写评价内容', icon: 'none' })
    this.setData({ submitting: true })
    util.call('review', {
      action: 'create',
      orderId: this.data.orderId,
      star: this.data.star,
      content: this.data.content.trim()
    }).then(res => {
      this.setData({ submitting: false })
      if (res && res.ok) {
        wx.showToast({ title: '评价成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1200)
      } else {
        wx.showToast({ title: (res && res.msg) || '评价失败', icon: 'none' })
      }
    }).catch(() => {
      this.setData({ submitting: false })
      wx.showToast({ title: '网络异常', icon: 'none' })
    })
  },

  onGoIndex() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
