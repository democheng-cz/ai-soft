<template>
  <page-meta :page-style="pickerOpen ? 'overflow: hidden;' : ''" />
  <view class="page-wrap">
    <!-- 类型切换 -->
    <view class="container">
      <view class="type-switch">
        <view
          class="type-btn"
          :class="{ 'type-active-debt': type === 'debt' }"
          @click="type = 'debt'"
        >
          <text>记欠账</text>
        </view>
        <view
          class="type-btn"
          :class="{ 'type-active-repay': type === 'repay' }"
          @click="type = 'repay'"
        >
          <text>还款</text>
        </view>
      </view>
    </view>

    <!-- 金额显示 -->
    <view class="container">
      <view class="amount-display card">
        <text class="amount-label">{{ type === 'debt' ? '欠账金额' : '还款金额' }}</text>
        <view class="amount-value-row">
          <text class="amount-symbol" :class="type === 'debt' ? 'text-debt' : 'text-repay'">¥</text>
          <text
            class="amount-value num"
            :class="amountText === '0' ? 'text-tertiary' : (type === 'debt' ? 'text-debt' : 'text-repay')"
            >{{ amountText }}</text
          >
        </view>
      </view>
    </view>

    <!-- 客户选择 -->
    <view class="container">
      <view class="field card">
        <view class="field-row" @click="openCustomerPicker">
          <text class="field-label">客户</text>
          <view class="field-value">
            <text v-if="selectedCustomer" class="field-text">{{ selectedCustomer.name }}</text>
            <text v-else class="field-text text-tertiary">请选择客户</text>
            <ui-icon name="chevronRight" :size="32" color="#C5C9D1" />
          </view>
        </view>
        <view class="divider"></view>
        <view class="field-row">
          <text class="field-label">备注</text>
          <input
            class="field-input"
            v-model="note"
            type="text"
            placeholder="可选，如 货款 / 茶水费 / 工程尾款"
            placeholder-class="field-ph"
            maxlength="30"
          />
        </view>
      </view>
    </view>

    <!-- 数字键盘 -->
    <view class="keyboard">
      <view class="kb-grid">
        <view
          v-for="key in keys"
          :key="key.v"
          class="kb-key pressable"
          :class="{ 'kb-key-fn': key.fn }"
          @click="onKey(key)"
        >
          <text class="kb-key-text">{{ key.label }}</text>
        </view>
      </view>
      <view
        class="kb-submit"
        :class="canSubmit ? (type === 'debt' ? 'kb-submit-debt' : 'kb-submit-repay') : 'btn-disabled-bg'"
        @click="submit"
      >
        <text class="kb-submit-text">保存</text>
      </view>
    </view>

    <!-- 客户选择弹窗 -->
    <view v-if="pickerOpen" class="modal-mask" @click="closeCustomerPicker" @touchmove.stop.prevent>
      <view class="modal-sheet" @click.stop @touchmove.stop>
        <view class="sheet-handle"></view>
        <view class="sheet-header">
          <text class="sheet-title">选择客户</text>
          <view class="sheet-new pressable" @click="startNewCustomer">
            <ui-icon name="plus" :size="32" color="#1FA67A" />
            <text class="sheet-new-text">新建</text>
          </view>
        </view>

        <view class="sheet-search">
          <ui-icon name="search" :size="32" color="#8A8F99" />
          <input
            class="sheet-search-input"
            v-model="pickerKeyword"
            placeholder="搜索 / 输入新名字"
            placeholder-class="field-ph"
          />
        </view>

        <scroll-view scroll-y class="sheet-list" @touchmove.stop>
          <view
            v-if="newCustomerName"
            class="sheet-item pressable sheet-item-new"
            @click="createAndSelect"
          >
            <view class="sheet-avatar sheet-avatar-new">
              <ui-icon name="plus" :size="36" color="#fff" />
            </view>
            <text class="sheet-name">新建客户 “{{ newCustomerName }}”</text>
          </view>

          <view
            v-for="c in pickerList"
            :key="c.id"
            class="sheet-item pressable"
            @click="selectCustomer(c)"
          >
            <view class="sheet-avatar" :style="{ background: avatarColor(c.name) }">
              <text class="sheet-avatar-text">{{ c.name.slice(-1) }}</text>
            </view>
            <view class="sheet-item-info">
              <text class="sheet-name">{{ c.name }}</text>
              <text v-if="c.note" class="sheet-note">{{ c.note }}</text>
            </view>
            <text v-if="c.balance > 0" class="sheet-balance text-debt num">欠{{ money(c.balance) }}</text>
          </view>

          <view v-if="pickerList.length === 0 && !newCustomerName" class="sheet-empty">
            <text class="text-tertiary">还没有客户，上方输入名字即可新建</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import UiIcon from '../../components/UiIcon.vue'
