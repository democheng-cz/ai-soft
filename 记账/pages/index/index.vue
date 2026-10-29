<template>
  <view class="page-wrap">
    <page-meta :page-style="bookPickerOpen ? 'overflow: hidden;' : ''" />
    <!-- 总览卡片 -->
    <view class="overview">
      <!-- 账本切换 -->
      <view class="book-switch pressable" @click="openBookPicker">
        <ui-icon name="wallet" :size="34" color="#FFFFFF" />
        <text class="book-name">{{ currentBookName }}</text>
        <view class="book-caret">
          <ui-icon name="chevronRight" :size="28" color="#FFFFFF" />
        </view>
      </view>

      <view class="overview-card">
        <text class="overview-label">当前未收回总欠款</text>
        <view class="overview-amount-row">
          <text class="overview-symbol">¥</text>
          <text class="overview-amount num">{{ totalDebtText }}</text>
        </view>
        <view class="overview-meta">
          <view class="meta-item">
            <text class="meta-num num">{{ debtorCount }}</text>
            <text class="meta-label">位欠款客户</text>
          </view>
          <view class="meta-sep"></view>
          <view class="meta-item">
            <text class="meta-num num text-debt">+{{ todayDebtText }}</text>
            <text class="meta-label">今日新增欠账</text>
          </view>
          <view class="meta-sep"></view>
          <view class="meta-item">
            <text class="meta-num num text-repay">+{{ todayRepayText }}</text>
            <text class="meta-label">今日收回</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索 -->
    <view class="container">
      <view class="search-bar">
        <ui-icon name="search" :size="36" color="#8A8F99" />
        <input
          class="search-input"
          v-model="keyword"
          type="text"
          placeholder="搜索客户姓名或备注"
          placeholder-class="search-ph"
          confirm-type="search"
        />
      </view>
    </view>

    <!-- 客户列表 -->
    <view class="container list-wrap">
      <view class="list-header">
        <text class="list-title">客户（{{ filteredCustomers.length }}）</text>
        <text class="list-sort">按欠款排序</text>
      </view>

      <view v-if="filteredCustomers.length === 0" class="empty card">
        <view class="empty-icon">
          <ui-icon name="users" :size="80" color="#C5C9D1" />
        </view>
        <view class="empty-title">{{ keyword ? '没有匹配的客户' : '还没有客户记录' }}</view>
        <view class="empty-tip">{{ keyword ? '换个关键词试试' : '点击下方按钮记第一笔账' }}</view>
      </view>

      <view v-else class="customer-list card">
        <view
          v-for="(c, idx) in filteredCustomers"
          :key="c.id"
          class="customer-item pressable"
          :class="{ 'no-border': idx === filteredCustomers.length - 1 }"
          @click="goDetail(c.id)"
        >
          <view class="avatar" :style="{ background: avatarColor(c.name) }">
            <text class="avatar-text">{{ avatarText(c.name) }}</text>
          </view>
          <view class="customer-info">
            <text class="customer-name">{{ c.name }}</text>
            <text v-if="c.note" class="customer-note">{{ c.note }}</text>
            <text v-else class="customer-note text-tertiary">无备注</text>
          </view>
          <view class="customer-right">
            <text v-if="c.balance > 0" class="balance text-debt num">欠 {{ money(c.balance) }}</text>
            <text v-else-if="c.balance < 0" class="balance text-repay num">余 {{ money(-c.balance) }}</text>
            <text v-else class="balance text-tertiary num">已结清</text>
            <ui-icon name="chevronRight" :size="32" color="#C5C9D1" />
          </view>
        </view>
      </view>
    </view>

    <!-- 悬浮记账按钮 -->
    <view class="fab" @click="goRecord">
      <ui-icon name="plus" :size="52" color="#FFFFFF" />
      <text class="fab-text">记一笔</text>
    </view>

    <!-- 账本切换弹窗 -->
    <view
      v-if="bookPickerOpen"
      class="modal-mask"
      @click="bookPickerOpen = false"
      @touchmove.stop.prevent
    >
      <view class="modal-sheet" @click.stop @touchmove.stop>
        <view class="sheet-handle"></view>
        <view class="sheet-header">
          <text class="sheet-title">切换账本</text>
          <view class="sheet-manage pressable" @click="goSettings">
            <text class="sheet-manage-text">管理</text>
          </view>
        </view>
        <view class="book-list">
          <view
            v-for="b in books"
            :key="b.id"
            class="book-item pressable"
            :class="{ 'book-item-active': b.id === currentBookId }"
            @click="selectBook(b.id)"
          >
            <view class="book-item-icon" :style="{ background: avatarColor(b.name) }">
              <ui-icon name="wallet" :size="40" color="#FFFFFF" />
            </view>
            <view class="book-item-info">
              <text class="book-item-name">{{ b.name }}</text>
              <text class="book-item-meta num">
                {{ summary(b.id).customerCount }} 位客户 · 欠 ¥{{ money(summary(b.id).totalDebt) }}
              </text>
            </view>
            <view v-if="b.id === currentBookId" class="book-item-check">
              <ui-icon name="check" :size="40" color="#1FA67A" />
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import UiIcon from '../../components/UiIcon.vue'
import { useLedgerStore } from '../../store/ledger.js'
import { formatFen } from '../../utils/format.js'
import { isSameDay } from '../../utils/format.js'

