const util = require('../../utils/util.js')
const login = require('../../utils/login.js')

Page({
  data: {
    user: null,
    logged: false
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    login.ensureLogin().then(user => {
      this.setData({ user, logged: true })
    }).catch(() => {
      this.setData({ user: null, logged: false })
    })
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onSignIn() {
    util.call('login', { action: 'signIn' }).then(res => {
      if (res && res.ok) {
        wx.showToast({ title: '签到成功 +5积分', icon: 'none' })
        this.setData({ user: res.user })
        login.setUser(res.user)
      } else {
        wx.showToast({ title: (res && res.msg) || '今天已签到', icon: 'none' })
      }
    })
  },

  go(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新输入学号登录',
      success: res => {
        if (res.confirm) {
          login.clearUser()
          this.setData({ user: null, logged: false })
        }
      }
    })
  }
})
