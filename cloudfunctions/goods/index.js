const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const PAGE_SIZE = 10
const TOP_COST = 20
const PUBLISH_POINTS = 10

const DEFAULT_CATEGORIES = [
  { key: 'book', name: '教材书籍', sort: 1 },
  { key: 'digital', name: '数码电器', sort: 2 },
  { key: 'daily', name: '生活用品', sort: 3 },
  { key: 'sports', name: '运动户外', sort: 4 },
  { key: 'fashion', name: '美妆服饰', sort: 5 },
  { key: 'music', name: '乐器', sort: 6 },
  { key: 'other', name: '其他', sort: 7 }
]

const getUser = async openid => {
  const res = await db.collection('users').where({ _openid: openid }).limit(1).get()
  return res.data.length ? res.data[0] : null
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  if (action === 'getCategories') {
    const res = await db.collection('categories').orderBy('sort', 'asc').get()
    if (res.data.length) return { ok: true, list: res.data }
    for (const c of DEFAULT_CATEGORIES) {
      await db.collection('categories').add({ data: c })
    }
    return { ok: true, list: DEFAULT_CATEGORIES }
  }

  if (action === 'list') {
    const page = Number(event.page || 0)
    const size = Number(event.size || PAGE_SIZE)
    const where = { status: 'on' }
    if (event.category) where.category = event.category
    if (event.keyword) {
      where.title = db.RegExp({ regexp: String(event.keyword).trim(), options: 'i' })
    }
    const res = await db.collection('goods')
      .where(where)
      .orderBy('top', 'desc')
      .orderBy('createTime', 'desc')
      .skip(page * size)
      .limit(size)
      .get()
    const count = await db.collection('goods').where(where).count()
    const list = res.data.map(g => Object.assign({}, g, { cover: g.images && g.images.length ? g.images[0] : '' }))
    return { ok: true, list, hasMore: (page + 1) * size < count.total }
  }

  if (action === 'search') {
    const page = Number(event.page || 0)
    const size = Number(event.size || PAGE_SIZE)
    const conds = [{ status: 'on' }]
    if (event.keyword) {
      const kw = String(event.keyword).trim()
      const reg = db.RegExp({ regexp: kw, options: 'i' })
      conds.push(_.or([{ title: reg }, { desc: reg }, { bookName: reg }]))
    }
    if (event.isbn) {
      conds.push({ isbn: db.RegExp({ regexp: String(event.isbn).trim(), options: 'i' }) })
    }
    const where = _.and(conds)
    const res = await db.collection('goods').where(where).orderBy('createTime', 'desc').skip(page * size).limit(size).get()
    const count = await db.collection('goods').where(where).count()
    const list = res.data.map(g => Object.assign({}, g, { cover: g.images && g.images.length ? g.images[0] : '' }))
    return { ok: true, list, hasMore: (page + 1) * size < count.total }
  }

  if (action === 'detail') {
    const id = event.id
    if (!id) return { ok: false, msg: '缺少商品id' }
    let goods
    try {
      const res = await db.collection('goods').doc(id).get()
      goods = res.data
    } catch (e) {
      return { ok: false, msg: '商品不存在' }
    }
    await db.collection('goods').doc(id).update({ data: { views: _.inc(1) } })
    goods.views = (goods.views || 0) + 1
    let liked = false
    if (OPENID) {
      const fav = await db.collection('favorites').where({ _openid: OPENID, goodsId: id }).limit(1).get()
      liked = fav.data.length > 0
    }
    const isMine = goods._openid === OPENID
    return { ok: true, goods, liked, isMine }
  }

  if (action === 'my') {
    const res = await db.collection('goods').where({ _openid: OPENID }).orderBy('createTime', 'desc').get()
    const list = res.data.map(g => Object.assign({}, g, { cover: g.images && g.images.length ? g.images[0] : '' }))
    return { ok: true, list }
  }

  if (action === 'publish') {
    const user = await getUser(OPENID)
    if (!user) return { ok: false, msg: '请先登录' }
    if (user.status === 'banned') return { ok: false, msg: '账号已被封禁' }
    const title = String(event.title || '').trim()
    const price = Number(event.price)
    if (!title) return { ok: false, msg: '标题不能为空' }
    if (isNaN(price) || price < 0) return { ok: false, msg: '价格不正确' }
    const category = event.category || 'other'
    const categoryName = event.categoryName || '其他'
    const images = Array.isArray(event.images) ? event.images : []
    if (!images.length) return { ok: false, msg: '请至少上传一张图片' }
    let top = !!event.top
    let topUntil = null
    if (top) {
      if ((user.points || 0) < TOP_COST) return { ok: false, msg: '积分不足，置顶需要20积分' }
      await db.collection('users').doc(user._id).update({ data: { points: _.inc(-TOP_COST), updateTime: new Date() } })
      topUntil = new Date(Date.now() + 24 * 3600 * 1000)
    }
    const now = new Date()
    const data = {
      _openid: OPENID,
      title,
      price,
      desc: String(event.desc || '').trim(),
      category,
      categoryName,
      bookName: category === 'book' ? String(event.bookName || '').trim() : '',
      isbn: category === 'book' ? String(event.isbn || '').trim() : '',
      images,
      status: 'pending',
      rejectReason: '',
      top,
      topUntil,
      views: 0,
      sellerName: user.nickname || user.name,
      sellerStudentNo: user.studentNo,
      sellerOpenid: OPENID,
      createTime: now,
      updateTime: now
    }
    const addRes = await db.collection('goods').add({ data })
    await db.collection('users').doc(user._id).update({ data: { points: _.inc(PUBLISH_POINTS), updateTime: now } })
    return { ok: true, id: addRes._id }
  }

  if (action === 'off') {
    const id = event.id
    const res = await db.collection('goods').doc(id).get()
    const goods = res.data
    if (goods._openid !== OPENID) return { ok: false, msg: '无权操作' }
    await db.collection('goods').doc(id).update({ data: { status: 'off', updateTime: new Date() } })
    await db.collection('orders').where({ goodsId: id, status: 'ongoing' }).update({ data: { status: 'cancelled', cancelTime: new Date() } })
    return { ok: true }
  }

  if (action === 'reapply') {
    const id = event.id
    const res = await db.collection('goods').doc(id).get()
    const goods = res.data
    if (goods._openid !== OPENID) return { ok: false, msg: '无权操作' }
    if (goods.status !== 'off' && goods.status !== 'rejected') return { ok: false, msg: '当前状态不能重新上架' }
    await db.collection('goods').doc(id).update({ data: { status: 'pending', rejectReason: '', updateTime: new Date() } })
    return { ok: true }
  }

  if (action === 'delete') {
    const id = event.id
    const res = await db.collection('goods').doc(id).get()
    const goods = res.data
    if (goods._openid !== OPENID) return { ok: false, msg: '无权操作' }
    if (goods.status === 'on' || goods.status === 'sold') return { ok: false, msg: '在售或已成交商品不能删除' }
    await db.collection('goods').doc(id).remove()
    await db.collection('favorites').where({ goodsId: id }).remove()
    return { ok: true }
  }

  return { ok: false, msg: '未知操作' }
}
