const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  if (action === 'create') {
    const targetType = event.targetType
    const targetId = event.targetId
    const reason = String(event.reason || '').trim()
    if (!targetId || !reason) return { ok: false, msg: '信息不完整' }
    if (reason.length > 100) return { ok: false, msg: '原因过长' }
    const exists = await db.collection('reports')
      .where({ _openid: OPENID, targetType, targetId, status: 'pending' })
      .limit(1)
      .get()
    if (exists.data.length) return { ok: false, msg: '请勿重复举报，等待处理' }
    await db.collection('reports').add({
      data: {
        _openid: OPENID,
        targetType,
        targetId,
        reason,
        content: String(event.content || '').trim(),
        status: 'pending',
        handleNote: '',
        createTime: new Date()
      }
    })
    return { ok: true }
  }

  if (action === 'listMine') {
    const res = await db.collection('reports').where({ _openid: OPENID }).orderBy('createTime', 'desc').limit(50).get()
    return { ok: true, list: res.data }
  }

  return { ok: false, msg: '未知操作' }
}
