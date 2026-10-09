const util = require('../../utils/util.js')

Page({
  data: {
    convId: '',
    goods: null,
    order: null,
    me: '',
    isBuyer: false,
    isSeller: false,
    messages: [],
    lastMsgId: '',
    input: '',
    sending: false,
    loading: true
  },

  onLoad(options) {
    this.setData({
      convId: options.convId,
      me: getApp().globalData.openid || (wx.getStorageSync('userInfo') || {})._openid || ''
    })
    this.loadAll()
    this.startPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onShow() {
    if (this.data.convId && !this.polling) {
      this.loadAll()
      this.startPolling()
    }
  },

  startPolling() {
    this.stopPolling()
    this.polling = setInterval(() => {
      this.loadMessages(false)
    }, 3000)
  },

  stopPolling() {
    if (this.polling) {
      clearInterval(this.polling)
      this.polling = null
    }
  },

  loadAll() {
    this.loadConv()
    this.loadMessages(true)
  },

  loadConv() {
    return util.call('chat', { action: 'convDetail', convId: this.data.convId }).then(res => {
      if (!res || !res.conv) return
      const conv = res.conv
      const me = this.data.me
      this.setData({
        goods: res.goods ? Object.assign({}, res.goods, {
          priceText: util.price(res.goods.price),
          statusText: util.statusText(res.goods.status)
        }) : null,
        order: res.order || null,
        isBuyer: conv.buyerOpenid === me,
        isSeller: conv.sellerOpenid === me,
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  },

  loadMessages(silent) {
    return util.call('chat', { action: 'listMessages', convId: this.data.convId }).then(res => {
      const list = (res && res.list) || []
      const formatted = list.map(m => Object.assign({}, m, {
        mine: m.fromOpenid === this.data.me,
        timeText: util.formatTime(m.createTime).slice(5, 16)
      }))
      this.setData({
        messages: formatted,
        lastMsgId: formatted.length ? 'msg-' + formatted[formatted.length - 1]._id : ''
      })
    }).catch(() => {})
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  onSend() {
    const content = (this.data.input || '').trim()
    if (!content || this.data.sending) return
    this.setData({ sending: true, input: '' })
    util.call('chat', { action: 'send', convId: this.data.convId, content }).then(res => {
      this.setData({ sending: false })
      if (res && res.ok) {
        this.loadMessages(true)
        this.loadConv()
      } else {
        wx.showToast({ title: (res && res.msg) || '发送失败', icon: 'none' })
        this.setData({ input: content })
      }
    }).catch(() => {
      this.setData({ sending: false })
      this.setData({ input: content })
      wx.showToast({ title: '网络异常', icon: 'none' })
    })
  },

  onGoodsTap() {
    if (this.data.goods && this.data.goods._id) {
      wx.navigateTo({ url: '/pages/goods/detail?id=' + this.data.goods._id })
    }
  },

  onConfirm() {
    if (!this.data.order) return
    wx.showModal({
      title: '确认线下交易完成',
      content: '请确认你们已经在线下完成当面交易。双方都确认后，商品将标记为已成交并下架。',
      success: res => {
        if (res.confirm) {
          util.call('order', { action: 'confirm', convId: this.data.convId }).then(r => {
            wx.showToast({ title: (r && r.ok) ? '已确认' : ((r && r.msg) || '操作失败'), icon: 'none' })
            this.loadConv()
          })
        }
      }
    })
  },

  onCancelOrder() {
    wx.showModal({
      title: '取消交易',
      content: '取消后本次交易关闭，商品仍挂在出售中，确定取消吗？',
      success: res => {
        if (res.confirm) {
          util.call('order', { action: 'cancel', convId: this.data.convId }).then(r => {
            wx.showToast({ title: (r && r.ok) ? '已取消' : ((r && r.msg) || '操作失败'), icon: 'none' })
            this.loadConv()
          })
        }
      }
    })
  },

  onReview() {
    if (this.data.order && this.data.order._id) {
      wx.navigateTo({ url: '/pages/reviews/reviews?orderId=' + this.data.order._id })
    }
  }
})
