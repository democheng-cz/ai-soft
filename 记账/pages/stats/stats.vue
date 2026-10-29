<template>
  <view class="page-wrap">
    <!-- 当前账本 -->
    <view class="container">
      <view class="book-tag">
        <ui-icon name="wallet" :size="32" color="#1FA67A" />
        <text class="book-tag-text">{{ bookName }} · 统计</text>
      </view>
    </view>
    <!-- 关键指标 -->
    <view class="container metrics">
      <view class="metric-card card">
        <text class="metric-label">未收回总欠款</text>
        <text class="metric-value num text-debt">¥{{ money(totalDebt) }}</text>
      </view>
      <view class="metric-card card">
        <text class="metric-label">累计已收回</text>
        <text class="metric-value num text-repay">¥{{ money(totalRepaid) }}</text>
      </view>
    </view>
    <view class="container metrics">
      <view class="metric-card card">
        <text class="metric-label">欠款客户数</text>
        <text class="metric-value num">{{ debtorCount }}</text>
      </view>
      <view class="metric-card card">
        <text class="metric-label">回款率</text>
        <text class="metric-value num">{{ repayRate }}%</text>
      </view>
    </view>

    <!-- 近6月趋势 (分组柱状图) -->
    <view class="container">
      <view class="card chart-card">
        <view class="chart-header">
          <text class="chart-title">近 6 个月欠账 / 收回</text>
          <view class="legend">
            <view class="legend-item">
              <view class="legend-dot" style="background:#E5484D"></view>
              <text class="legend-text">欠账</text>
            </view>
            <view class="legend-item">
              <view class="legend-dot" style="background:#1FA67A"></view>
              <text class="legend-text">收回</text>
            </view>
          </view>
        </view>

        <view v-if="monthlyMax === 0" class="chart-empty">
          <text class="text-tertiary">暂无数据，记一笔账后这里会显示趋势</text>
        </view>

        <view v-else class="bar-chart">
          <view v-for="m in monthly" :key="m.label" class="bar-group">
            <view class="bars">
              <view class="bar-track">
                <view
                  class="bar bar-debt"
                  :style="{ height: barH(m.debt) }"
                ></view>
              </view>
              <view class="bar-track">
                <view
                  class="bar bar-repay"
                  :style="{ height: barH(m.repay) }"
                ></view>
              </view>
            </view>
            <text class="bar-label num">{{ m.label }}</text>
          </view>
        </view>
        <view v-if="monthlyMax > 0" class="chart-axis-note">
          <text class="text-tertiary">峰值 ¥{{ money(monthlyMax) }}</text>
        </view>
      </view>
    </view>

    <!-- 欠款 Top 排行 -->
    <view class="container">
      <view class="card chart-card">
        <view class="chart-header">
          <text class="chart-title">欠款排行 Top {{ topDebtors.length }}</text>
        </view>

        <view v-if="topDebtors.length === 0" class="chart-empty">
          <text class="text-tertiary">目前没有欠款客户</text>
        </view>

        <view v-else class="rank-list">
          <view v-for="(c, idx) in topDebtors" :key="c.id" class="rank-item">
            <text class="rank-no" :class="'rank-no-' + (idx + 1)">{{ idx + 1 }}</text>
            <view class="rank-info">
              <view class="rank-top">
                <text class="rank-name">{{ c.name }}</text>
                <text class="rank-amount num text-debt">¥{{ money(c.balance) }}</text>
              </view>
              <view class="rank-bar-track">
                <view
                  class="rank-bar"
                  :style="{ width: rankW(c.balance) }"
                ></view>
              </view>
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
import { formatFen, formatMonth } from '../../utils/format.js'

const store = useLedgerStore()

