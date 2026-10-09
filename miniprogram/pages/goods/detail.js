const util = require('../../utils/util.js')
const login = require('../../utils/login.js')

Page({
  data: {
    id: '',
    goods: null,
    liked: false,
    isMine: false,
    loading: true
  },

  onLoad(options) {
    this.setData({ id: options.id })
    this.load()
  },

  onShow() {
    if (this.data.id && !this.data.loading) {
      this.load()
    }
  },

  load() {
    return util.call('goods', { action: 'detail', id: this.data.id }).then(res => {
      if (!res || !res.goods) {
        this.setData({ loading: false })
        wx.showToast({ title: '商品不存在或已下架', icon: 'none' })
        return
      }
      const g = res.goods
      this.setData({
        goods: Object.assign({}, g, {
          priceText: util.price(g.price),
          timeText: util.timeAgo(g.createTime),
          statusText: util.statusText(g.status),
          cover: g.images && g.images.length ? g.images[0] : '',
          images: g.images && g.images.length ? g.images : ['']
        }),
        liked: !!res.liked,
        isMine: !!res.isMine,
        loading: false
      })
    }).catch(() => this.setData({ loading: false }))
  },

  onPreview(e) {
    const idx = e.currentTarget.dataset.index
    const urls = this.data.goods.images.filter(u => u)
    if (urls.length) wx.previewImage({ current: urls[idx] || urls[0], urls })
  },

  onLikeTap() {
    login.requireLogin().then(() => {
      const action = this.data.liked ? 'remove' : 'add'
      util.call('favorite', { action, goodsId: this.data.id }).then(res => {
        if (res && res.ok) {
          this.setData({ liked: !this.data.liked })
          wx.showToast({ title: this.data.liked ? '已收藏' : '已取消收藏', icon: 'none' })
        } else {
          wx.showToast({ title: (res && res.msg) || '操作失败', icon: 'none' })
        }
      })
    })
  },

  onContact() {
    login.requireLogin().then(user => {
      if (this.data.isMine) {
        wx.showToast({ title: '这是你发布的商品', icon: 'none' })
        return
      }
      wx.showLoading({ title: '创建会话…' })
      util.call('chat', { action: 'getOrCreateConv', goodsId: this.data.id }).then(res => {
        wx.hideLoading()
        if (res && res.ok && res.convId) {
          wx.navigateTo({ url: '/pages/chat/detail?convId=' + res.convId + '&goodsId=' + this.data.id })
        } else {
          wx.showToast({ title: (res && res.msg) || '创建会话失败', icon: 'none' })
        }
      }).catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '网络异常，请重试', icon: 'none' })
      })
    })
  },

  onSellerTap() {
    wx.showModal({
      title: '卖家信息',
      content: '昵称：' + (this.data.goods.sellerName || '未填写') + '\n学号：' + (this.data.goods.sellerStudentNo || '未填写') + '\n请通过站内聊天联系卖家，线下当面交易',
      showCancel: false
    })
  },

  onReport() {
    wx.navigateTo({ url: '/pages/report/report?targetType=goods&targetId=' + this.data.id })
  },

  onManage() {
    wx.navigateTo({ url: '/pages/my-goods/my-goods' })
  },

  onOff() {
    wx.showModal({
      title: '确认下架',
      content: '下架后商品不再展示，不算交易完成，确定下架吗？',
      success: res => {
        if (res.confirm) {
          util.call('goods', { action: 'off', id: this.data.id }).then(r => {
            wx.showToast({ title: (r && r.ok) ? '已下架' : ((r && r.msg) || '操作失败'), icon: 'none' })
            this.load()
          })
        }
      }
    })
  }
})
