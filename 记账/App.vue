<script>
import { useLedgerStore } from './store/ledger'

export default {
  onLaunch: function () {
    const store = useLedgerStore()
    store.init()
  },
  onShow: function () {},
  onHide: function () {}
}
</script>

<style>
@import './styles/common.css';

page {
  background-color: #F5F6F8;
  color: #1A1D21;
  font-size: 32rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Helvetica, sans-serif;
}
</style>
