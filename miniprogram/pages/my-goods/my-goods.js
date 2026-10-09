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
    return util.call('goods', { action: 'my' }).then(res => {
      const list = (res && res.list) || []
      const formatted = list.map(g => Object.assign({}, g, {
        priceText: util.price(g.price),
        timeText: util.timeAgo(g.createTime),
        statusText: util.statusText(g.status)
      }))
      this.setData({ goodsList: formatted, loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  onDetail(e) {
    wx.navigateTo({ url: '/pages/goods/detail?id=' + e.currentTarget.dataset.id })
  },

  onReapply(e) {
    const id = e.currentTarget.dataset.id
    util.call('goods', { action: 'reapply', id }).then(res => {
      wx.showToast({ title: (res && res.ok) ? '已提交审核' : ((res && res.msg) || '操作失败'), icon: 'none' })
      this.load()
    })
  },

  onOff(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认下架',
      content: '下架后商品不再展示，不算交易完成，确定下架吗？',
      success: res => {
        if (res.confirm) {
          util.call('goods', { action: 'off', id }).then(r => {
            wx.showToast({ title: (r && r.ok) ? '已下架' : ((r && r.msg) || '操作失败'), icon: 'none' })
            this.load()
          })
        }
      }
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除吗？',
      success: res => {
        if (res.confirm) {
          util.call('goods', { action: 'delete', id }).then(r => {
            wx.showToast({ title: (r && r.ok) ? '已删除' : ((r && r.msg) || '操作失败'), icon: 'none' })
            this.load()
          })
        }
      }
    })
  }
})
