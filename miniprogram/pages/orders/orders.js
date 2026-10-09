const util = require('../../utils/util.js')
const login = require('../../utils/login.js')

const TABS = [
  { key: '', name: '全部' },
  { key: 'ongoing', name: '进行中' },
  { key: 'completed', name: '已完成' },
  { key: 'cancelled', name: '已取消' }
]

Page({
  data: {
    tabs: TABS,
    active: '',
    orderList: [],
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

  onTabTap(e) {
    this.setData({ active: e.currentTarget.dataset.key })
    this.load()
  },

  load() {
    return util.call('order', { action: 'list', status: this.data.active }).then(res => {
      const list = (res && res.list) || []
      const me = getApp().globalData.openid
      const formatted = list.map(o => {
        const isBuyer = o.buyerOpenid === me
        const otherName = isBuyer ? (o.sellerName || '卖家') : (o.buyerName || '买家')
        const statusName = o.status === 'completed' ? '交易完成' : (o.status === 'cancelled' ? '已取消' : '进行中')
        return Object.assign({}, o, {
          otherName,
          roleName: isBuyer ? '我买' : '我卖',
          statusName,
          priceText: util.price(o.price),
          timeText: util.timeAgo(o.completedTime || o.createTime)
        })
      })
      this.setData({ orderList: formatted, loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  onOrderTap(e) {
    const convId = e.currentTarget.dataset.conv
    if (convId) wx.navigateTo({ url: '/pages/chat/detail?convId=' + convId })
  },

  onReview(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/reviews/reviews?orderId=' + id })
  }
})