const store = useLedgerStore()

const AVATAR_COLORS = ['#1FA67A', '#3B82F6', '#F5A524', '#8B5CF6', '#EC4899', '#06B6D4']

export default {
  components: { UiIcon },
  data() {
    return {
      keyword: '',
      bookPickerOpen: false
    }
  },
  computed: {
    books() {
      return store.state.books
    },
    currentBookId() {
      return store.state.currentBookId
    },
    currentBookName() {
      const b = store.currentBook
      return b ? b.name : '账本'
    },
    customers() {
      return store.customersWithBalance()
    },
    filteredCustomers() {
      const kw = this.keyword.trim().toLowerCase()
      if (!kw) return this.customers
      return this.customers.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(kw)) ||
          (c.note && c.note.toLowerCase().includes(kw))
      )
    },
    totalDebtText() {
      return formatFen(store.totalDebt())
    },
    debtorCount() {
      return store.debtorCount()
    },
    todayDebtText() {
      return formatFen(this.todaySum('debt'))
    },
    todayRepayText() {
      return formatFen(this.todaySum('repay'))
    }
  },
  methods: {
    money(fen) {
      return formatFen(fen)
    },
    todaySum(type) {
      const now = Date.now()
      return store.currentTransactions().reduce((sum, t) => {
        if (t.type === type && isSameDay(t.time, now)) return sum + t.amount
        return sum
      }, 0)
    },
    avatarText(name) {
      if (!name) return '?'
      return name.slice(-1)
    },
    avatarColor(name) {
      let h = 0
      for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
      return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
    },
    goDetail(id) {
      uni.navigateTo({ url: '/pages/customer/detail?id=' + id })
    },
    goRecord() {
      uni.navigateTo({ url: '/pages/record/record' })
    },
    openBookPicker() {
      this.bookPickerOpen = true
    },
    selectBook(id) {
      store.switchBook(id)
      this.keyword = ''
      this.bookPickerOpen = false
    },
    summary(id) {
      return store.bookSummary(id)
    },
    goSettings() {
      this.bookPickerOpen = false
      uni.switchTab({ url: '/pages/settings/settings' })
    }
  }
}
</script>

<style scoped>
@import '../../styles/tokens.css';

