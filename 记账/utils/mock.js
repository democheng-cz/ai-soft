/**
 * Mock 演示数据
 * 仅当本地无任何客户时自动注入，方便预览效果。
 * 正式使用时清空数据即可（设置页 → 清空全部数据）。
 */

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

function ago(days, hour = 20) {
  const d = new Date(now - days * DAY)
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0)
  return d.getTime()
}

// 金额单位: 分
function y(yuan) {
  return Math.round(yuan * 100)
}

const BOOK_MJ = 'b_mahjong'
const BOOK_TILE = 'b_tile'

const books = [
  { id: BOOK_MJ, name: '麻将馆', createdAt: ago(120) },
  { id: BOOK_TILE, name: '瓷砖生意', createdAt: ago(90) }
]

const customers = [
  // ===== 麻将馆 =====
  { id: 'c01', bookId: BOOK_MJ, name: '老王', note: '3号桌常客，穿红衣服', createdAt: ago(120) },
  { id: 'c02', bookId: BOOK_MJ, name: '张哥', note: '139****8821', createdAt: ago(110) },
  { id: 'c03', bookId: BOOK_MJ, name: '李姐', note: '楼上理发店老板', createdAt: ago(95) },
  { id: 'c04', bookId: BOOK_MJ, name: '胖子', note: '爱抽烟，茶水多', createdAt: ago(88) },
  { id: 'c07', bookId: BOOK_MJ, name: '赵四', note: '东头小卖部', createdAt: ago(60) },
  { id: 'c08', bookId: BOOK_MJ, name: '孙姨', note: '退休教师', createdAt: ago(55) },
  { id: 'c10', bookId: BOOK_MJ, name: '周哥', note: '夜班司机', createdAt: ago(40) },
  { id: 'c13', bookId: BOOK_MJ, name: '冯叔', note: '老熟人', createdAt: ago(12) },
  { id: 'm15', bookId: BOOK_MJ, name: '黄毛', note: '2号桌，爱打大', createdAt: ago(115) },
  { id: 'm16', bookId: BOOK_MJ, name: '老蒋', note: '退休干部', createdAt: ago(105) },
  { id: 'm17', bookId: BOOK_MJ, name: '小四川', note: '川菜馆厨师', createdAt: ago(92) },
  { id: 'm18', bookId: BOOK_MJ, name: '阿强', note: '快递站老板', createdAt: ago(83) },
  { id: 'm19', bookId: BOOK_MJ, name: '眼镜', note: '会计，周末来', createdAt: ago(72) },
  { id: 'm20', bookId: BOOK_MJ, name: '王婶', note: '广场舞队长', createdAt: ago(64) },
  { id: 'm21', bookId: BOOK_MJ, name: '老六', note: '出租车司机', createdAt: ago(50) },
  { id: 'm22', bookId: BOOK_MJ, name: '大刘', note: '工地包工头', createdAt: ago(44) },
  { id: 'm23', bookId: BOOK_MJ, name: '阿珍', note: '美甲店', createdAt: ago(33) },
  { id: 'm24', bookId: BOOK_MJ, name: '老杨', note: '小区保安', createdAt: ago(26) },
  { id: 'm25', bookId: BOOK_MJ, name: '小马', note: '新客，话不多', createdAt: ago(15) },
  { id: 'm26', bookId: BOOK_MJ, name: '陈伯', note: '隔壁茶楼熟客', createdAt: ago(7) },

  // ===== 瓷砖生意 =====
  { id: 'c05', bookId: BOOK_TILE, name: '陈老板', note: '城东建材市场', createdAt: ago(80) },
  { id: 'c06', bookId: BOOK_TILE, name: '刘工', note: '装修队，常拿瓷砖', createdAt: ago(75) },
  { id: 'c09', bookId: BOOK_TILE, name: '马总', note: '工程客户，出手大方', createdAt: ago(50) },
  { id: 'c11', bookId: BOOK_TILE, name: '吴老板', note: '隔壁餐馆装修', createdAt: ago(30) },
  { id: 'c12', bookId: BOOK_TILE, name: '郑姐', note: '自建房贴砖', createdAt: ago(20) },
  { id: 'c14', bookId: BOOK_TILE, name: '钱多多', note: '新客户，朋友介绍', createdAt: ago(5) },
  { id: 't15', bookId: BOOK_TILE, name: '宏达装饰', note: '装修公司，月结', createdAt: ago(112) },
  { id: 't16', bookId: BOOK_TILE, name: '老周泥工', note: '贴砖师傅，带单', createdAt: ago(100) },
  { id: 't17', bookId: BOOK_TILE, name: '林姐', note: '别墅自装', createdAt: ago(86) },
  { id: 't18', bookId: BOOK_TILE, name: '美佳装修', note: '工装为主', createdAt: ago(70) },
  { id: 't19', bookId: BOOK_TILE, name: '何老板', note: '五金店转介绍', createdAt: ago(58) },
  { id: 't20', bookId: BOOK_TILE, name: '赵工', note: '幼儿园改造项目', createdAt: ago(46) },
  { id: 't21', bookId: BOOK_TILE, name: '老徐', note: '农村自建房', createdAt: ago(38) },
  { id: 't22', bookId: BOOK_TILE, name: '丽都酒店', note: '大客户，分期付', createdAt: ago(28) },
  { id: 't23', bookId: BOOK_TILE, name: '小区物业', note: '公共区域翻新', createdAt: ago(18) },
  { id: 't24', bookId: BOOK_TILE, name: '王师傅', note: '二手房翻新', createdAt: ago(9) },
  { id: 't25', bookId: BOOK_TILE, name: '新春超市', note: '门店装修', createdAt: ago(3) }
]

