const login = require('../../utils/login.js')

Page({
  data: {
    mode: 'login',
    submitting: false,
    showForgotModal: false,
    loginStudentNo: '',
    loginPassword: '',
    regStudentNo: '',
    regName: '',
    regPhone: '',
    regEmail: '',
    regPassword: ''
  },

  switchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  onLoginStudentNo(e) { this.setData({ loginStudentNo: e.detail.value }) },
  onLoginPassword(e) { this.setData({ loginPassword: e.detail.value }) },
  onRegStudentNo(e) { this.setData({ regStudentNo: e.detail.value }) },
  onRegName(e) { this.setData({ regName: e.detail.value }) },
  onRegPhone(e) { this.setData({ regPhone: e.detail.value }) },
  onRegEmail(e) { this.setData({ regEmail: e.detail.value }) },
  onRegPassword(e) { this.setData({ regPassword: e.detail.value }) },

  showForgot() { this.setData({ showForgotModal: true }) },
  hideForgot() { this.setData({ showForgotModal: false }) },

  onLogin() {
    if (this.data.submitting) return
    const { loginStudentNo, loginPassword } = this.data
    if (!loginStudentNo.trim()) return wx.showToast({ title: '请输入学号', icon: 'none' })
    if (!loginPassword) return wx.showToast({ title: '请输入密码', icon: 'none' })
    this.setData({ submitting: true })
    wx.showLoading({ title: '登录中…' })
    wx.cloud.callFunction({
      name: 'login',
      data: { action: 'login', studentNo: loginStudentNo.trim(), password: loginPassword }
    }).then(res => {
      wx.hideLoading()
      this.setData({ submitting: false })
      const r = res.result
      if (r && r.ok && r.user) {
        login.setUser(r.user)
        wx.showToast({ title: '登录成功', icon: 'none' })
        setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 800)
      } else {
        wx.showModal({ title: '登录失败', content: (r && r.msg) || '请重试', showCancel: false })
      }
    }).catch(() => {
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    })
  },

  onRegister() {
    if (this.data.submitting) return
    const { regStudentNo, regName, regPhone, regEmail, regPassword } = this.data
    if (!regStudentNo.trim()) return wx.showToast({ title: '请输入学号', icon: 'none' })
    if (!regName.trim()) return wx.showToast({ title: '请输入姓名', icon: 'none' })
    if (!regPhone.trim()) return wx.showToast({ title: '请输入手机号', icon: 'none' })
    if (!regEmail.trim()) return wx.showToast({ title: '请输入邮箱', icon: 'none' })
    if (!regPassword) return wx.showToast({ title: '请输入密码', icon: 'none' })
    this.setData({ submitting: true })
    wx.showLoading({ title: '注册中…' })
    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'register',
        studentNo: regStudentNo.trim(),
        name: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        password: regPassword
      }
    }).then(res => {
      wx.hideLoading()
      this.setData({ submitting: false })
      const r = res.result
      if (r && r.ok && r.user) {
        login.setUser(r.user)
        wx.showToast({ title: r.isNew ? '注册成功 +10积分' : '已登录', icon: 'none' })
        setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 1000)
      } else {
        wx.showModal({ title: '注册失败', content: (r && r.msg) || '请重试', showCancel: false })
      }
    }).catch(() => {
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    })
  }
})
