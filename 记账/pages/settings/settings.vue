<template>
  <view class="page-wrap">
    <page-meta :page-style="bookEditOpen ? 'overflow: hidden;' : ''" />
    <!-- 账本管理 -->
    <view class="container">
      <view class="section-title-row">
        <text class="section-title">账本管理</text>
        <view class="add-book pressable" @click="openAddBook">
          <ui-icon name="plus" :size="32" color="#1FA67A" />
          <text class="add-book-text">新建账本</text>
        </view>
      </view>
      <view class="card menu">
        <view
          v-for="(b, idx) in books"
          :key="b.id"
          class="menu-item book-item-row"
          :class="{ 'no-border': idx === books.length - 1 }"
        >
          <view class="menu-icon menu-icon-green">
            <ui-icon name="wallet" :size="40" color="#1FA67A" />
          </view>
          <view class="menu-info" @click="openRenameBook(b)">
            <view class="book-name-row">
              <text class="menu-label">{{ b.name }}</text>
              <text v-if="b.id === currentBookId" class="book-current-tag">当前</text>
            </view>
            <text class="menu-desc">{{ bookDesc(b.id) }}</text>
          </view>
          <view class="book-ops">
            <view class="book-op pressable" @click="openRenameBook(b)">
              <ui-icon name="edit" :size="36" color="#8A8F99" />
            </view>
            <view
              v-if="books.length > 1"
              class="book-op pressable"
              @click="confirmDeleteBook(b)"
            >
              <ui-icon name="trash" :size="36" color="#E5484D" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 数据备份 -->
    <view class="container">
      <view class="section-title">数据备份</view>
      <view class="card menu">
        <view class="menu-item pressable" @click="exportData">
          <view class="menu-icon menu-icon-green">
            <ui-icon name="upload" :size="40" color="#1FA67A" />
          </view>
          <view class="menu-info">
            <text class="menu-label">导出备份</text>
            <text class="menu-desc">把全部账目导出为备份文本，防手机丢失</text>
          </view>
          <ui-icon name="chevronRight" :size="32" color="#C5C9D1" />
        </view>
        <view class="divider"></view>
        <view class="menu-item pressable" @click="importData">
          <view class="menu-icon menu-icon-blue">
            <ui-icon name="download" :size="40" color="#3B82F6" />
          </view>
          <view class="menu-info">
            <text class="menu-label">导入备份</text>
            <text class="menu-desc">从备份文本恢复数据（会覆盖当前数据）</text>
          </view>
          <ui-icon name="chevronRight" :size="32" color="#C5C9D1" />
        </view>
      </view>
    </view>

    <!-- 数据概况 -->
    <view class="container">
      <view class="section-title">当前账本概况</view>
      <view class="card menu">
        <view class="info-row">
          <text class="info-label">客户总数</text>
          <text class="info-value num">{{ customerCount }}</text>
        </view>
        <view class="divider"></view>
        <view class="info-row">
          <text class="info-label">账目流水总数</text>
          <text class="info-value num">{{ txnCount }}</text>
        </view>
      </view>
    </view>

    <!-- 危险操作 -->
    <view class="container">
      <view class="section-title">其他</view>
      <view class="card menu">
        <view class="menu-item pressable" @click="clearAll">
          <view class="menu-icon menu-icon-red">
            <ui-icon name="trash" :size="40" color="#E5484D" />
          </view>
          <view class="menu-info">
            <text class="menu-label text-debt">清空全部数据</text>
            <text class="menu-desc">删除所有客户和账目，不可恢复</text>
          </view>
          <ui-icon name="chevronRight" :size="32" color="#C5C9D1" />
        </view>
      </view>
    </view>

    <view class="version">欠账记账 v1.0.0 · 数据仅存本地</view>

    <!-- 账本新建/重命名弹窗 -->
    <view
      v-if="bookEditOpen"
      class="modal-mask modal-center"
      @click="bookEditOpen = false"
      @touchmove.stop.prevent
    >
      <view class="book-edit-sheet" @click.stop @touchmove.stop>
        <text class="backup-title">{{ bookEditId ? '重命名账本' : '新建账本' }}</text>
        <input
          class="book-edit-input"
          v-model="bookEditName"
          type="text"
          placeholder="如 麻将馆 / 瓷砖生意"
          placeholder-class="field-ph"
          maxlength="12"
          :focus="bookEditOpen"
        />
        <view class="backup-actions">
          <view class="btn btn-ghost backup-btn" @click="bookEditOpen = false">取消</view>
          <view class="btn btn-primary backup-btn" @click="saveBook">保存</view>
        </view>
      </view>
    </view>

    <!-- 备份文本弹窗 -->
    <view v-if="backupOpen" class="modal-mask" @click="backupOpen = false" @touchmove.stop.prevent>
      <view class="backup-sheet" @click.stop @touchmove.stop>
        <text class="backup-title">{{ backupMode === 'export' ? '备份内容' : '粘贴备份内容' }}</text>
        <text class="backup-tip">{{
          backupMode === 'export'
            ? '长按下方文本全选复制，保存到微信收藏 / 备忘录'
            : '把之前导出的备份文本粘贴到下方，点击恢复'
        }}</text>
        <textarea
          class="backup-textarea"
          v-model="backupText"
          :disabled="backupMode === 'export'"
          :placeholder="backupMode === 'import' ? '在此粘贴备份内容…' : ''"
        />
        <view class="backup-actions">
          <view class="btn btn-ghost backup-btn" @click="backupOpen = false">关闭</view>
          <view
            v-if="backupMode === 'export'"
            class="btn btn-primary backup-btn"
            @click="copyBackup"
            >复制</view
          >
          <view
            v-else
            class="btn btn-primary backup-btn"
            @click="doImport"
            >恢复数据</view
          >
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import UiIcon from '../../components/UiIcon.vue'
import { useLedgerStore } from '../../store/ledger.js'