let seq = 0
function tx(customerId, type, yuan, days, note) {
  seq++
  return {
    id: 't' + String(seq).padStart(3, '0'),
    customerId,
    type,
    amount: y(yuan),
    note: note || '',
    time: ago(days, 14 + (seq % 8))
  }
}

// 伪随机(可重复), 让数据每次一致
let rngSeed = 20240601
function rand() {
  rngSeed = (rngSeed * 9301 + 49297) % 233280
  return rngSeed / 233280
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)]
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min
}

const MJ_NOTES = ['开台', '茶水烟钱', '夜场', '通宵', '加台', '', '', '续台', '点心']
const TILE_NOTES = ['客厅地砖', '墙砖一批', '阳台砖', '卫生间整套', '补货', '美缝剂', '工程砖款', '厨房防滑砖', '门店砖', '']

const baseTransactions = [
  // 老王(麻将): 多次欠账 + 部分还款, 仍欠
  tx('c01', 'debt', 200, 118, '开台'),
  tx('c01', 'debt', 150, 100, '茶水烟钱'),
  tx('c01', 'repay', 200, 92, ''),
  tx('c01', 'debt', 320, 70, ''),
  tx('c01', 'debt', 180, 45, '夜场'),
  tx('c01', 'repay', 300, 30, ''),
  tx('c01', 'debt', 260, 8, ''),

  // 张哥(麻将): 欠款大户
  tx('c02', 'debt', 500, 108, ''),
  tx('c02', 'debt', 480, 85, '通宵'),
  tx('c02', 'repay', 400, 70, ''),
  tx('c02', 'debt', 600, 55, ''),
  tx('c02', 'debt', 350, 33, ''),
  tx('c02', 'debt', 420, 15, '加台'),
  tx('c02', 'repay', 200, 6, '先还一点'),

  // 李姐: 已结清
  tx('c03', 'debt', 280, 90, ''),
  tx('c03', 'debt', 120, 78, ''),
  tx('c03', 'repay', 400, 60, '一次还清'),

  // 胖子(麻将): 欠款中
  tx('c04', 'debt', 160, 84, ''),
  tx('c04', 'debt', 240, 62, '茶水费'),
  tx('c04', 'repay', 100, 40, ''),
  tx('c04', 'debt', 300, 18, ''),

  // 陈老板(瓷砖): 大额货款, 有还
  tx('c05', 'debt', 8600, 76, '客厅地砖2箱'),
  tx('c05', 'repay', 5000, 50, '微信转账'),
  tx('c05', 'debt', 6500, 28, '墙砖一批'),
  tx('c05', 'debt', 4500, 10, '补货'),

  // 刘工(瓷砖): 装修队多次拿货
  tx('c06', 'debt', 3200, 70, '工地用砖'),
  tx('c06', 'debt', 1800, 35, '阳台砖'),

  // 赵四: 结清
  tx('c07', 'debt', 200, 58, ''),
  tx('c07', 'repay', 200, 44, ''),

  // 孙姨(麻将): 小额
  tx('c08', 'debt', 60, 52, ''),
  tx('c08', 'debt', 80, 24, '茶水'),
  tx('c08', 'repay', 60, 12, ''),

  // 马总(瓷砖工程): 大额, 分批结
  tx('c09', 'debt', 28000, 48, '整栋工程砖款'),
  tx('c09', 'repay', 20000, 47, '首付款'),
  tx('c09', 'debt', 18000, 20, '二期补货'),
  tx('c09', 'repay', 18000, 19, '结清二期'),
  tx('c09', 'debt', 15000, 4, '三期'),

  // 周哥(麻将): 夜班, 欠款
  tx('c10', 'debt', 180, 38, '夜场'),
  tx('c10', 'debt', 220, 22, ''),
  tx('c10', 'debt', 150, 9, ''),
  tx('c10', 'repay', 200, 3, ''),

  // 吴老板(瓷砖): 餐馆装修
  tx('c11', 'debt', 5400, 28, '厨房防滑砖'),
  tx('c11', 'repay', 3000, 14, ''),
  tx('c11', 'debt', 2600, 5, '收银台背景砖'),

  // 郑姐(瓷砖): 结清
  tx('c12', 'debt', 4200, 18, '自建房整单'),
  tx('c12', 'repay', 4200, 7, '一次付清'),

  // 冯叔(麻将): 小额
  tx('c13', 'debt', 90, 11, ''),
  tx('c13', 'debt', 110, 2, '茶水烟'),

  // 钱多多(瓷砖): 新客户
  tx('c14', 'debt', 3600, 4, '卫生间整套'),
  tx('c14', 'debt', 1200, 1, '美缝剂加购')
]

