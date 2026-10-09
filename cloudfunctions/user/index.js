const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  if (action === 'getProfile') {
    const res = await db.collection('users').where({ _openid: OPENID }).limit(1).get()
    if (!res.data.length) return { ok: false, msg: '未注册' }
    return { ok: true, user: res.data[0] }
  }

  if (action === 'updateProfile') {
    const res = await db.collection('users').where({ _openid: OPENID }).limit(1).get()
    if (!res.data.length) return { ok: false, msg: '未注册' }
    const user = res.data[0]
    const data = {}
    if (event.nickname !== undefined) data.nickname = String(event.nickname).trim() || user.name
    if (event.avatar !== undefined) data.avatar = event.avatar
    data.updateTime = new Date()
    await db.collection('users').doc(user._id).update({ data })
    return { ok: true }
  }

  if (action === 'myCounts') {
    const [goods, favorites, orders, reviews] = await Promise.all([
      db.collection('goods').where({ _openid: OPENID }).count(),
      db.collection('favorites').where({ _openid: OPENID }).count(),
      db.collection('orders').where(_.or([{ buyerOpenid: OPENID }, { sellerOpenid: OPENID }])).count(),
      db.collection('reviews').where({ fromOpenid: OPENID }).count()
    ])
    return { ok: true, counts: { goods: goods.total, favorites: favorites.total, orders: orders.total, reviews: reviews.total } }
  }

  return { ok: false, msg: '未知操作' }
}
