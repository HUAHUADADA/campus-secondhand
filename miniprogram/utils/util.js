const formatTime = date => {
  const d = date ? new Date(date) : new Date()
  const p = n => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

const formatDate = date => {
  const d = date ? new Date(date) : new Date()
  const p = n => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const timeAgo = ts => {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return formatDate(ts).slice(5)
}

const statusText = status => {
  const map = { pending: '待审核', on: '在售', sold: '已成交', off: '已下架', rejected: '未通过' }
  return map[status] || status
}

const price = n => {
  const v = Number(n || 0)
  return v % 1 === 0 ? v + '' : v.toFixed(2)
}

const call = (name, data) => wx.cloud.callFunction({ name, data }).then(res => res.result)

module.exports = { formatTime, formatDate, timeAgo, statusText, price, call }
