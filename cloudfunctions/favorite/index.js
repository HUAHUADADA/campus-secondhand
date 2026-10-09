const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  if (action === 'add') {
    const goodsId = event.goodsId
    if (!goodsId) return { ok: false, msg: '缺少商品id' }
    const exists = await db.collection('favorites').where({ _openid: OPENID, goodsId }).limit(1).get()
    if (exists.data.length) return { ok: true, msg: '已收藏' }
    await db.collection('favorites').add({ data: { _openid: OPENID, goodsId, createTime: new Date() } })
    return { ok: true }
  }

  if (action === 'remove') {
    const goodsId = event.goodsId
    await db.collection('favorites').where({ _openid: OPENID, goodsId }).remove()
    return { ok: true }
  }

  if (action === 'check') {
    const goodsId = event.goodsId
    const res = await db.collection('favorites').where({ _openid: OPENID, goodsId }).limit(1).get()
    return { ok: true, liked: res.data.length > 0 }
  }

  if (action === 'list') {
    const favs = await db.collection('favorites').where({ _openid: OPENID }).orderBy('createTime', 'desc').get()
    const ids = favs.data.map(f => f.goodsId)
    if (!ids.length) return { ok: true, list: [] }
    const goods = []
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10)
      const res = await db.collection('goods').where({ _id: _.in(chunk) }).get()
      goods.push(...res.data)
    }
    const map = {}
    goods.forEach(g => { map[g._id] = g })
    const list = ids.filter(id => map[id]).map(id => {
      const g = map[id]
      return Object.assign({}, g, { cover: g.images && g.images.length ? g.images[0] : '' })
    })
    return { ok: true, list }
  }

  return { ok: false, msg: '未知操作' }
}