const store = useLedgerStore()

export default {
  components: { UiIcon },
  data() {
    return {
      backupOpen: false,
      backupMode: 'export',
      backupText: '',
      bookEditOpen: false,
      bookEditId: '',
      bookEditName: ''
    }
  },
  computed: {
    books() {
      return store.state.books
    },
    currentBookId() {
      return store.state.currentBookId
    },
    customerCount() {
      return store.currentCustomers().length
    },
    txnCount() {
      return store.currentTransactions().length
    }
  },
  methods: {
    bookDesc(id) {
      const s = store.bookSummary(id)
      return `${s.customerCount} 位客户 · 欠款 ¥${(s.totalDebt / 100).toFixed(2)}`
    },
    openAddBook() {
      this.bookEditId = ''
      this.bookEditName = ''
      this.bookEditOpen = true
    },
    openRenameBook(b) {
      this.bookEditId = b.id
      this.bookEditName = b.name
      this.bookEditOpen = true
    },
    saveBook() {
      const name = this.bookEditName.trim()
      if (!name) {
        uni.showToast({ title: '请输入账本名称', icon: 'none' })
        return
      }
      if (this.bookEditId) {
        store.updateBook(this.bookEditId, name)
      } else {
        const b = store.addBook(name)
        store.switchBook(b.id)
        uni.showToast({ title: '已新建并切换', icon: 'none' })
      }
      this.bookEditOpen = false
    },
    confirmDeleteBook(b) {
      const s = store.bookSummary(b.id)
      uni.showModal({
        title: '删除账本',
        content: `「${b.name}」及其 ${s.customerCount} 位客户、全部账目将被永久删除，不可恢复。`,
        confirmText: '删除',
        confirmColor: '#E5484D',
        success: (res) => {
          if (res.confirm) {
            const ok = store.deleteBook(b.id)
            uni.showToast({ title: ok ? '已删除' : '至少保留一个账本', icon: 'none' })
          }
        }
      })
    },
    exportData() {
      const data = store.exportData()
      this.backupText = JSON.stringify(data)
      this.backupMode = 'export'
      this.backupOpen = true
    },
    importData() {
      this.backupText = ''
      this.backupMode = 'import'
      this.backupOpen = true
    },
    copyBackup() {
      uni.setClipboardData({
        data: this.backupText,
        success: () => {
          uni.showToast({ title: '已复制到剪贴板', icon: 'none' })
        }
      })
    },
    doImport() {
      const text = this.backupText.trim()
      if (!text) {
        uni.showToast({ title: '请先粘贴备份内容', icon: 'none' })
        return
      }
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        uni.showToast({ title: '备份内容格式错误', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认恢复',
        content: '导入将覆盖当前全部数据，确定继续？',
        confirmText: '恢复',
        confirmColor: '#E5484D',
        success: (res) => {
          if (res.confirm) {
            const ok = store.importData(data)
            if (ok) {
              uni.showToast({ title: '恢复成功', icon: 'success' })
              this.backupOpen = false
            } else {
              uni.showToast({ title: '备份内容无效', icon: 'none' })
            }
          }
        }
      })
    },
    clearAll() {
      uni.showModal({
        title: '清空全部数据',
        content: '所有客户和账目将被永久删除，建议先导出备份。确定清空？',
        confirmText: '清空',
        confirmColor: '#E5484D',
        success: (res) => {
          if (res.confirm) {
            store.importData({ customers: [], transactions: [] })
            uni.showToast({ title: '已清空', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
@import '../../styles/tokens.css';

.container {
  margin-top: 24rpx;
}
.section-title {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  margin: 0 8rpx 16rpx;
}
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 8rpx 16rpx;
}
.section-title-row .section-title {
  margin: 0;
}
.add-book {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
}
.add-book-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--color-primary);
  margin-left: 4rpx;
}
.menu {
  padding: 0 32rpx;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  min-height: 88rpx;
}
.book-item-row {
  border-bottom: 1rpx solid var(--color-divider);
}
.menu-item.no-border {
  border-bottom: none;
}
.book-name-row {
  display: flex;
  align-items: center;
}
.book-current-tag {
  font-size: 20rpx;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  padding: 2rpx 12rpx;
  margin-left: 12rpx;
}
.book-ops {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.book-op {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.menu-icon-green { background: var(--color-repay-bg); }
.menu-icon-blue { background: #E8F1FE; }
.menu-icon-red { background: var(--color-debt-bg); }
.menu-info {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}
.menu-label {
  font-size: 30rpx;
  font-weight: 600;
}
.menu-desc {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 6rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 96rpx;
}
.info-label {
  font-size: 30rpx;
}
.info-value {
  font-size: 32rpx;
  font-weight: 700;
}
.version {
  text-align: center;
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  margin-top: 56rpx;
}

/* 备份弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.backup-sheet {
  width: 100%;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 40rpx;
}
.backup-title {
  font-size: 34rpx;
  font-weight: 700;
}
.backup-tip {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 12rpx;
}
.backup-textarea {
  width: 100%;
  height: 320rpx;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 24rpx;
  margin-top: 24rpx;
  font-size: 24rpx;
  box-sizing: border-box;
}
.backup-actions {
  display: flex;
  margin-top: 32rpx;
}
.backup-btn {
  flex: 1;
}
.backup-btn:first-child {
  margin-right: 24rpx;
}

/* 账本编辑弹窗 */
.book-edit-sheet {
  width: 100%;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 40rpx;
}
.book-edit-input {
  width: 100%;
  height: 92rpx;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 0 24rpx;
  margin-top: 24rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}
</style>
