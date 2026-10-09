const util = require('../../utils/util.js')

Page({
  data: {
    keyword: '',
    isbn: '',
    goodsList: [],
    page: 0,
    size: 10,
    hasMore: true,
    loading: false,
    searched: false
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onIsbnInput(e) {
    this.setData({ isbn: e.detail.value })
  },

  onSearch() {
    this.setData({ page: 0, goodsList: [], hasMore: true })
    this.load(true)
  },

  onPullDownRefresh() {
    this.load(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.load(false)
    }
  },

  onGoodsTap(e) {
    wx.navigateTo({ url: '/pages/goods/detail?id=' + e.currentTarget.dataset.id })
  },

  load(reset) {
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true })
    const page = reset ? 0 : this.data.page
    return util.call('goods', {
      action: 'search',
      keyword: this.data.keyword,
      isbn: this.data.isbn,
      page,
      size: this.data.size
    }).then(res => {
      const list = (res && res.list) || []
      const formatted = list.map(g => Object.assign({}, g, {
        priceText: util.price(g.price),
        timeText: util.timeAgo(g.createTime)
      }))
      this.setData({
        goodsList: reset ? formatted : this.data.goodsList.concat(formatted),
        page: page + 1,
        hasMore: (res && res.hasMore) || false,
        loading: false,
        searched: true
      })
    }).catch(() => {
      this.setData({ loading: false, searched: true })
    })
  }
})
