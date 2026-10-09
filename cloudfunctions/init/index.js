const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const COLLECTIONS = ['users', 'goods', 'categories', 'favorites', 'conversations', 'messages', 'orders', 'reviews', 'reports', 'feedback']

const CATEGORIES = [
  { key: 'book', name: '教材书籍', sort: 1 },
  { key: 'digital', name: '数码电器', sort: 2 },
  { key: 'daily', name: '生活用品', sort: 3 },
  { key: 'sports', name: '运动户外', sort: 4 },
  { key: 'fashion', name: '美妆服饰', sort: 5 },
  { key: 'music', name: '乐器', sort: 6 },
  { key: 'other', name: '其他', sort: 7 }
]

exports.main = async () => {
  const created = []
  const errors = []
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
      created.push(name)
    } catch (e) {
      errors.push(name)
    }
  }
  const cats = await db.collection('categories').count()
  if (cats.total === 0) {
    for (const c of CATEGORIES) {
      await db.collection('categories').add({ data: c })
    }
  }
  return { ok: true, created, alreadyExists: errors }
}
