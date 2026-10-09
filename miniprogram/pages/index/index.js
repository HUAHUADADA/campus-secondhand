const util = require('../../utils/util.js')
const login = require('../../utils/login.js')

const CATEGORIES = [
  { name: '全部', key: '' },
  { name: '教材书籍', key: 'book' },
  { name: '数码电器', key: 'digital' },
  { name: '生活用品', key: 'daily' },
  { name: '运动户外', key: 'sports' },
  { name: '美妆服饰', key: 'fashion' },
  { name: '乐器', key: 'music' },
  { name: '其他', key: 'other' }
]

Page({
  data: {
    categories: CATEGORIES,
    activeKey: '',
    keyword: '',
    goodsList: [],
    page: 0,
    size: 10,
    hasMore: true,
    loading: false,
    firstLoad: true
  },

  onLoad() {
    this.loadList(true)
  },

  onShow() {
    if (!this.data.firstLoad) {
      this.loadList(true)
    }
    this.refreshUnread()
  },

  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadList(false)
    }
  },

  onCategoryTap(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ activeKey: key })
    this.loadList(true)
  },

  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  onGoodsTap(e) {
    wx.navigateTo({ url: '/pages/goods/detail?id=' + e.currentTarget.dataset.id })
  },

  onPublishTap() {
    login.requireLogin().then(() => {
      wx.navigateTo({ url: '/pages/publish/publish' })
    })
  },

  refreshUnread() {
    if (!wx.getStorageSync('userInfo')) return
    util.call('chat', { action: 'unreadCount' }).then(res => {
      const n = (res && res.count) || 0
      if (n > 0) {
        wx.setTabBarBadge({ index: 1, text: String(n > 99 ? '99+' : n) })
      } else {
        wx.removeTabBarBadge({ index: 1 })
      }
    }).catch(() => {})
  },

  loadList(reset) {
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true })
    const page = reset ? 0 : this.data.page
    return util.call('goods', {
      action: 'list',
      category: this.data.activeKey,
      keyword: this.data.keyword,
      page,
      size: this.data.size
    }).then(res => {
      const list = (res && res.list) || []
      const formatted = list.map(g => Object.assign({}, g, {
        priceText: util.price(g.price),
        timeText: util.timeAgo(g.createTime),
        statusText: util.statusText(g.status)
      }))
      this.setData({
        goodsList: reset ? formatted : this.data.goodsList.concat(formatted),
        page: page + 1,
        hasMore: (res && res.hasMore) || false,
        loading: false,
        firstLoad: false
      })
    }).catch(() => {
      this.setData({ loading: false, firstLoad: false })
    })
  }
})
