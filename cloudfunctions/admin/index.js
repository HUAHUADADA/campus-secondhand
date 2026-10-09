const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ADMIN_KEY = 'admin123'

const getData = event => {
  if (event.httpMethod) {
    try {
      return JSON.parse(event.body || '{}')
    } catch (e) {
      return {}
    }
  }
  return event
}

const checkKey = data => {
  if (data.key !== ADMIN_KEY) {
    throw new Error('密钥错误')
  }
}

const dayStart = offset => {
  const d = new Date()
  d.setDate(d.getDate() + (offset || 0))
  d.setHours(0, 0, 0, 0)
  return d
}

const dayLabel = d => {
  const p = n => (n < 10 ? '0' + n : '' + n)
  return (d.getMonth() + 1) + '-' + p(d.getDate())
}

exports.main = async event => {
  const data = getData(event)
  const action = data.action

  try {
    checkKey(data)
  } catch (e) {
    return { ok: false, msg: e.message }
  }

  if (action === 'stats') {
    const [goodsTotal, goodsOn, goodsSold, goodsPending, goodsOff, usersTotal, ordersTotal, completedTotal] = await Promise.all([
      db.collection('goods').count(),
      db.collection('goods').where({ status: 'on' }).count(),
      db.collection('goods').where({ status: 'sold' }).count(),
      db.collection('goods').where({ status: 'pending' }).count(),
      db.collection('goods').where({ status: 'off' }).count(),
      db.collection('users').count(),
      db.collection('orders').count(),
      db.collection('orders').where({ status: 'completed' }).count()
    ])
    const goodsByStatus = [
      { name: '在售', value: goodsOn.total },
      { name: '待审核', value: goodsPending.total },
      { name: '已成交', value: goodsSold.total },
      { name: '已下架', value: goodsOff.total }
    ]
    const cats = await db.collection('goods').field({ categoryName: true }).limit(1000).get()
    const catMap = {}
    cats.data.forEach(g => {
      const k = g.categoryName || '其他'
      catMap[k] = (catMap[k] || 0) + 1
    })
    const categoryDist = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }))
    const trend = []
    for (let i = 6; i >= 0; i--) {
      const start = dayStart(-i)
      const end = dayStart(-i + 1)
      const [goods, orders] = await Promise.all([
        db.collection('goods').where({ createTime: _.gte(start).and(_.lt(end)) }).count(),
        db.collection('orders').where({ createTime: _.gte(start).and(_.lt(end)) }).count()
      ])
      trend.push({ day: dayLabel(start), goods: goods.total, orders: orders.total })
    }
    return {
      ok: true,
      stats: {
        goodsTotal: goodsTotal.total,
        goodsOn: goodsOn.total,
        goodsSold: goodsSold.total,
        goodsPending: goodsPending.total,
        goodsOff: goodsOff.total,
        usersTotal: usersTotal.total,
        ordersTotal: ordersTotal.total,
        completedTotal: completedTotal.total
      },
      goodsByStatus,
      categoryDist,
      trend
    }
  }

  if (action === 'listGoods') {
    const status = data.status || ''
    const page = Number(data.page || 0)
    const size = Number(data.size || 20)
    let query = db.collection('goods')
    if (status) query = query.where({ status })
    const res = await query.orderBy('createTime', 'desc').skip(page * size).limit(size).get()
    const count = await (status ? db.collection('goods').where({ status }) : db.collection('goods')).count()
    const fileIDs = res.data.map(g => g.images && g.images.length ? g.images[0] : null).filter(Boolean)
    const urlMap = {}
    if (fileIDs.length) {
      const tmp = await cloud.getTempFileURL({ fileList: fileIDs })
      ;(tmp.fileList || []).forEach(f => { urlMap[f.fileID] = f.tempFileURL })
    }
    const list = res.data.map(g => Object.assign({}, g, {
      cover: g.images && g.images.length ? (urlMap[g.images[0]] || g.images[0]) : '',
      createTimeText: new Date(g.createTime).toLocaleString('zh-CN')
    }))
    return { ok: true, list, total: count.total, hasMore: (page + 1) * size < count.total }
  }

  if (action === 'approveGoods') {
    if (!data.id) return { ok: false, msg: '缺少id' }
    await db.collection('goods').doc(data.id).update({ data: { status: 'on', updateTime: new Date() } })
    return { ok: true }
  }

  if (action === 'rejectGoods') {
    if (!data.id) return { ok: false, msg: '缺少id' }
    const reason = String(data.reason || '不符合发布规范').slice(0, 100)
    await db.collection('goods').doc(data.id).update({
      data: { status: 'rejected', rejectReason: reason, updateTime: new Date() }
    })
    return { ok: true }
  }

  if (action === 'offGoods') {
    if (!data.id) return { ok: false, msg: '缺少id' }
    await db.collection('goods').doc(data.id).update({ data: { status: 'off', updateTime: new Date() } })
    return { ok: true }
  }

  if (action === 'listUsers') {
    const page = Number(data.page || 0)
    const size = Number(data.size || 20)
    const keyword = String(data.keyword || '').trim()
    let query = db.collection('users')
    if (keyword) {
      const reg = db.RegExp({ regexp: keyword, options: 'i' })
      query = query.where(_.or([{ nickname: reg }, { name: reg }, { studentNo: reg }]))
    }
    const res = await query.orderBy('createTime', 'desc').skip(page * size).limit(size).get()
    const count = await (keyword ? query : db.collection('users')).count()
    const list = res.data.map(u => Object.assign({}, u, {
      createTimeText: new Date(u.createTime).toLocaleString('zh-CN')
    }))
    return { ok: true, list, total: count.total, hasMore: (page + 1) * size < count.total }
  }

  if (action === 'setUserStatus') {
    if (!data.openid) return { ok: false, msg: '缺少openid' }
    const status = data.status === 'banned' ? 'banned' : 'normal'
    const res = await db.collection('users').where({ _openid: data.openid }).update({
      data: { status, updateTime: new Date() }
    })
    return { ok: true, updated: res.stats.updated }
  }

  if (action === 'listReports') {
    const status = data.status || ''
    const page = Number(data.page || 0)
    const size = Number(data.size || 20)
    let query = db.collection('reports')
    if (status) query = query.where({ status })
    const res = await query.orderBy('createTime', 'desc').skip(page * size).limit(size).get()
    const count = await (status ? db.collection('reports').where({ status }) : db.collection('reports')).count()
    const list = res.data.map(r => Object.assign({}, r, {
      createTimeText: new Date(r.createTime).toLocaleString('zh-CN')
    }))
    return { ok: true, list, hasMore: (page + 1) * size < count.total }
  }

  if (action === 'handleReport') {
    if (!data.id) return { ok: false, msg: '缺少id' }
    const note = String(data.note || '已处理').slice(0, 100)
    const report = await db.collection('reports').doc(data.id).get()
    const r = report.data
    if (r.targetType === 'goods') {
      await db.collection('goods').doc(r.targetId).update({
        data: { status: 'off', rejectReason: '因举报被下架', updateTime: new Date() }
      }).catch(() => {})
    }
    await db.collection('reports').doc(data.id).update({
      data: { status: 'done', handleNote: note, handleTime: new Date() }
    })
    return { ok: true }
  }

  return { ok: false, msg: '未知操作' }
}
