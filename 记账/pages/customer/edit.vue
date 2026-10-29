<template>
  <view class="page-wrap">
    <view class="container">
      <view class="field card">
        <view class="field-row">
          <text class="field-label">姓名</text>
          <input
            class="field-input"
            v-model="name"
            type="text"
            placeholder="必填，如 老王 / 城东瓷砖店"
            placeholder-class="field-ph"
            maxlength="20"
          />
        </view>
        <view class="divider"></view>
        <view class="field-row">
          <text class="field-label">备注</text>
          <input
            class="field-input"
            v-model="note"
            type="text"
            placeholder="可选，如 穿红衣服 / 138电话"
            placeholder-class="field-ph"
            maxlength="40"
          />
        </view>
      </view>
    </view>

    <view class="container">
      <view class="btn btn-primary" @click="save">保存</view>
    </view>

    <view class="container" v-if="isEdit">
      <view class="btn btn-danger-ghost" @click="confirmDelete">
        <ui-icon name="trash" :size="36" color="#E5484D" />
        <text class="del-text">删除该客户</text>
      </view>
      <view class="hint-text">删除后该客户的全部账目记录将一并清除，不可恢复</view>
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
      id: '',
      name: '',
      note: ''
    }
  },
  computed: {
    isEdit() {
      return !!this.id
    }
  },
  onLoad(options) {
    if (options && options.id) {
      this.id = options.id
      const c = store.getCustomer(this.id)
      if (c) {
        this.name = c.name
        this.note = c.note
      }
      uni.setNavigationBarTitle({ title: '编辑客户' })
    } else {
      uni.setNavigationBarTitle({ title: '新建客户' })
    }
  },
  methods: {
    save() {
      const name = this.name.trim()
      if (!name) {
        uni.showToast({ title: '请输入姓名', icon: 'none' })
        return
      }
      if (this.isEdit) {
        store.updateCustomer(this.id, { name, note: this.note })
      } else {
        store.addCustomer({ name, note: this.note })
      }
      uni.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 500)
    },
    confirmDelete() {
      uni.showModal({
        title: '确认删除',
        content: '该客户及其全部账目记录将被永久删除，无法恢复。',
        confirmText: '删除',
        confirmColor: '#E5484D',
        success: (res) => {
          if (res.confirm) {
            store.deleteCustomer(this.id)
            uni.showToast({ title: '已删除', icon: 'none' })
            setTimeout(() => {
              uni.navigateBack({ delta: 2 })
            }, 500)
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
.field {
  padding: 8rpx 32rpx;
}
.field-row {
  display: flex;
  align-items: center;
  min-height: 100rpx;
}
.field-label {
  font-size: 30rpx;
  width: 120rpx;
  flex-shrink: 0;
}
.field-input {
  flex: 1;
  font-size: 30rpx;
}
.field-ph {
  color: #C5C9D1;
}
.btn-danger-ghost {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-debt-bg);
  border-radius: var(--radius-md);
}
.del-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-debt);
  margin-left: 8rpx;
}
.hint-text {
  text-align: center;
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  margin-top: 24rpx;
}
</style>
