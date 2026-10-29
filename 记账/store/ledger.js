/**
 * 全局账本状态管理 (Vue3 reactive 单例)
 *
 * 数据模型:
 *   Book        { id, name, createdAt }
 *   Customer    { id, bookId, name, note, createdAt }
 *   Transaction { id, customerId, type: 'debt'|'repay', amount(分), note, time }
 *
 * 多账本: 每个客户归属一个账本(bookId), 流水通过客户间接归属账本。
 * 所有列表/统计默认只作用于「当前账本」。
 *
 * 余额 = sum(debt) - sum(repay)，实时由流水计算，不单独存储，保证账目一致。
 */
import { reactive } from 'vue'
import { storage, uid } from '../utils/storage.js'
import { mockData } from '../utils/mock.js'

const state = reactive({
  books: [],
  currentBookId: '',
  customers: [],
  transactions: [],
  ready: false
})

function persistBooks() {
  storage.saveBooks(state.books)
}
function persistCurrent() {
  storage.saveCurrentBookId(state.currentBookId)
}
function persistCustomers() {
  storage.saveCustomers(state.customers)
}
function persistTxns() {
  storage.saveTransactions(state.transactions)
}

export function useLedgerStore() {
  return {
    state,

    init() {
      if (state.ready) return
      state.books = storage.getBooks()
      state.currentBookId = storage.getCurrentBookId()
      state.customers = storage.getCustomers()
      state.transactions = storage.getTransactions()

      const storedSeed = storage.getSeed()
      const isEmpty = state.books.length === 0 && state.customers.length === 0
      // 演示阶段: 无数据 或 演示数据版本变化时, 注入/刷新演示数据
      if (isEmpty || storedSeed !== mockData.seed) {
        state.books = JSON.parse(JSON.stringify(mockData.books))
        state.customers = JSON.parse(JSON.stringify(mockData.customers))
        state.transactions = JSON.parse(JSON.stringify(mockData.transactions))
        state.currentBookId = state.books[0] ? state.books[0].id : ''
        persistBooks()
        persistCustomers()
        persistTxns()
        persistCurrent()
        storage.saveSeed(mockData.seed)
      }

      // 至少要有一个账本
      if (state.books.length === 0) {
        const b = { id: uid(), name: '默认账本', createdAt: Date.now() }
        state.books.push(b)
        persistBooks()
      }

      // 校正当前账本
      if (!state.books.some((b) => b.id === state.currentBookId)) {
        state.currentBookId = state.books[0].id
        persistCurrent()
      }

      state.ready = true
    },

    /* ---------- 账本 ---------- */
    get currentBook() {
      return state.books.find((b) => b.id === state.currentBookId) || null
    },

    addBook(name) {
      const book = {
        id: uid(),
        name: (name || '').trim() || '新账本',
        createdAt: Date.now()
      }
      state.books.push(book)
      persistBooks()
      return book
    },

    updateBook(id, name) {
      const b = state.books.find((x) => x.id === id)
      if (!b) return false
      b.name = (name || '').trim() || b.name
      persistBooks()
      return true
    },

    deleteBook(id) {
      if (state.books.length <= 1) return false // 至少保留一个
      const customerIds = state.customers
        .filter((c) => c.bookId === id)
        .map((c) => c.id)
      state.customers = state.customers.filter((c) => c.bookId !== id)
      state.transactions = state.transactions.filter(
        (t) => !customerIds.includes(t.customerId)
      )
      state.books = state.books.filter((b) => b.id !== id)
      if (state.currentBookId === id) {
        state.currentBookId = state.books[0].id
        persistCurrent()
      }
      persistBooks()
      persistCustomers()
      persistTxns()
      return true
    },

    switchBook(id) {
      if (state.books.some((b) => b.id === id)) {
        state.currentBookId = id
        persistCurrent()
      }
    },

    /** 某账本的统计摘要(供切换器展示) */
    bookSummary(bookId) {
      const ids = state.customers
        .filter((c) => c.bookId === bookId)
        .map((c) => c.id)
      let debt = 0
      const balMap = {}
      ids.forEach((id) => (balMap[id] = 0))
      state.transactions.forEach((t) => {
        if (balMap[t.customerId] === undefined) return
        balMap[t.customerId] += t.type === 'debt' ? t.amount : -t.amount
      })
      let debtorCount = 0
      Object.values(balMap).forEach((b) => {
        if (b > 0) {
          debt += b
          debtorCount++
        }
      })
      return { customerCount: ids.length, totalDebt: debt, debtorCount }
    },

    /* ---------- 客户 (限定当前账本) ---------- */
    addCustomer({ name, note }) {
      const customer = {
        id: uid(),
        bookId: state.currentBookId,
        name: (name || '').trim(),
        note: (note || '').trim(),
        createdAt: Date.now()
      }
      state.customers.push(customer)
      persistCustomers()
      return customer
    },

    updateCustomer(id, { name, note }) {
      const c = state.customers.find((x) => x.id === id)
      if (!c) return false
      c.name = (name || '').trim()
      c.note = (note || '').trim()
      persistCustomers()
      return true
    },

    deleteCustomer(id) {
      state.customers = state.customers.filter((c) => c.id !== id)
      state.transactions = state.transactions.filter((t) => t.customerId !== id)
      persistCustomers()
      persistTxns()
    },

    getCustomer(id) {
      return state.customers.find((c) => c.id === id) || null
    },

    /** 当前账本的客户 */
    currentCustomers() {
      return state.customers.filter((c) => c.bookId === state.currentBookId)
    },

    /* ---------- 流水 ---------- */
    addTransaction({ customerId, type, amount, note, time }) {
      const txn = {
        id: uid(),
        customerId,
        type, // 'debt' | 'repay'
        amount: Number(amount) || 0, // 分
        note: (note || '').trim(),
        time: time || Date.now()
      }
      state.transactions.push(txn)
      persistTxns()
      return txn
    },

    deleteTransaction(id) {
      state.transactions = state.transactions.filter((t) => t.id !== id)
      persistTxns()
    },

    /* ---------- 计算 (限定当前账本) ---------- */
    /** 某客户余额(分): 正=欠款, 0=已结清 */
    balanceOf(customerId) {
      return state.transactions.reduce((sum, t) => {
        if (t.customerId !== customerId) return sum
        return sum + (t.type === 'debt' ? t.amount : -t.amount)
      }, 0)
    },

    /** 某客户流水(按时间倒序) */
    transactionsOf(customerId) {
      return state.transactions
        .filter((t) => t.customerId === customerId)
        .sort((a, b) => b.time - a.time)
    },

    /** 当前账本客户列表 + 余额, 按欠款降序 */
    customersWithBalance() {
      return this.currentCustomers()
        .map((c) => ({ ...c, balance: this.balanceOf(c.id) }))
        .sort((a, b) => b.balance - a.balance)
    },

    /** 当前账本流水 */
    currentTransactions() {
      const ids = this.currentCustomers().map((c) => c.id)
      return state.transactions.filter((t) => ids.includes(t.customerId))
    },

    /** 当前账本总欠款(分) */
    totalDebt() {
      return this.currentCustomers().reduce((sum, c) => {
        const b = this.balanceOf(c.id)
        return sum + (b > 0 ? b : 0)
      }, 0)
    },

    /** 当前账本欠款客户数 */
    debtorCount() {
      return this.currentCustomers().filter((c) => this.balanceOf(c.id) > 0).length
    },

    /* ---------- 备份 ---------- */
    exportData() {
      return storage.exportAll()
    },
    importData(data) {
      const ok = storage.importAll(data)
      if (ok) {
        state.books = storage.getBooks()
        state.customers = storage.getCustomers()
        state.transactions = storage.getTransactions()
        if (state.books.length === 0) {
          const b = { id: uid(), name: '默认账本', createdAt: Date.now() }
          state.books.push(b)
          persistBooks()
        }
        if (!state.books.some((b) => b.id === state.currentBookId)) {
          state.currentBookId = state.books[0].id
          persistCurrent()
        }
      }
      return ok
    }
  }
}
