const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const isMember = (conv, openid) => conv.buyerOpenid === openid || conv.sellerOpenid === openid

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  if (action === 'getOrCreateConv') {
    const goodsId = event.goodsId
    if (!goodsId) return { ok: false, msg: '缺少商品' }
    let goods
    try {
      const res = await db.collection('goods').doc(goodsId).get()
      goods = res.data
    } catch (e) {
      return { ok: false, msg: '商品不存在' }
    }
    if (goods.status !== 'on') return { ok: false, msg: '商品当前不可交易' }
    if (goods._openid === OPENID) return { ok: false, msg: '不能和自己交易' }
    const sellerOpenid = goods._openid
    const buyerOpenid = OPENID
    let conv
    const exists = await db.collection('conversations').where({ goodsId, buyerOpenid, sellerOpenid }).limit(1).get()
    if (exists.data.length) {
      conv = exists.data[0]
    } else {
      const now = new Date()
      const convData = {
        _openid: OPENID,
        goodsId,
        goodsTitle: goods.title,
        buyerOpenid,
        sellerOpenid,
        buyerName: '',
        sellerName: goods.sellerName || '卖家',
        lastMessage: '',
        lastTime: now,
        buyerUnread: 0,
        sellerUnread: 0,
        createTime: now
      }
      const addRes = await db.collection('conversations').add({ data: convData })
      conv = Object.assign({}, convData, { _id: addRes._id })
      const buyer = await db.collection('users').where({ _openid: buyerOpenid }).limit(1).get()
      if (buyer.data.length) {
        await db.collection('conversations').doc(conv._id).update({
          data: { buyerName: buyer.data[0].nickname || buyer.data[0].name }
        })
        conv.buyerName = buyer.data[0].nickname || buyer.data[0].name
      }
      await db.collection('orders').add({
        data: {
          _openid: OPENID,
          convId: conv._id,
          goodsId,
          goodsTitle: goods.title,
          price: goods.price,
          buyerOpenid,
          sellerOpenid,
          status: 'ongoing',
          sellerConfirmed: false,
          buyerConfirmed: false,
          createTime: now
        }
      })
    }
    return { ok: true, convId: conv._id }
  }

  if (action === 'listConvs') {
    const res = await db.collection('conversations')
      .where(_.or([{ buyerOpenid: OPENID }, { sellerOpenid: OPENID }]))
      .orderBy('lastTime', 'desc')
      .limit(100)
      .get()
    return { ok: true, list: res.data }
  }

  if (action === 'convDetail') {
    const convId = event.convId
    if (!convId) return { ok: false, msg: '缺少会话' }
    let conv
    try {
      const res = await db.collection('conversations').doc(convId).get()
      conv = res.data
    } catch (e) {
      return { ok: false, msg: '会话不存在' }
    }
    if (!isMember(conv, OPENID)) return { ok: false, msg: '无权访问' }
    let goods = null
    try {
      const g = await db.collection('goods').doc(conv.goodsId).get()
      goods = g.data
    } catch (e) {}
    let order = null
    try {
      const o = await db.collection('orders').where({ convId }).limit(1).get()
      order = o.data.length ? o.data[0] : null
    } catch (e) {}
    const meIsBuyer = conv.buyerOpenid === OPENID
    await db.collection('conversations').doc(convId).update({
      data: meIsBuyer ? { buyerUnread: 0 } : { sellerUnread: 0 }
    })
    return { ok: true, conv, goods, order }
  }

  if (action === 'listMessages') {
    const convId = event.convId
    if (!convId) return { ok: false, msg: '缺少会话' }
    const res = await db.collection('messages').where({ convId }).orderBy('createTime', 'asc').limit(200).get()
    return { ok: true, list: res.data }
  }

  if (action === 'send') {
    const convId = event.convId
    const content = String(event.content || '').trim()
    if (!convId || !content) return { ok: false, msg: '消息不能为空' }
    if (content.length > 500) return { ok: false, msg: '消息过长' }
    let conv
    try {
      const res = await db.collection('conversations').doc(convId).get()
      conv = res.data
    } catch (e) {
      return { ok: false, msg: '会话不存在' }
    }
    if (!isMember(conv, OPENID)) return { ok: false, msg: '无权访问' }
    const now = new Date()
    await db.collection('messages').add({
      data: { _openid: OPENID, convId, fromOpenid: OPENID, content, read: false, createTime: now }
    })
    const meIsBuyer = conv.buyerOpenid === OPENID
    const update = { lastMessage: content, lastTime: now }
    if (meIsBuyer) {
      update.sellerUnread = _.inc(1)
    } else {
      update.buyerUnread = _.inc(1)
    }
    await db.collection('conversations').doc(convId).update({ data: update })
    return { ok: true }
  }

  if (action === 'unreadCount') {
    const convs = await db.collection('conversations')
      .where(_.or([{ buyerOpenid: OPENID }, { sellerOpenid: OPENID }]))
      .field({ buyerUnread: true, sellerUnread: true, buyerOpenid: true, sellerOpenid: true })
      .get()
    let count = 0
    convs.data.forEach(c => {
      if (c.buyerOpenid === OPENID) count += c.buyerUnread || 0
      if (c.sellerOpenid === OPENID) count += c.sellerUnread || 0
    })
    return { ok: true, count }
  }

  return { ok: false, msg: '未知操作' }
}
