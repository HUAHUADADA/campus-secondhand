const cloud = require('wx-server-sdk')
const crypto = require('crypto')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const REGISTER_POINTS = 10
const SIGN_POINTS = 5
const PWD_SALT = 'campus_idle_2024'

const hashPwd = pwd => crypto.createHash('sha256').update(PWD_SALT + pwd).digest('hex')

const today = () => {
  const d = new Date()
  const p = n => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const getByOpenid = async openid => {
  const res = await db.collection('users').where({ _openid: openid }).limit(1).get()
  return res.data.length ? res.data[0] : null
}

const publicUser = u => {
  const { password, ...rest } = u
  return rest
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action || 'openid'

  if (action === 'openid') {
    return { ok: true, openid: OPENID }
  }

  if (action === 'login') {
    const studentNo = String(event.studentNo || '').trim()
    const password = String(event.password || '')
    if (!studentNo || !password) return { ok: false, msg: '学号和密码不能为空' }
    const res = await db.collection('users').where({ studentNo }).limit(1).get()
    if (!res.data.length) return { ok: false, msg: '学号不存在' }
    const user = res.data[0]
    if (user.password !== hashPwd(password)) return { ok: false, msg: '密码错误' }
    if (user.status === 'banned') return { ok: false, msg: '账号已被封禁' }
    if (user._openid !== OPENID) {
      await db.collection('users').doc(user._id).update({ data: { _openid: OPENID, updateTime: new Date() } })
    }
    return { ok: true, user: publicUser(user) }
  }

  if (action === 'register') {
    const studentNo = String(event.studentNo || '').trim()
    const name = String(event.name || '').trim()
    const password = String(event.password || '')
    const phone = String(event.phone || '').trim()
    const email = String(event.email || '').trim()
    if (!studentNo || !name || !password) return { ok: false, msg: '学号、姓名和密码必填' }
    if (password.length < 6) return { ok: false, msg: '密码至少 6 位' }
    if (!/^1\d{10}$/.test(phone)) return { ok: false, msg: '手机号格式不正确' }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, msg: '邮箱格式不正确' }
    const byNo = await db.collection('users').where({ studentNo }).limit(1).get()
    if (byNo.data.length) {
      return { ok: false, msg: '该学号已被注册，请直接登录' }
    }
    const oldBound = await getByOpenid(OPENID)
    if (oldBound && oldBound._id !== studentNo) {
      await db.collection('users').doc(oldBound._id).update({ data: { _openid: '', updateTime: new Date() } })
    }
    const now = new Date()
    const user = {
      _openid: OPENID,
      studentNo,
      name,
      nickname: name,
      phone,
      email,
      password: hashPwd(password),
      points: REGISTER_POINTS,
      status: 'normal',
      signInDate: '',
      role: 'user',
      createTime: now,
      updateTime: now
    }
    const addRes = await db.collection('users').add({ data: user })
    user._id = addRes._id
    return { ok: true, user: publicUser(user), isNew: true }
  }

  if (action === 'getInfo') {
    const user = await getByOpenid(OPENID)
    if (!user) return { ok: false, msg: '未登录' }
    return { ok: true, user: publicUser(user) }
  }

  if (action === 'signIn') {
    const user = await getByOpenid(OPENID)
    if (!user) return { ok: false, msg: '未登录' }
    const t = today()
    if (user.signInDate === t) return { ok: false, msg: '今天已签到' }
    const points = (user.points || 0) + SIGN_POINTS
    await db.collection('users').doc(user._id).update({
      data: { points, signInDate: t, updateTime: new Date() }
    })
    user.points = points
    user.signInDate = t
    return { ok: true, user: publicUser(user) }
  }

  if (action === 'updateProfile') {
    const user = await getByOpenid(OPENID)
    if (!user) return { ok: false, msg: '未登录' }
    const data = {}
    if (event.nickname !== undefined) data.nickname = String(event.nickname).trim() || user.name
    if (event.avatar !== undefined) data.avatar = event.avatar
    if (event.phone !== undefined) data.phone = String(event.phone).trim()
    if (event.email !== undefined) data.email = String(event.email).trim()
    data.updateTime = new Date()
    await db.collection('users').doc(user._id).update({ data })
    const fresh = await getByOpenid(OPENID)
    return { ok: true, user: publicUser(fresh) }
  }

  return { ok: false, msg: '未知操作' }
}
