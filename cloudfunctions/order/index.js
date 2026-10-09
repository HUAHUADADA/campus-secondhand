const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const getOrderByConv = async convId => {
  const res = await db.collection('orders').where({ convId }).limit(1).get()
  return res.data.length ? res.data[0] : null
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  if (action === 'confirm') {
    const convId = event.convId
    const order = await getOrderByConv(convId)
    if (!order) return { ok: false, msg: '交易不存在' }
    if (order.status !== 'ongoing') return { ok: false, msg: '当前状态不可确认' }
    const data = {}
    if (order.buyerOpenid === OPENID) {
      data.buyerConfirmed = true
    } else if (order.sellerOpenid === OPENID) {
      data.sellerConfirmed = true
    } else {
      return { ok: false, msg: '无权操作' }
    }
    data.updateTime = new Date()
    const both = (order.sellerConfirmed || data.sellerConfirmed) && (order.buyerConfirmed || data.buyerConfirmed)
    if (both) {
      data.status = 'completed'
      data.completedTime = new Date()
      await db.collection('goods').doc(order.goodsId).update({ data: { status: 'sold', updateTime: new Date() } })
      await db.collection('conversations').doc(convId).update({
        data: { lastMessage: '交易已完成', lastTime: new Date() }
      })
    }
    await db.collection('orders').doc(order._id).update({ data })
    return { ok: true, completed: both }
  }

  if (action === 'cancel') {
    const convId = event.convId
    const order = await getOrderByConv(convId)
    if (!order) return { ok: false, msg: '交易不存在' }
    if (order.status !== 'ongoing') return { ok: false, msg: '当前状态不可取消' }
    if (order.buyerOpenid !== OPENID && order.sellerOpenid !== OPENID) return { ok: false, msg: '无权操作' }
    if (order.sellerConfirmed || order.buyerConfirmed) return { ok: false, msg: '已有确认记录，需双方协商' }
    await db.collection('orders').doc(order._id).update({
      data: { status: 'cancelled', cancelTime: new Date(), updateTime: new Date() }
    })
    return { ok: true }
  }

  if (action === 'list') {
    const status = event.status
    const member = _.or([{ buyerOpenid: OPENID }, { sellerOpenid: OPENID }])
    const where = status ? _.and([member, { status }]) : member
    const res = await db.collection('orders').where(where).orderBy('createTime', 'desc').limit(100).get()
    return { ok: true, list: res.data }
  }

  if (action === 'detail') {
    let order = null
    if (event.orderId) {
      const res = await db.collection('orders').doc(event.orderId).get()
      order = res.data
    } else if (event.convId) {
      order = await getOrderByConv(event.convId)
    }
    if (!order) return { ok: false, msg: '交易不存在' }
    if (order.buyerOpenid !== OPENID && order.sellerOpenid !== OPENID) return { ok: false, msg: '无权访问' }
    return { ok: true, order }
  }

  return { ok: false, msg: '未知操作' }
}