.overview {
  background: linear-gradient(135deg, #1FA67A 0%, #178A65 100%);
  padding: 24rpx 24rpx 56rpx;
}

/* 账本切换 */
.book-switch {
  display: flex;
  align-items: center;
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.18);
  border-radius: var(--radius-full);
  padding: 10rpx 24rpx;
  margin-bottom: 28rpx;
  width: fit-content;
}
.book-name {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  margin: 0 6rpx 0 12rpx;
}
.book-caret {
  transform: rotate(90deg);
  display: flex;
}

.overview-card {
  color: #fff;
}
.overview-label {
  font-size: 26rpx;
  opacity: 0.85;
}
.overview-amount-row {
  display: flex;
  align-items: baseline;
  margin-top: 12rpx;
}
.overview-symbol {
  font-size: 40rpx;
  font-weight: 600;
  margin-right: 6rpx;
}
.overview-amount {
  font-size: 76rpx;
  font-weight: 700;
  line-height: 1.1;
}
.overview-meta {
  display: flex;
  align-items: center;
  margin-top: 36rpx;
}
.meta-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.meta-num {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
}
.meta-num.text-debt,
.meta-num.text-repay {
  color: #fff;
}
.meta-label {
  font-size: 22rpx;
  opacity: 0.8;
  margin-top: 6rpx;
}
.meta-sep {
  width: 1rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.25);
}

/* 搜索 */
.search-bar {
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border-radius: var(--radius-full);
  padding: 0 28rpx;
  height: 80rpx;
  margin-top: -32rpx;
  box-shadow: var(--shadow-card);
}
.search-input {
  flex: 1;
  margin-left: 16rpx;
  font-size: 28rpx;
  height: 80rpx;
}
.search-ph {
  color: #8A8F99;
}

/* 列表 */
.list-wrap {
  margin-top: 28rpx;
  padding-bottom: 200rpx;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 0 8rpx;
}
.list-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text);
}
.list-sort {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}
.customer-list {
  padding: 0 24rpx;
}
.customer-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--color-divider);
  min-height: 88rpx;
}
.customer-item.no-border {
  border-bottom: none;
}
.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.avatar-text {
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}
.customer-info {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.customer-name {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text);
}
.customer-note {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 4rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.customer-right {
  display: flex;
  align-items: center;
}
.balance {
  font-size: 30rpx;
  font-weight: 700;
  margin-right: 8rpx;
}
.empty-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 24rpx;
}

/* 悬浮按钮 */
.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(env(safe-area-inset-bottom) + 130rpx);
  height: 104rpx;
  padding: 0 40rpx;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  box-shadow: var(--shadow-float);
  transition: transform 0.18s ease, opacity 0.18s ease;
  z-index: 100;
}
.fab:active {
  transform: scale(0.95);
  opacity: 0.92;
}
.fab-text {
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  margin-left: 8rpx;
}

/* 账本切换弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.modal-sheet {
  width: 100%;
  background: var(--color-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: 16rpx 32rpx calc(env(safe-area-inset-bottom) + 32rpx);
  animation: slideUp 0.25s ease;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.sheet-handle {
  width: 72rpx;
  height: 8rpx;
  background: #E0E2E7;
  border-radius: var(--radius-full);
  margin: 8rpx auto 24rpx;
}
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.sheet-title {
  font-size: 34rpx;
  font-weight: 700;
}
.sheet-manage {
  padding: 8rpx 20rpx;
  border-radius: var(--radius-full);
  background: var(--color-bg);
}
.sheet-manage-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  font-weight: 500;
}
.book-list {
  display: flex;
  flex-direction: column;
}
.book-item {
  display: flex;
  align-items: center;
  padding: 24rpx 16rpx;
  border-radius: var(--radius-md);
  min-height: 88rpx;
}
.book-item-active {
  background: var(--color-primary-light);
}
.book-item-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.book-item-info {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}
.book-item-name {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text);
}
.book-item-meta {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 6rpx;
}
.book-item-check {
  flex-shrink: 0;
}
</style>
