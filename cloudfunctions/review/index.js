const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  if (action === 'create') {
    const orderId = event.orderId
    const star = Number(event.star || 0)
    const content = String(event.content || '').trim()
    if (!orderId) return { ok: false, msg: '缺少订单' }
    if (star < 1 || star > 5) return { ok: false, msg: '请选择星级' }
    if (!content) return { ok: false, msg: '评价内容不能为空' }
    let order
    try {
      const res = await db.collection('orders').doc(orderId).get()
      order = res.data
    } catch (e) {
      return { ok: false, msg: '订单不存在' }
    }
    if (order.status !== 'completed') return { ok: false, msg: '仅成交后可评价' }
    if (order.buyerOpenid !== OPENID && order.sellerOpenid !== OPENID) return { ok: false, msg: '无权评价' }
    const exists = await db.collection('reviews').where({ orderId, fromOpenid: OPENID }).limit(1).get()
    if (exists.data.length) return { ok: false, msg: '已评价过' }
    const toOpenid = order.buyerOpenid === OPENID ? order.sellerOpenid : order.buyerOpenid
    const now = new Date()
    await db.collection('reviews').add({
      data: {
        _openid: OPENID,
        orderId,
        goodsId: order.goodsId,
        goodsTitle: order.goodsTitle,
        fromOpenid: OPENID,
        toOpenid,
        star,
        content,
        createTime: now
      }
    })
    await db.collection('orders').doc(orderId).update({
      data: { reviewed: true, updateTime: now }
    })
    return { ok: true }
  }

  if (action === 'listMine') {
    const res = await db.collection('reviews').where({ fromOpenid: OPENID }).orderBy('createTime', 'desc').limit(100).get()
    return { ok: true, list: res.data }
  }

  if (action === 'listForUser') {
    const targetOpenid = event.openid || OPENID
    const res = await db.collection('reviews').where({ toOpenid: targetOpenid }).orderBy('createTime', 'desc').limit(100).get()
    return { ok: true, list: res.data }
  }

  return { ok: false, msg: '未知操作' }
}