export default {
  components: { UiIcon },
  data() {
    return {}
  },
  computed: {
    bookName() {
      const b = store.currentBook
      return b ? b.name : '账本'
    },
    bookTxns() {
      return store.currentTransactions()
    },
    totalDebt() {
      return store.totalDebt()
    },
    totalRepaid() {
      return this.bookTxns.reduce(
        (s, t) => (t.type === 'repay' ? s + t.amount : s),
        0
      )
    },
    totalBorrowed() {
      return this.bookTxns.reduce(
        (s, t) => (t.type === 'debt' ? s + t.amount : s),
        0
      )
    },
    debtorCount() {
      return store.debtorCount()
    },
    repayRate() {
      if (this.totalBorrowed === 0) return 0
      return Math.round((this.totalRepaid / this.totalBorrowed) * 100)
    },
    monthly() {
      // 近 6 个月
      const buckets = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = formatMonth(d.getTime())
        buckets.push({ key, label: key.slice(5) + '月', debt: 0, repay: 0 })
      }
      const map = {}
      buckets.forEach((b) => (map[b.key] = b))
      this.bookTxns.forEach((t) => {
        const key = formatMonth(t.time)
        if (map[key]) {
          if (t.type === 'debt') map[key].debt += t.amount
          else map[key].repay += t.amount
        }
      })
      return buckets
    },
    monthlyMax() {
      let max = 0
      this.monthly.forEach((m) => {
        max = Math.max(max, m.debt, m.repay)
      })
      return max
    },
    topDebtors() {
      return store
        .customersWithBalance()
        .filter((c) => c.balance > 0)
        .slice(0, 5)
    },
    topMax() {
      return this.topDebtors.length ? this.topDebtors[0].balance : 1
    }
  },
  methods: {
    money(fen) {
      return formatFen(fen)
    },
    barH(val) {
      if (this.monthlyMax === 0) return '0%'
      return Math.max((val / this.monthlyMax) * 100, val > 0 ? 4 : 0) + '%'
    },
    rankW(val) {
      return Math.max((val / this.topMax) * 100, 8) + '%'
    }
  }
}
</script>

<style scoped>
@import '../../styles/tokens.css';

.container {
  margin-top: 24rpx;
}
.book-tag {
  display: flex;
  align-items: center;
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  padding: 12rpx 24rpx;
  width: fit-content;
}
.book-tag-text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-primary);
  margin-left: 8rpx;
}
.metrics {
  display: flex;
}
.metric-card {
  flex: 1;
  padding: 28rpx;
}
.metric-card:first-child {
  margin-right: 24rpx;
}
.metric-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}
.metric-value {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  margin-top: 12rpx;
}

.chart-card {
  padding: 32rpx;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}
.chart-title {
  font-size: 30rpx;
  font-weight: 600;
}
.legend {
  display: flex;
}
.legend-item {
  display: flex;
  align-items: center;
  margin-left: 24rpx;
}
.legend-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 6rpx;
  margin-right: 8rpx;
}
.legend-text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}
.chart-empty {
  padding: 60rpx 0;
  text-align: center;
  font-size: 26rpx;
}

/* 柱状图 */
.bar-chart {
  display: flex;
  height: 320rpx;
  align-items: flex-end;
}
.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
}
.bar-track {
  width: 24rpx;
  height: 100%;
  display: flex;
  align-items: flex-end;
  margin: 0 6rpx;
}
.bar {
  width: 100%;
  border-radius: 8rpx 8rpx 0 0;
  transition: height 0.4s ease;
}
.bar-debt {
  background: #E5484D;
}
.bar-repay {
  background: #1FA67A;
}
.bar-label {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
  margin-top: 16rpx;
}
.chart-axis-note {
  text-align: right;
  font-size: 22rpx;
  margin-top: 16rpx;
}

/* 排行 */
.rank-list {
  display: flex;
  flex-direction: column;
}
.rank-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}
.rank-no {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  text-align: center;
  line-height: 48rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--color-text-tertiary);
  background: var(--color-bg);
  flex-shrink: 0;
}
.rank-no-1 { background: #FDECEC; color: #E5484D; }
.rank-no-2 { background: #FFF3E0; color: #F5A524; }
.rank-no-3 { background: #FEF6E7; color: #D99316; }
.rank-info {
  flex: 1;
  margin-left: 20rpx;
}
.rank-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10rpx;
}
.rank-name {
  font-size: 28rpx;
  font-weight: 600;
}
.rank-amount {
  font-size: 28rpx;
  font-weight: 700;
}
.rank-bar-track {
  height: 14rpx;
  background: var(--color-bg);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.rank-bar {
  height: 100%;
  background: linear-gradient(90deg, #E5484D, #F5707A);
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}
</style>
