const loginHelper = require('./utils/login.js')

App({
  globalData: {
    openid: '',
    userInfo: null,
    envId: ''
  },
  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({ title: '提示', content: '请使用 2.2.3 或以上基础库以使用云能力', showCancel: false })
      return
    }
    wx.cloud.init({
      env: 'cloud1-d9go1hek1ace0d89b',
      traceUser: true
    })
    loginHelper.bootstrap()
  }
})