import { useLedgerStore } from '../../store/ledger.js'
import { formatFen, yuanToFen } from '../../utils/format.js'

const store = useLedgerStore()
const AVATAR_COLORS = ['#1FA67A', '#3B82F6', '#F5A524', '#8B5CF6', '#EC4899', '#06B6D4']

export default {
  components: { UiIcon },
  data() {
    return {
      type: 'debt',
      amountText: '0',
      note: '',
      customerId: '',
      pickerOpen: false,
      pickerKeyword: '',
      keys: [
        { v: '1', label: '1' }, { v: '2', label: '2' }, { v: '3', label: '3' },
        { v: '4', label: '4' }, { v: '5', label: '5' }, { v: '6', label: '6' },
        { v: '7', label: '7' }, { v: '8', label: '8' }, { v: '9', label: '9' },
        { v: '.', label: '.' }, { v: '0', label: '0' }, { v: 'del', label: '⌫', fn: true }
      ]
    }
  },
  onLoad(options) {
    if (options && options.id) {
      this.customerId = options.id
    }
    if (options && options.type) {
      this.type = options.type
    }
  },
  computed: {
    selectedCustomer() {
      return store.getCustomer(this.customerId)
    },
    amountFen() {
      return yuanToFen(this.amountText)
    },
    canSubmit() {
      return this.amountFen > 0 && !!this.customerId
    },
    customers() {
      return store.customersWithBalance()
    },
    pickerKw() {
      return this.pickerKeyword.trim()
    },
    pickerList() {
      const kw = this.pickerKw.toLowerCase()
      if (!kw) return this.customers
      return this.customers.filter(
        (c) =>
          c.name.toLowerCase().includes(kw) || (c.note && c.note.toLowerCase().includes(kw))
      )
    },
    newCustomerName() {
      const kw = this.pickerKw
      if (!kw) return ''
      const exists = this.customers.some((c) => c.name === kw)
      return exists ? '' : kw
    }
  },
  methods: {
    money(fen) {
      return formatFen(fen)
    },
    avatarColor(name) {
      let h = 0
      for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
      return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
    },
    onKey(key) {
      if (key.v === 'del') {
        this.amountText = this.amountText.length > 1 ? this.amountText.slice(0, -1) : '0'
        return
      }
      if (key.v === '.') {
        if (this.amountText.includes('.')) return
        this.amountText += '.'
        return
      }
      // 限制两位小数
      if (this.amountText.includes('.')) {
        const dec = this.amountText.split('.')[1]
        if (dec.length >= 2) return
      }
      if (this.amountText === '0') {
        this.amountText = key.v
      } else {
        if (this.amountText.replace('.', '').length >= 9) return
        this.amountText += key.v
      }
    },
    openCustomerPicker() {
      this.pickerKeyword = ''
      this.pickerOpen = true
    },
    closeCustomerPicker() {
      this.pickerOpen = false
    },
    startNewCustomer() {
      // 聚焦提示用户在搜索框输入
      uni.showToast({ title: '在上方输入名字即可新建', icon: 'none' })
    },
    selectCustomer(c) {
      this.customerId = c.id
      this.pickerOpen = false
    },
    createAndSelect() {
      const name = this.newCustomerName
      if (!name) return
      const c = store.addCustomer({ name, note: '' })
      this.customerId = c.id
      this.pickerOpen = false
      uni.showToast({ title: '已新建客户', icon: 'none' })
    },
    submit() {
      if (!this.canSubmit) {
        if (!this.customerId) {
          uni.showToast({ title: '请先选择客户', icon: 'none' })
        } else {
          uni.showToast({ title: '请输入金额', icon: 'none' })
        }
        return
      }
      store.addTransaction({
        customerId: this.customerId,
        type: this.type,
        amount: this.amountFen,
        note: this.note,
        time: Date.now()
      })
      uni.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 500)
    }
  }
}
</script>

