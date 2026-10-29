/**
 * 本地存储封装
 * 数据全部存于设备本地 (uni.storage)，离线优先。
 */

const KEYS = {
  BOOKS: 'ledger_books',
  CURRENT_BOOK: 'ledger_current_book',
  CUSTOMERS: 'ledger_customers',
  TXNS: 'ledger_transactions',
  SEED: 'ledger_seed'
}

function read(key, fallback) {
  try {
    const v = uni.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return typeof v === 'string' ? JSON.parse(v) : v
  } catch (e) {
    return fallback
  }
}

function write(key, value) {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
    return true
  } catch (e) {
    return false
  }
}

function readRaw(key, fallback) {
  try {
    const v = uni.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return v
  } catch (e) {
    return fallback
  }
}

export const storage = {
  KEYS,
  getBooks() {
    return read(KEYS.BOOKS, [])
  },
  saveBooks(list) {
    return write(KEYS.BOOKS, list)
  },
  getCurrentBookId() {
    return readRaw(KEYS.CURRENT_BOOK, '')
  },
  saveCurrentBookId(id) {
    try {
      uni.setStorageSync(KEYS.CURRENT_BOOK, id)
      return true
    } catch (e) {
      return false
    }
  },
  getSeed() {
    return readRaw(KEYS.SEED, '')
  },
  saveSeed(seed) {
    try {
      uni.setStorageSync(KEYS.SEED, seed)
      return true
    } catch (e) {
      return false
    }
  },
  getCustomers() {
    return read(KEYS.CUSTOMERS, [])
  },
  saveCustomers(list) {
    return write(KEYS.CUSTOMERS, list)
  },
  getTransactions() {
    return read(KEYS.TXNS, [])
  },
  saveTransactions(list) {
    return write(KEYS.TXNS, list)
  },
  /** 导出全部数据为对象 */
  exportAll() {
    return {
      version: 2,
      exportedAt: Date.now(),
      books: read(KEYS.BOOKS, []),
      customers: read(KEYS.CUSTOMERS, []),
      transactions: read(KEYS.TXNS, [])
    }
  },
  /** 导入数据 (覆盖) */
  importAll(data) {
    if (!data || !Array.isArray(data.customers) || !Array.isArray(data.transactions)) {
      return false
    }
    write(KEYS.BOOKS, Array.isArray(data.books) ? data.books : [])
    write(KEYS.CUSTOMERS, data.customers)
    write(KEYS.TXNS, data.transactions)
    return true
  }
}

/** 简单唯一 id */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
