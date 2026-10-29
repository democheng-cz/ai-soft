/**
 * 金额与日期格式化工具
 * 金额以 "分" 为最小单位存储，避免浮点误差。
 */

/** 元 -> 分 */
export function yuanToFen(yuan) {
  const n = Number(yuan)
  if (isNaN(n)) return 0
  return Math.round(n * 100)
}

/** 分 -> 元 (number) */
export function fenToYuan(fen) {
  return (Number(fen) || 0) / 100
}

/** 分 -> 显示字符串, 如 1234 -> "12.34" */
export function formatFen(fen) {
  const yuan = fenToYuan(fen)
  return yuan.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** 分 -> 带 ¥ 符号 */
export function formatMoney(fen) {
  return '¥' + formatFen(fen)
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/** 时间戳 -> "MM-DD HH:mm" */
export function formatTime(ts) {
  const d = new Date(ts)
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 时间戳 -> "YYYY-MM-DD" */
export function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 时间戳 -> "YYYY-MM" */
export function formatMonth(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** 是否同一天 */
export function isSameDay(ts, ref) {
  const a = new Date(ts)
  const b = new Date(ref)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