<style scoped>
@import '../../styles/tokens.css';

.container {
  margin-top: 24rpx;
}

/* 类型切换 */
.type-switch {
  display: flex;
  background: #E9EBEF;
  border-radius: var(--radius-full);
  padding: 6rpx;
}
.type-btn {
  flex: 1;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}
.type-active-debt {
  background: var(--color-debt);
  color: #fff;
}
.type-active-repay {
  background: var(--color-repay);
  color: #fff;
}

/* 金额显示 */
.amount-display {
  padding: 36rpx 32rpx;
}
.amount-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}
.amount-value-row {
  display: flex;
  align-items: baseline;
  margin-top: 12rpx;
}
.amount-symbol {
  font-size: 48rpx;
  font-weight: 700;
  margin-right: 8rpx;
}
.amount-value {
  font-size: 88rpx;
  font-weight: 700;
  line-height: 1.1;
}

/* 字段 */
.field {
  padding: 8rpx 32rpx;
}
.field-row {
  display: flex;
  align-items: center;
  min-height: 96rpx;
}
.field-label {
  font-size: 30rpx;
  color: var(--color-text);
  width: 120rpx;
  flex-shrink: 0;
}
.field-value {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.field-text {
  font-size: 30rpx;
  margin-right: 8rpx;
}
.field-input {
  flex: 1;
  text-align: right;
  font-size: 30rpx;
}
.field-ph {
  color: #C5C9D1;
}

/* 键盘 */
.keyboard {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #E9EBEF;
  padding: 16rpx 12rpx calc(env(safe-area-inset-bottom) + 16rpx);
  display: flex;
}
.kb-grid {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
}
.kb-key {
  width: calc(33.333% - 16rpx);
  margin: 8rpx;
  height: 104rpx;
  background: #fff;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1rpx 2rpx rgba(0,0,0,0.05);
}
.kb-key:active {
  background: #DCDFE5;
}
.kb-key-fn {
  background: #DDE0E6;
}
.kb-key-text {
  font-size: 44rpx;
  font-weight: 600;
  color: var(--color-text);
}
.kb-submit {
  width: 200rpx;
  margin: 8rpx;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.kb-submit-debt {
  background: var(--color-debt);
}
.kb-submit-repay {
  background: var(--color-repay);
}
.btn-disabled-bg {
  background: #B8BCC4;
}
.kb-submit-text {
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
}

/* 客户选择弹窗 */
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
  display: flex;
  flex-direction: column;
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
  flex-shrink: 0;
}
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  flex-shrink: 0;
}
.sheet-title {
  font-size: 34rpx;
  font-weight: 700;
}
.sheet-new {
  display: flex;
  align-items: center;
  padding: 8rpx 16rpx;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
}
.sheet-new-text {
  font-size: 28rpx;
  color: var(--color-primary);
  font-weight: 600;
  margin-left: 4rpx;
}
.sheet-search {
  display: flex;
  align-items: center;
  background: var(--color-bg);
  border-radius: var(--radius-full);
  padding: 0 24rpx;
  height: 80rpx;
  margin-bottom: 16rpx;
  flex-shrink: 0;
}
.sheet-search-input {
  flex: 1;
  margin-left: 12rpx;
  font-size: 28rpx;
}
.sheet-list {
  height: 50vh;
  min-height: 0;
}
.sheet-item {
  display: flex;
  align-items: center;
  padding: 20rpx 8rpx;
  min-height: 96rpx;
  border-bottom: 1rpx solid var(--color-divider);
}
.sheet-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sheet-avatar-new {
  background: var(--color-primary);
}
.sheet-avatar-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
.sheet-item-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.sheet-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text);
}
.sheet-note {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 4rpx;
}
.sheet-item-new .sheet-name {
  margin-left: 20rpx;
  color: var(--color-primary);
}
.sheet-balance {
  font-size: 28rpx;
  font-weight: 700;
}
.sheet-empty {
  padding: 60rpx;
  text-align: center;
  font-size: 26rpx;
}
</style>
