const util = require('../../utils/util.js')
const login = require('../../utils/login.js')

const FALLBACK = [
  { key: 'book', name: '教材书籍' },
  { key: 'digital', name: '数码电器' },
  { key: 'daily', name: '生活用品' },
  { key: 'sports', name: '运动户外' },
  { key: 'fashion', name: '美妆服饰' },
  { key: 'music', name: '乐器' },
  { key: 'other', name: '其他' }
]

Page({
  data: {
    categories: FALLBACK,
    cateIndex: 0,
    title: '',
    price: '',
    desc: '',
    bookName: '',
    isbn: '',
    images: [],
    top: false,
    uploading: false,
    points: 0
  },

  onLoad() {
    login.requireLogin().then(user => {
      this.setData({ points: user.points || 0 })
    })
    util.call('goods', { action: 'getCategories' }).then(res => {
      if (res && res.list && res.list.length) {
        this.setData({ categories: res.list })
      }
    }).catch(() => {})
  },

  onTitle(e) {
    this.setData({ title: e.detail.value })
  },

  onPrice(e) {
    this.setData({ price: e.detail.value })
  },

  onDesc(e) {
    this.setData({ desc: e.detail.value })
  },

  onBookName(e) {
    this.setData({ bookName: e.detail.value })
  },

  onIsbn(e) {
    this.setData({ isbn: e.detail.value })
  },

  onCateChange(e) {
    this.setData({ cateIndex: Number(e.detail.value) })
  },

  onTopChange(e) {
    this.setData({ top: e.detail.value })
  },

  onChooseImage() {
    if (this.data.uploading) return
    const remain = 6 - this.data.images.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传6张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: res => {
        const files = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ uploading: true })
        wx.showLoading({ title: '上传中…' })
        const tasks = files.map(file => wx.cloud.uploadFile({
          cloudPath: 'goods/' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '.jpg',
          filePath: file
        }))
        Promise.all(tasks).then(results => {
          const urls = results.map(r => r.fileID)
          this.setData({ images: this.data.images.concat(urls), uploading: false })
          wx.hideLoading()
        }).catch(() => {
          this.setData({ uploading: false })
          wx.hideLoading()
          wx.showToast({ title: '上传失败', icon: 'none' })
        })
      }
    })
  },

  onRemoveImage(e) {
    const idx = e.currentTarget.dataset.index
    const images = this.data.images.slice()
    images.splice(idx, 1)
    this.setData({ images })
  },

  onPreview(e) {
    const idx = e.currentTarget.dataset.index
    wx.previewImage({ current: this.data.images[idx], urls: this.data.images })
  },

  onSubmit() {
    if (!this.data.title.trim()) return wx.showToast({ title: '请填写标题', icon: 'none' })
    if (!this.data.price || Number(this.data.price) < 0) return wx.showToast({ title: '请填写正确价格', icon: 'none' })
    if (!this.data.images.length) return wx.showToast({ title: '请至少上传一张图片', icon: 'none' })
    if (this.data.categories[this.data.cateIndex].key === 'book' && this.data.isbn && !/^[0-9Xx-]{10,17}$/.test(this.data.isbn)) {
      return wx.showToast({ title: 'ISBN格式不正确', icon: 'none' })
    }
    const category = this.data.categories[this.data.cateIndex]
    wx.showLoading({ title: '发布中…' })
    util.call('goods', {
      action: 'publish',
      title: this.data.title.trim(),
      price: Number(this.data.price),
      desc: this.data.desc.trim(),
      category: category.key,
      categoryName: category.name,
      bookName: this.data.bookName.trim(),
      isbn: this.data.isbn.trim(),
      images: this.data.images,
      top: this.data.top
    }).then(res => {
      wx.hideLoading()
      if (res && res.ok) {
        wx.showToast({ title: '发布成功，等待审核', icon: 'success' })
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1200)
      } else {
        wx.showModal({ title: '发布失败', content: (res && res.msg) || '请重试', showCancel: false })
      }
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    })
  }
})
