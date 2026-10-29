<template>
  <view class="page-wrap" v-if="customer">
    <!-- 余额头部 -->
    <view class="header">
      <view class="header-top">
        <view class="header-avatar" :style="{ background: avatarColor(customer.name) }">
          <text class="header-avatar-text">{{ customer.name.slice(-1) }}</text>
        </view>
        <view class="header-info">
          <text class="header-name">{{ customer.name }}</text>
          <text class="header-note">{{ customer.note || '无备注' }}</text>
        </view>
        <view class="header-edit pressable" @click="goEdit">
          <ui-icon name="edit" :size="40" color="#fff" />
        </view>
      </view>

      <view class="balance-box">
        <text class="balance-label">{{ balanceLabel }}</text>
        <view class="balance-row">
          <text class="balance-symbol">¥</text>
          <text class="balance-num num">{{ balanceText }}</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="container actions">
      <view class="btn btn-ghost action-btn" @click="goRecord('debt')">记欠账</view>
      <view class="btn btn-primary action-btn" @click="goRecord('repay')">还款</view>
    </view>

    <!-- 一键结清 -->
    <view class="container" v-if="balance > 0">
      <view class="settle-bar pressable" @click="settleAll">
        <ui-icon name="check" :size="40" color="#1FA67A" />
        <text class="settle-text">一键结清全部欠款（¥{{ balanceText }}）</text>
      </view>
    </view>

    <!-- 流水 -->
    <view class="container list-wrap">
      <view class="list-header">
        <text class="list-title">账目流水（{{ txns.length }}）</text>
      </view>

      <view v-if="txns.length === 0" class="empty card">
        <view class="empty-title">还没有账目记录</view>
        <view class="empty-tip">点击上方按钮记一笔</view>
      </view>

      <view v-else class="card txn-list">
        <view
          v-for="(t, idx) in txns"
          :key="t.id"
          class="txn-item"
          :class="{ 'no-border': idx === txns.length - 1 }"
          @longpress="confirmDeleteTxn(t)"
        >
          <view class="txn-icon" :class="t.type === 'debt' ? 'txn-icon-debt' : 'txn-icon-repay'">
            <text class="txn-icon-text">{{ t.type === 'debt' ? '欠' : '还' }}</text>
          </view>
          <view class="txn-info">
            <text class="txn-type">{{ t.type === 'debt' ? '记欠账' : '还款' }}</text>
            <text class="txn-time num">{{ time(t.time) }}</text>
            <text v-if="t.note" class="txn-note">{{ t.note }}</text>
          </view>
          <text class="txn-amount num" :class="t.type === 'debt' ? 'text-debt' : 'text-repay'">
            {{ t.type === 'debt' ? '+' : '-' }}{{ money(t.amount) }}
          </text>
        </view>
      </view>
      <view class="hint-text">长按某条流水可删除</view>
    </view>
  </view>
</template>

<script>
import UiIcon from '../../components/UiIcon.vue'
import { useLedgerStore } from '../../store/ledger.js'
import { formatFen, formatTime } from '../../utils/format.js'

const store = useLedgerStore()
const AVATAR_COLORS = ['#1FA67A', '#3B82F6', '#F5A524', '#8B5CF6', '#EC4899', '#06B6D4']

export default {
  components: { UiIcon },
  data() {
    return { id: '' }
  },
  onLoad(options) {
    this.id = options.id
  },
  computed: {
    customer() {
      return store.getCustomer(this.id)
    },
    balance() {
      return store.balanceOf(this.id)
    },
    balanceText() {
      return formatFen(Math.abs(this.balance))
    },
    balanceLabel() {
      if (this.balance > 0) return '当前欠款'
      if (this.balance < 0) return '当前多还（余额）'
      return '已结清'
    },
    txns() {
      return store.transactionsOf(this.id)
    }
  },
  methods: {
    money(fen) {
      return formatFen(fen)
    },
    time(ts) {
      return formatTime(ts)
    },
    avatarColor(name) {
      let h = 0
      for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
      return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
    },
    goRecord(type) {
      uni.navigateTo({ url: `/pages/record/record?id=${this.id}&type=${type}` })
    },
    goEdit() {
      uni.navigateTo({ url: `/pages/customer/edit?id=${this.id}` })
    },
    settleAll() {
      uni.showModal({
        title: '确认结清',
        content: `将记录一笔还款 ¥${this.balanceText}，结清后欠款归零。`,
        confirmText: '确认结清',
        confirmColor: '#1FA67A',
        success: (res) => {
          if (res.confirm) {
            store.addTransaction({
              customerId: this.id,
              type: 'repay',
              amount: this.balance,
              note: '一键结清',
              time: Date.now()
            })
            uni.showToast({ title: '已结清', icon: 'success' })
          }
        }
      })
    },
    confirmDeleteTxn(t) {
      uni.showModal({
        title: '删除这条流水？',
        content: `${t.type === 'debt' ? '记欠账' : '还款'} ¥${this.money(t.amount)}，删除后余额将重新计算。`,
        confirmText: '删除',
        confirmColor: '#E5484D',
        success: (res) => {
          if (res.confirm) {
            store.deleteTransaction(t.id)
            uni.showToast({ title: '已删除', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
@import '../../styles/tokens.css';

.header {
  background: linear-gradient(135deg, #1FA67A 0%, #178A65 100%);
  padding: 32rpx 32rpx 48rpx;
  color: #fff;
}
.header-top {
  display: flex;
  align-items: center;
}
.header-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid rgba(255,255,255,0.4);
}
.header-avatar-text {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}
.header-info {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}
.header-name {
  font-size: 38rpx;
  font-weight: 700;
}
.header-note {
  font-size: 26rpx;
  opacity: 0.85;
  margin-top: 6rpx;
}
.header-edit {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
}
.balance-box {
  margin-top: 40rpx;
}
.balance-label {
  font-size: 26rpx;
  opacity: 0.85;
}
.balance-row {
  display: flex;
  align-items: baseline;
  margin-top: 8rpx;
}
.balance-symbol {
  font-size: 44rpx;
  font-weight: 600;
  margin-right: 6rpx;
}
.balance-num {
  font-size: 80rpx;
  font-weight: 700;
  line-height: 1.1;
}

.actions {
  display: flex;
  margin-top: 28rpx;
}
.action-btn {
  flex: 1;
}
.action-btn:first-child {
  margin-right: 24rpx;
}

.settle-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  height: 88rpx;
  margin-top: 24rpx;
}
.settle-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-primary);
  margin-left: 8rpx;
}

.list-wrap {
  margin-top: 28rpx;
}
.list-header {
  margin-bottom: 16rpx;
  padding: 0 8rpx;
}
.list-title {
  font-size: 28rpx;
  font-weight: 600;
}
.txn-list {
  padding: 0 32rpx;
}
.txn-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--color-divider);
}
.txn-item.no-border {
  border-bottom: none;
}
.txn-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.txn-icon-debt {
  background: var(--color-debt-bg);
}
.txn-icon-repay {
  background: var(--color-repay-bg);
}
.txn-icon-text {
  font-size: 30rpx;
  font-weight: 700;
}
.txn-icon-debt .txn-icon-text {
  color: var(--color-debt);
}
.txn-icon-repay .txn-icon-text {
  color: var(--color-repay);
}
.txn-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.txn-type {
  font-size: 30rpx;
  font-weight: 600;
}
.txn-time {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  margin-top: 4rpx;
}
.txn-note {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 4rpx;
}
.txn-amount {
  font-size: 34rpx;
  font-weight: 700;
}
.hint-text {
  text-align: center;
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  margin-top: 24rpx;
}
</style>
