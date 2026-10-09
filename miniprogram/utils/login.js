const getOpenid = () => new Promise((resolve, reject) => {
  wx.cloud.callFunction({ name: 'login', data: { action: 'openid' } }).then(res => {
    resolve(res.result && res.result.openid ? res.result.openid : '')
  }).catch(err => reject(err))
})

const ensureLogin = () => new Promise((resolve, reject) => {
  const app = getApp()
  if (app.globalData.userInfo) {
    resolve(app.globalData.userInfo)
    return
  }
  const cached = wx.getStorageSync('userInfo')
  if (cached && cached._openid) {
    app.globalData.userInfo = cached
    app.globalData.openid = cached._openid
    resolve(cached)
    return
  }
  wx.cloud.callFunction({ name: 'login', data: { action: 'getInfo' } }).then(res => {
    const r = res.result
    if (r && r.ok && r.user) {
      app.globalData.userInfo = r.user
      app.globalData.openid = r.user._openid
      wx.setStorageSync('userInfo', r.user)
      resolve(r.user)
    } else {
      reject({ needLogin: true })
    }
  }).catch(err => reject(err))
})

const requireLogin = () => new Promise((resolve, reject) => {
  ensureLogin().then(user => resolve(user)).catch(() => {
    wx.navigateTo({ url: '/pages/login/login' })
    reject({ needLogin: true })
  })
})

const setUser = user => {
  const app = getApp()
  app.globalData.userInfo = user
  app.globalData.openid = user._openid
  wx.setStorageSync('userInfo', user)
}

const clearUser = () => {
  const app = getApp()
  app.globalData.userInfo = null
  app.globalData.openid = ''
  wx.removeStorageSync('userInfo')
}

const bootstrap = () => {
  const cached = wx.getStorageSync('userInfo')
  if (cached && cached._openid) {
    const app = getApp()
    app.globalData.userInfo = cached
    app.globalData.openid = cached._openid
  }
}

module.exports = { getOpenid, ensureLogin, requireLogin, setUser, clearUser, bootstrap }