// 为新增客户批量生成流水
function genFor(customerId, kind, count, daySpan, opts) {
  const list = []
  const { min, max, notes, settleChance = 0.35 } = opts
  let lastDay = daySpan
  let owed = 0
  for (let i = 0; i < count; i++) {
    lastDay = Math.max(1, lastDay - randInt(2, Math.ceil(daySpan / count) + 3))
    const amt = randInt(min, max) * (kind === 'tile' ? 100 : 10)
    list.push(tx(customerId, 'debt', amt, lastDay, pick(notes)))
    owed += amt
    // 期间偶尔还一笔
    if (owed > 0 && rand() < settleChance) {
      const repay = Math.round(owed * (rand() < 0.4 ? 1 : 0.5) / (kind === 'tile' ? 100 : 10)) * (kind === 'tile' ? 100 : 10)
      if (repay > 0) {
        lastDay = Math.max(1, lastDay - 1)
        list.push(tx(customerId, 'repay', repay, lastDay, rand() < 0.3 ? '微信' : ''))
        owed -= repay
      }
    }
  }
  return list
}

const genMJ = [
  ...genFor('m15', 'mj', 6, 110, { min: 15, max: 60, notes: MJ_NOTES }),
  ...genFor('m16', 'mj', 5, 100, { min: 8, max: 30, notes: MJ_NOTES, settleChance: 0.6 }),
  ...genFor('m17', 'mj', 7, 90, { min: 12, max: 45, notes: MJ_NOTES }),
  ...genFor('m18', 'mj', 5, 80, { min: 20, max: 70, notes: MJ_NOTES }),
  ...genFor('m19', 'mj', 4, 70, { min: 10, max: 35, notes: MJ_NOTES, settleChance: 0.7 }),
  ...genFor('m20', 'mj', 6, 62, { min: 6, max: 25, notes: MJ_NOTES }),
  ...genFor('m21', 'mj', 5, 48, { min: 15, max: 50, notes: MJ_NOTES }),
  ...genFor('m22', 'mj', 7, 42, { min: 30, max: 90, notes: MJ_NOTES }),
  ...genFor('m23', 'mj', 4, 32, { min: 10, max: 40, notes: MJ_NOTES, settleChance: 0.5 }),
  ...genFor('m24', 'mj', 3, 24, { min: 8, max: 20, notes: MJ_NOTES }),
  ...genFor('m25', 'mj', 2, 14, { min: 15, max: 45, notes: MJ_NOTES }),
  ...genFor('m26', 'mj', 2, 6, { min: 10, max: 30, notes: MJ_NOTES })
]

const genTILE = [
  ...genFor('t15', 'tile', 6, 110, { min: 30, max: 150, notes: TILE_NOTES }),
  ...genFor('t16', 'tile', 5, 98, { min: 20, max: 80, notes: TILE_NOTES }),
  ...genFor('t17', 'tile', 4, 84, { min: 40, max: 120, notes: TILE_NOTES, settleChance: 0.5 }),
  ...genFor('t18', 'tile', 6, 68, { min: 50, max: 200, notes: TILE_NOTES }),
  ...genFor('t19', 'tile', 4, 56, { min: 25, max: 90, notes: TILE_NOTES }),
  ...genFor('t20', 'tile', 5, 44, { min: 60, max: 180, notes: TILE_NOTES }),
  ...genFor('t21', 'tile', 4, 36, { min: 30, max: 100, notes: TILE_NOTES, settleChance: 0.6 }),
  ...genFor('t22', 'tile', 7, 27, { min: 80, max: 300, notes: TILE_NOTES }),
  ...genFor('t23', 'tile', 4, 17, { min: 40, max: 150, notes: TILE_NOTES }),
  ...genFor('t24', 'tile', 3, 8, { min: 20, max: 70, notes: TILE_NOTES, settleChance: 0.5 }),
  ...genFor('t25', 'tile', 2, 3, { min: 50, max: 160, notes: TILE_NOTES })
]

const transactions = [...baseTransactions, ...genMJ, ...genTILE].sort(
  (a, b) => a.time - b.time
)

export const mockData = {
  version: 2,
  seed: 'seed-2024-v3',
  books,
  customers,
  transactions
}
