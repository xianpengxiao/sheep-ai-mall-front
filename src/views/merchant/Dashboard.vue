<template>
  <div class="page-merchant">
    <NavBar title="我的店铺" />

    <!-- ==================== 🏪 店铺信息头部 ==================== -->
    <div v-if="shopInfo" class="shop-header">
      <div class="shop-header-main" @click="openShopDetail">
        <div class="shop-avatar">
          <van-image width="64" height="64" :src="shopInfo.shopLogo || defaultLogo" class="shop-logo-img" />
        </div>
        <div class="shop-meta">
          <div class="shop-name">{{ shopInfo.shopName }}</div>
          <div class="shop-contact">{{ shopInfo.contactName }} | {{ shopInfo.contactPhone }}</div>
          <div class="shop-scope">{{ shopInfo.businessScope || '未设置经营范围' }}</div>
        </div>
      </div>
      <div class="shop-status-row">
        <span class="shop-status-label">营业状态</span>
        <van-switch v-model="shopInfo.shopStatus" :active-value="1" :inactive-value="0" size="20" @change="handleShopStatusChange" />
        <span class="shop-status-text" :class="shopInfo.shopStatus === 1 ? 'on' : 'off'">{{ shopInfo.shopStatus === 1 ? '营业中' : '已打烊' }}</span>
      </div>
    </div>
    <van-loading v-else-if="shopLoading" class="loading-center" size="24" />

    <!-- 店铺详情弹窗（点击头部弹出） -->
    <van-dialog v-model:show="showShopDetail" title="店铺信息" :show-confirm-button="false" closeable close-icon-position="top-left">
      <div class="dialog-body">
        <div class="logo-upload-wrap" @click="logoInputRef?.click()">
          <van-image width="72" height="72" :src="shopForm.logoPreview || shopInfo?.shopLogo || defaultLogo" class="logo-preview" />
          <div class="logo-overlay">
            <van-icon name="camera-o" size="20" color="#fff" />
          </div>
        </div>
        <input ref="logoInputRef" type="file" accept="image/*" class="file-hidden" @change="onLogoSelected" />
        <!-- 营业执照 -->
        <div class="license-section">
          <span class="license-label">营业执照</span>
          <van-image
            width="100%"
            height="auto"
            fit="contain"
            :src="shopInfo?.businessLicense"
            class="license-img"
          />
        </div>
        <van-field v-model="shopForm.shopName" label="店铺名称" placeholder="请输入店铺名称" />
        <van-field v-model="shopForm.businessScope" is-link readonly label="经营范围" placeholder="请选择经营范围" :rules="[{ required: true, message: '请选择经营范围' }]" @click="openScopePicker" />
        <van-field v-model="shopForm.contactName" label="联系人" placeholder="请输入联系人姓名" />
        <van-field v-model="shopForm.contactPhone" label="联系电话" type="tel" placeholder="请输入联系电话" />
        <van-button round block class="dialog-btn" @click="handleSaveShop" :loading="shopSaving">保存</van-button>

      <!-- 经营范围多选 -->
      <van-popup v-model:show="showScopePicker" round position="bottom" class="scope-popup">
        <div class="scope-popup-header">
          <span class="scope-cancel" @click="showScopePicker = false">取消</span>
          <span class="scope-title">选择经营范围</span>
          <span class="scope-confirm" @click="onScopeConfirm">确定</span>
        </div>
        <div class="scope-list">
          <van-checkbox-group v-model="scopeSelected" direction="vertical">
            <van-checkbox v-for="opt in categoryOptions" :key="opt.value" :name="opt.value" shape="square" class="scope-checkbox">
              {{ opt.text }}
            </van-checkbox>
          </van-checkbox-group>
        </div>
      </van-popup>
      </div>
    </van-dialog>


    <!-- ==================== Tabs ==================== -->
    <van-tabs v-model:active="activeTab" class="merchant-tabs">
      <van-tab title="商品管理" name="goods" />
      <van-tab title="订单管理" name="orders" />
      <van-tab title="数据评价" name="data" />
    </van-tabs>

    <div v-show="activeTab === 'goods'" class="tab-content">
      <div class="goods-layout">
        <!-- 左栏：分类列表（sticky 固定，不随页面滚动） -->
        <div class="goods-sidebar">
          <div class="sidebar-title">商品分类</div>
          <div
            class="sidebar-cat"
            :class="{ active: !goodsCategoryId }"
            @click="selectGoodsCategory(null)"
          >全部分类</div>
          <div
            v-for="cat in flatCategories"
            :key="cat.value"
            class="sidebar-cat"
            :class="{ active: goodsCategoryId === cat.value }"
            @click="selectGoodsCategory(cat.value)"
          >{{ cat.text }}</div>
        </div>

        <!-- 右栏：搜索 + 商品列表 -->
        <div class="goods-main">
          <div class="toolbar-sticky"><div class="toolbar">
            <div class="search-bar">
              <van-icon name="search" size="16" color="#9a9aae" />
              <input v-model="goodsKeyword" class="search-input" placeholder="搜索商品名称..." @keyup.enter="handleSearch" />
              <van-icon v-if="goodsKeyword" name="close" size="14" color="#c8c4c0" class="search-clear" @click.stop="clearSearch" />
            </div>
            <van-button round size="small" class="toolbar-btn" @click="openAddGoods">
              <van-icon name="plus" size="14" /> 新增商品
            </van-button>
          </div></div>

          <div v-if="goodsList.length > 0" class="goods-card-list">
            <div v-for="item in goodsList" :key="item.id" class="goods-card">
              <!-- 左：商品主图 -->
              <div class="card-img-wrap" @click="goGoodsDetail(item.id)">
                <van-image width="88" height="88" fit="cover" :src="item.mainImage || defaultImg" class="card-img" />
              </div>

              <!-- 中：核心信息 -->
              <div class="card-info">
                <div class="card-name" @click="goGoodsDetail(item.id)">{{ item.name }}</div>
                <div class="card-subtitle" v-if="item.subTitle" @click="goGoodsDetail(item.id)">{{ item.subTitle }}</div>
                <div class="card-brand-row">
                  <span class="card-brand">{{ item.brand || '未知品牌' }}</span>
                  <span class="card-tag" :class="item.status === 1 ? 'tag-on' : 'tag-off'">{{ item.status === 1 ? '上架' : '下架' }}</span>
                </div>
                <div class="card-price">¥{{ item.minPrice ?? '0.00' }}</div>

                <!-- 库存信息区（悬浮展示 SKU 明细） -->
                <div class="card-stock-row">
                  <div class="stock-info-trigger">
                    <div class="stock-info-bar">
                      <span class="stock-num">库存 {{ item.totalStock ?? '--' }}</span>
                      <span class="stock-status-dot" :class="stockStatusClass(item.stockStatus)"></span>
                      <span class="stock-status-text">{{ stockStatusText(item.stockStatus) }}</span>
                      <span v-if="item.multiSpec" class="badge-multi">多规格</span>
                      <span v-if="item.partOutOfStock" class="badge-part-oos">部分缺货</span>
                      <van-icon name="info-o" size="14" color="#c8c4c0" class="stock-info-icon" />
                    </div>
                    <!-- SKU 库存悬浮弹窗 -->
                    <div class="stock-tooltip">
                      <div class="tooltip-title">SKU 库存明细</div>
                      <div class="tooltip-table">
                        <div class="tooltip-tr tooltip-th">
                          <span class="tt-sku">规格</span>
                          <span class="tt-price">单价</span>
                          <span class="tt-stock">库存</span>
                        </div>
                        <div v-for="sku in (item.skuStockList || [])" :key="sku.skuId" class="tooltip-tr">
                          <span class="tt-sku">{{ sku.skuName }}</span>
                          <span class="tt-price">¥{{ sku.price }}</span>
                          <span class="tt-stock">{{ sku.stock }}</span>
                        </div>
                        <div v-if="!item.skuStockList?.length" class="tooltip-empty">暂无 SKU 数据</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 右：操作按钮 -->
              <div class="card-actions">
                <div class="action-item" @click.stop="editGoods(item)"><van-icon name="edit" size="18" color="#5a5a6e" /><span>编辑</span></div>
                <div class="action-item" @click.stop="handleToggle(item)">
                  <van-icon :name="item.status === 1 ? 'eye-o' : 'closed-eye'" size="18" :color="item.status === 1 ? '#07c160' : '#c8c4c0'" />
                  <span>{{ item.status === 1 ? '下架' : '上架' }}</span>
                </div>
                <div class="action-item" @click.stop="handleDeleteGoods(item)"><van-icon name="delete" size="18" color="#e8573a" /><span>删除</span></div>
              </div>
            </div>
          </div>
          <van-empty v-if="!goodsLoading && goodsList.length === 0" description="暂无商品" />

          <van-pagination
            v-if="goodsTotal > 0"
            v-model="goodsPage"
            :total-items="goodsTotal"
            :items-per-page="10"
            @change="onGoodsPageChange"
            mode="simple"
            class="goods-pagination"
          />
        </div>
      </div>

      <!-- 新增商品弹窗 -->
      <van-dialog v-model:show="showAddGoods" title="新增商品" :show-confirm-button="false" closeable close-icon-position="top-left" class="edit-goods-dialog">
        <GoodsForm ref="addGoodsFormRef" :init-form="{}" submit-text="提交商品" @submit="handleAddGoods" />
      </van-dialog>

      <!-- 编辑商品弹窗 -->
      <van-dialog v-model:show="showEditGoods" title="编辑商品" :show-confirm-button="false" closeable close-icon-position="top-left" class="edit-goods-dialog">
        <GoodsForm ref="editGoodsFormRef" :init-form="editGoodsData" submit-text="保存" @submit="handleEditGoods" />
      </van-dialog>
    </div>

    <!-- ==================== Tab 订单管理 ==================== -->
    <div v-show="activeTab === 'orders'" class="tab-content">
      <div class="order-summary">共 {{ orderTotal }} 笔订单</div>

      <van-tabs v-model:active="orderStatus" class="order-status-tabs" @change="onOrderStatusChange">
        <van-tab title="全部" :name="-1" />
        <van-tab title="待付款" :name="0" />
        <van-tab title="已支付" :name="1" />
        <van-tab title="已发货" :name="2" />
        <van-tab title="已完成" :name="3" />
        <van-tab title="已取消" :name="4" />
      </van-tabs>

      <van-list v-model:loading="orderLoading" :finished="orderFinished" finished-text="没有更多了" @load="fetchOrders">
        <div class="list-items">
          <div v-for="item in orderList" :key="item.id" class="list-item order-item">
            <div class="order-info">
              <div class="order-product">
                <span class="order-product-name">{{ item.items?.[0]?.spuName || '未知商品' }}</span>
                <span v-if="item.items?.[0]?.skuName" class="order-product-sku">{{ item.items[0].skuName }}</span>
                <span class="order-product-qty">×{{ item.items?.[0]?.quantity || 0 }}</span>
                <span v-if="(item.items?.length || 0) > 1" class="order-product-more">等{{ item.items.length }}件商品</span>
              </div>
              <div class="order-amount">¥{{ item.payAmount || item.totalAmount || '0.00' }}</div>
              <div class="order-contact">{{ item.receiverName }} {{ item.receiverPhone }}</div>
              <div class="order-address">{{ item.receiverAddress }}</div>
              <div class="order-bottom">
                <span class="order-time">{{ item.createTime }}</span>
                <span class="order-status" :class="'status-' + item.status">{{ item.statusText || orderStatusText(item.status) }}</span>
              </div>
            </div>
            <div class="order-actions">
              <van-button size="mini" round plain class="action-btn" @click="viewOrder(item)">详情</van-button>
              <van-button v-if="item.status === 1" size="mini" round class="action-btn primary" @click="handleDeliver(item)">发货</van-button>
            </div>
          </div>
        </div>
        <van-empty v-if="!orderLoading && orderList.length === 0" description="暂无订单" />
      </van-list>

      <!-- 订单详情弹窗 -->
      <van-dialog v-model:show="showOrderDetail" title="订单详情" :show-confirm-button="false" closeable close-icon-position="top-left" class="order-detail-dialog">
        <div class="dialog-body">
          <div class="detail-row"><span class="detail-lbl">订单编号</span><span class="detail-val">{{ orderDetail.orderNo || orderDetail.id }}</span></div>
          <div class="detail-row"><span class="detail-lbl">订单状态</span><span class="detail-val"><span class="order-status-text" :class="'s-' + orderDetail.status">{{ orderDetail.statusText || orderStatusText(orderDetail.status) }}</span></span></div>
          <div class="detail-row"><span class="detail-lbl">收货人</span><span class="detail-val">{{ orderDetail.receiverName }}</span></div>
          <div class="detail-row"><span class="detail-lbl">联系电话</span><span class="detail-val">{{ orderDetail.receiverPhone }}</span></div>
          <div class="detail-row"><span class="detail-lbl">收货地址</span><span class="detail-val">{{ orderDetail.receiverAddress }}</span></div>
          <div v-if="orderDetail.remark" class="detail-row"><span class="detail-lbl">备注</span><span class="detail-val">{{ orderDetail.remark }}</span></div>
          <div class="detail-divider"></div>
          <div class="detail-row"><span class="detail-lbl">商品总额</span><span class="detail-val">¥{{ orderDetail.totalAmount || '0.00' }}</span></div>
          <div class="detail-row"><span class="detail-lbl">实付金额</span><span class="detail-val price">¥{{ orderDetail.payAmount || orderDetail.totalAmount || '0.00' }}</span></div>
          <div class="detail-row"><span class="detail-lbl">下单时间</span><span class="detail-val">{{ orderDetail.createTime }}</span></div>
          <div v-if="orderDetail.payTime" class="detail-row"><span class="detail-lbl">付款时间</span><span class="detail-val">{{ orderDetail.payTime }}</span></div>
          <div v-if="orderDetail.deliveryTime" class="detail-row"><span class="detail-lbl">发货时间</span><span class="detail-val">{{ orderDetail.deliveryTime }}</span></div>

          <!-- 商品列表 -->
          <div v-if="orderDetail.items?.length" class="detail-goods-section">
            <div class="detail-goods-title">商品信息</div>
            <div v-for="item in orderDetail.items" :key="item.id" class="detail-goods-item">
              <van-image width="56" height="56" fit="cover" :src="item.image" class="goods-thumb" />
              <div class="goods-detail">
                <div class="goods-name">{{ item.spuName }}</div>
                <div class="goods-sku">{{ item.skuName }}</div>
                <div class="goods-price-qty">
                  <span class="goods-price">¥{{ item.price }}</span>
                  <span class="goods-qty">×{{ item.quantity }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </van-dialog>

      <!-- 发货表单弹窗 -->
      <van-dialog v-model:show="showDeliverForm" title="订单发货" :show-confirm-button="false" closeable close-icon-position="top-left">
        <div class="dialog-body">
          <van-field
            v-model="deliverForm.company"
            is-link
            readonly
            label="快递公司"
            placeholder="请选择快递公司"
            :rules="[{ required: true, message: '请选择快递公司' }]"
            @click="showCompanyPicker = true"
          />
          <van-field
            v-model="deliverForm.trackingNo"
            label="快递单号"
            placeholder="请输入快递单号"
            :rules="[{ required: true, message: '请输入快递单号' }]"
          />
          <van-button round block class="dialog-btn" @click="confirmDeliver" :loading="deliverLoading">确认发货</van-button>
        </div>
      </van-dialog>

      <!-- 快递公司选择器 -->
      <van-action-sheet v-model:show="showCompanyPicker" title="选择快递公司" @cancel="showCompanyPicker = false">
        <div class="company-list">
          <div
            v-for="name in deliveryCompanies"
            :key="name"
            class="company-item"
            @click="onCompanyConfirm(name)"
          >{{ name }}</div>
        </div>
      </van-action-sheet>
    </div>

    <!-- ==================== Tab 数据评价 ==================== -->
    <div v-show="activeTab === 'data'" class="tab-content">
      <!-- 营收概览 -->
      <div class="revenue-cards">
        <div class="revenue-card">
          <div class="revenue-num">¥{{ stats.totalAmount ?? '0.00' }}</div>
          <div class="revenue-lbl">总营收</div>
        </div>
        <div class="revenue-card">
          <div class="revenue-num">¥{{ stats.monthAmount ?? '0.00' }}</div>
          <div class="revenue-lbl">本月营收</div>
        </div>
        <div class="revenue-card">
          <div class="revenue-num">{{ stats.totalOrderCount ?? 0 }}</div>
          <div class="revenue-lbl">总订单</div>
        </div>
      </div>
      <!-- DSR 评分概览 -->
      <div class="dsr-section">
        <div class="dsr-cards">
          <div class="dsr-card">
            <div class="dsr-score">{{ dsr.describeScore ?? '--' }}</div>
            <div class="dsr-label">描述相符</div>
            <div class="dsr-bar-wrap"><div class="dsr-bar" :style="{ width: dsrBarWidth(dsr.describeScore) }"></div></div>
          </div>
          <div class="dsr-card">
            <div class="dsr-score">{{ dsr.serviceScore ?? '--' }}</div>
            <div class="dsr-label">服务态度</div>
            <div class="dsr-bar-wrap"><div class="dsr-bar service" :style="{ width: dsrBarWidth(dsr.serviceScore) }"></div></div>
          </div>
          <div class="dsr-card">
            <div class="dsr-score">{{ dsr.logisticsScore ?? '--' }}</div>
            <div class="dsr-label">物流服务</div>
            <div class="dsr-bar-wrap"><div class="dsr-bar logistics" :style="{ width: dsrBarWidth(dsr.logisticsScore) }"></div></div>
          </div>
        </div>
        <div class="dsr-footer">近90天有效评价 {{ dsr.totalCount || 0 }} 条 · 本月新增 {{ dsr.monthCount || 0 }} 条</div>
      </div>

      <!-- DSR 近30天趋势 -->
      <div class="chart-section">
        <div class="section-title">DSR 近30天趋势</div>
        <div class="chart-wrap">
          <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="dsr-svg" v-if="dsrTrend.length > 0">
            <!-- Y 轴网格线 -->
            <line v-for="y in svgGridY" :key="y" :x1="padL" :y1="y" :x2="svgW - padR" :y2="y" stroke="#f0ece8" stroke-width="1" />
            <!-- 三条折线 -->
            <polyline :points="svgLine('describeScore')" fill="none" stroke="#e8573a" stroke-width="2" stroke-linejoin="round" />
            <polyline :points="svgLine('serviceScore')" fill="none" stroke="#1989fa" stroke-width="2" stroke-linejoin="round" />
            <polyline :points="svgLine('logisticsScore')" fill="none" stroke="#07c160" stroke-width="2" stroke-linejoin="round" />
            <!-- X 轴日期（首+尾） -->
            <text :x="padL" :y="svgH - 4" font-size="10" fill="#c8c4c0">{{ dsrTrend[0]?.statDate?.slice(5) || '' }}</text>
            <text :x="svgW - padR" :y="svgH - 4" font-size="10" fill="#c8c4c0" text-anchor="end">{{ dsrTrend[dsrTrend.length - 1]?.statDate?.slice(5) || '' }}</text>
          </svg>
          <van-empty v-else description="暂无趋势数据" />
        </div>
        <div class="high-rate">
          <span class="rate-item"><span class="dot describe"></span>描述 {{ dsrHighRate('describeHighRate') }}</span>
          <span class="rate-item"><span class="dot service"></span>服务 {{ dsrHighRate('serviceHighRate') }}</span>
          <span class="rate-item"><span class="dot logistics"></span>物流 {{ dsrHighRate('logisticsHighRate') }}</span>
        </div>
      </div>

      <!-- 评价列表 -->
      <div class="review-section">
        <div class="section-title">店铺评价</div>
        <div class="review-filter">
          <span class="filter-btn" :class="{ active: reviewRating === 0 }" @click="filterReviews(0)">全部</span>
          <span class="filter-btn" :class="{ active: reviewRating === 1 }" @click="filterReviews(1)">好评</span>
          <span class="filter-btn" :class="{ active: reviewRating === 2 }" @click="filterReviews(2)">中评</span>
          <span class="filter-btn" :class="{ active: reviewRating === 3 }" @click="filterReviews(3)">差评</span>
        </div>
        <div class="review-list">
          <div v-for="item in filteredReviews" :key="item.id" class="review-item">
            <div class="review-user-row">
              <van-image v-if="item.avatar" round width="32" height="32" :src="item.avatar" class="review-avatar" />
              <div v-else class="review-avatar-placeholder"><van-icon name="user-o" size="16" color="#c8c4c0" /></div>
              <div class="review-user-info">
                <span class="review-username">{{ item.memberName || item.username || '匿名用户' }}</span>
                <span class="review-time">{{ item.createTime }}</span>
              </div>
              <span class="review-stars">
                <van-icon v-for="s in 5" :key="s" :name="s <= item.rating ? 'star' : 'star-o'" size="13" :color="s <= item.rating ? '#f39c12' : '#e0dcd8'" />
              </span>
            </div>
            <div class="review-content">{{ item.content }}</div>
            <div v-if="item.imageList?.length" class="review-images">
              <van-image v-for="(img, i) in item.imageList" :key="i" width="64" height="64" fit="cover" :src="img" class="review-img" />
            </div>
          </div>
        </div>
        <van-empty v-if="!reviewLoading && filteredReviews.length === 0" description="暂无评价" />
        <van-pagination
          v-if="reviewTotal > 0"
          v-model="reviewPage"
          :total-items="reviewTotal"
          :items-per-page="10"
          @change="fetchReviews"
          mode="simple"
          class="review-pagination"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onActivated, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import GoodsForm from '../../components/goods/GoodsForm.vue'
import { getShopInfo, updateShopInfo, getShopOrders, getShopStats, getShopReviews, updateMerchantGoods, getMerchantGoodsPage, getDsrTrend, updateShopStatus, publishGoods, toggleMerchantGoodsStatus } from '../../api/merchant.js'
import { getSpuDetail, deleteSpu } from '../../api/goods.js'
import { getOrderDetail, deliverOrder } from '../../api/order.js'
import { getTree } from '../../api/category.js'
const router = useRouter()
const defaultImg = 'https://img.yzcdn.cn/vant/ipad.jpeg'
const defaultLogo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e8573a' rx='16'/%3E%3Ctext x='50' y='66' text-anchor='middle' font-size='44' fill='%23fff'%3E🏪%3C/text%3E%3C/svg%3E"

const activeTab = ref('goods')

// 经营范围选择
const showScopePicker = ref(false)
const categoryOptions = ref([])
const scopeSelected = ref([])
function flattenTree(nodes, depth = 0) {
  const result = []
  for (const node of nodes) {
    result.push({ text: '  '.repeat(depth) + node.name, value: node.name })
    if (node.children?.length) result.push(...flattenTree(node.children, depth + 1))
  }
  return result
}
onMounted(async () => {
  try {
    const tree = await getTree()
    categoryOptions.value = flattenTree(tree || [])
    // build flat category list for goods filter
    const cats = []
    function walk(nodes) {
      for (const n of nodes) {
        cats.push({ text: n.name, value: n.id })
        if (n.children?.length) walk(n.children)
      }
    }
    walk(tree || [])
    flatCategories.value = cats
  } catch { categoryOptions.value = []; flatCategories.value = [] }
})
function onScopeConfirm() {
  shopForm.businessScope = scopeSelected.value.join('、')
  showScopePicker.value = false
}

function openScopePicker() {
  scopeSelected.value = shopForm.businessScope ? shopForm.businessScope.split('、') : []
  showScopePicker.value = true
}

// ═══════════════ 店铺管理 ═══════════════
const shopLoading = ref(false)
const shopInfo = ref(null)
const showShopDetail = ref(false)
const shopSaving = ref(false)

const shopForm = reactive({ shopName: '', businessScope: '', contactName: '', contactPhone: '', logoPreview: '' })
const logoInputRef = ref(null)
const logoFile = ref(null)

function onLogoSelected(e) {
  const f = e.target.files?.[0]
  if (!f) return
  logoFile.value = f
  const reader = new FileReader()
  reader.onload = (ev) => { shopForm.logoPreview = ev.target?.result || '' }
  reader.readAsDataURL(f)
}

async function fetchShop() {
  shopLoading.value = true
  try { shopInfo.value = await getShopInfo() }
  catch { shopInfo.value = null }
  finally { shopLoading.value = false }
}

function openShopDetail() {
  if (!shopInfo.value) return
  shopForm.shopName = shopInfo.value.shopName || ''
  shopForm.businessScope = shopInfo.value.businessScope || ''
  shopForm.contactName = shopInfo.value.contactName || ''
  shopForm.contactPhone = shopInfo.value.contactPhone || ''
  shopForm.logoPreview = ''
  logoFile.value = null
  showShopDetail.value = true
}

async function handleSaveShop() {
  if (!shopForm.shopName) return showToast('请输入店铺名称')
  shopSaving.value = true
  try {
    let logoUrl = shopInfo.value?.shopLogo
    if (logoFile.value) {
      const { uploadImage } = await import('../../api/merchant.js')
      logoUrl = await uploadImage(logoFile.value, 'cert')
    }
    await updateShopInfo({ shopName: shopForm.shopName, businessScope: shopForm.businessScope, contactName: shopForm.contactName, contactPhone: shopForm.contactPhone, shopLogo: logoUrl })
    showToast('保存成功')
    showShopDetail.value = false
    await fetchShop()
  } catch { /* toast by interceptor */ }
  finally { shopSaving.value = false }
}

// ═══════════════ 商品管理 ═══════════════
const goodsList = ref([])
const goodsLoading = ref(false)
const goodsFinished = ref(false)
const goodsPage = ref(1)
const goodsTotal = ref(0)
const goodsKeyword = ref('')
const goodsCategoryId = ref(null)
const showEditGoods = ref(false)
const editGoodsData = ref({})
const editGoodsId = ref(null)
const editGoodsFormRef = ref(null)

/** API 返回的全量商品列表（用于前端分类过滤） */
const allGoodsCache = ref([])
const allGoodsTotal = ref(0)

/** 根据 selectedCategoryId 前端过滤后的列表 */
const filteredGoods = computed(() => {
  let list = allGoodsCache.value
  if (goodsCategoryId.value) {
    list = list.filter(item => String(item.categoryId) === String(goodsCategoryId.value))
  }
  return list
})

/** 当前页展示的数据（前端分页） */
const displayGoods = computed(() => {
  const start = (goodsPage.value - 1) * 10
  return filteredGoods.value.slice(start, start + 10)
})

watch(filteredGoods, (list) => {
  goodsTotal.value = list.length
  // 如果当前页超出范围，回到第1页
  const maxPage = Math.max(1, Math.ceil(list.length / 10))
  if (goodsPage.value > maxPage) goodsPage.value = maxPage
}, { immediate: true })

async function fetchGoods() {
  goodsLoading.value = true
  try {
    const params = { pageNum: 1, pageSize: 999 }  // 一次拉取足够多，前端做分类过滤
    if (goodsKeyword.value) params.keyword = goodsKeyword.value
    const res = await getMerchantGoodsPage(params)
    allGoodsCache.value = res?.records || []
    allGoodsTotal.value = res?.total || 0
    goodsTotal.value = filteredGoods.value.length
    goodsPage.value = 1
    goodsFinished.value = true
    // 同步到 goodsList 供模板渲染
    goodsList.value = displayGoods.value
  } catch { goodsFinished.value = true; goodsList.value = [] }
  finally { goodsLoading.value = false }
}

/* 监听分类或关键词变化，保持 goodsList 同步 */
watch(displayGoods, (list) => {
  goodsList.value = list
}, { immediate: true })

function handleSearch() {
  goodsPage.value = 1
  fetchGoods()
}

function clearSearch() {
  goodsKeyword.value = ''
  goodsPage.value = 1
  fetchGoods()
}

function onGoodsPageChange() {
  // 前端分页，直接从 computed 同步
  goodsList.value = displayGoods.value
}

const flatCategories = ref([])

function selectGoodsCategory(id) {
  goodsCategoryId.value = id
  goodsPage.value = 1
  // 前端过滤自动生效，不需要重新请求 API
}

const showAddGoods = ref(false)
const addGoodsFormRef = ref(null)

function openAddGoods() {
  addGoodsFormRef.value?.resetForm()
  showAddGoods.value = true
}

async function handleAddGoods(payload) {
  await publishGoods(payload)
  showToast('发布成功')
  showAddGoods.value = false
  goodsPage.value = 1; goodsFinished.value = false; fetchGoods()
}

async function editGoods(item) {
  editGoodsId.value = item.id
  try {
    const detail = await getSpuDetail(item.id)
    editGoodsData.value = { ...detail }
  } catch {
    editGoodsData.value = { ...item }
  }
  showEditGoods.value = true
}

async function handleEditGoods(payload) {
  await updateMerchantGoods(editGoodsId.value, payload)
  showToast('保存成功')
  showEditGoods.value = false
  goodsPage.value = 1; goodsFinished.value = false; fetchGoods()
}

async function handleToggle(item) {
  const action = item.status === 1 ? '下架' : '上架'
  const newStatus = item.status === 1 ? 0 : 1
  try {
    await showConfirmDialog({ title: '提示', message: `确认${action}该商品？`, confirmButtonText: '确定', cancelButtonText: '取消' })
    await toggleMerchantGoodsStatus(item.id, newStatus)
    showToast(`${action}成功`)
    goodsPage.value = 1; goodsFinished.value = false; fetchGoods()
  } catch { /* cancel */ }
}

async function handleDeleteGoods(item) {
  try {
    await showConfirmDialog({ title: '提示', message: `确认删除商品「${item.name}」？删除后不可恢复。`, confirmButtonText: '删除', cancelButtonText: '取消' })
    await deleteSpu(item.id)
    showToast('删除成功')
    goodsPage.value = 1; goodsFinished.value = false; fetchGoods()
  } catch { /* cancel or error */ }
}

function goGoodsDetail(id) {
  router.push('/goods/' + id)
}

function stockStatusText(status) {
  const map = { 0: '售罄', 1: '正常', 2: '紧张' }
  return map[status] ?? '--'
}
function stockStatusClass(status) {
  const map = { 0: 'stock-oos', 1: 'stock-ok', 2: 'stock-low' }
  return map[status] ?? ''
}
function handleStockManage(item) {
  showToast('库存管理功能开发中')
}

// ═══════════════ 订单管理 ═══════════════
const orderList = ref([])
const orderLoading = ref(false)
const orderFinished = ref(false)
const orderPage = ref(1)
const orderTotal = ref(0)
const orderStatus = ref(-1)
const showOrderDetail = ref(false)
const orderDetail = ref({})

function orderStatusText(s) {
  const map = { 0: '待付款', 1: '已支付', 2: '已发货', 3: '已完成', 4: '已取消' }
  return map[s] ?? '未知'
}

async function fetchOrders() {
  try {
    const params = { pageNum: orderPage.value, pageSize: 10 }
    if (orderStatus.value >= 0) params.status = orderStatus.value
    const res = await getShopOrders(params)
    const records = res?.records || []
    orderTotal.value = res?.total || 0
    orderList.value.push(...records)
    orderPage.value++
    if (records.length < 10) orderFinished.value = true
  } catch { orderFinished.value = true }
  finally { orderLoading.value = false }
}

function onOrderStatusChange() {
  orderList.value = []; orderPage.value = 1; orderFinished.value = false; orderLoading.value = true
  fetchOrders()
}

async function viewOrder(item) {
  try {
    orderDetail.value = await getOrderDetail(String(item.id))
    showOrderDetail.value = true
  } catch { /* toast */ }
}

const deliveryCompanies = [
  '顺丰速运', '中通快递', '圆通速递', '韵达快递', '申通快递',
  '百世快递', '京东快递', '邮政EMS', '德邦快递', '极兔速递',
  '菜鸟速递', '丹鸟物流', '跨越速运', '壹米滴答',
]
const showDeliverForm = ref(false)
const showCompanyPicker = ref(false)
const deliverLoading = ref(false)
const deliverForm = reactive({ company: '', trackingNo: '' })
const deliveringOrderId = ref('')

function onCompanyConfirm(name) {
  deliverForm.company = name
  showCompanyPicker.value = false
}

function handleDeliver(item) {
  deliveringOrderId.value = String(item.id)
  deliverForm.company = ''
  deliverForm.trackingNo = ''
  showDeliverForm.value = true
}

async function confirmDeliver() {
  if (!deliverForm.company) return showToast('请选择快递公司')
  if (!deliverForm.trackingNo) return showToast('请输入快递单号')
  deliverLoading.value = true
  try {
    await deliverOrder(deliveringOrderId.value, deliverForm.company, deliverForm.trackingNo)
    showToast('已发货')
    showDeliverForm.value = false
    orderList.value = []; orderPage.value = 1; orderFinished.value = false
  } catch { /* toast */ }
  finally { deliverLoading.value = false }
}

// ═══════════════ 数据评价 ═══════════════
const stats = ref({ totalAmount: 0, monthAmount: 0, totalOrderCount: 0 })
const dsr = ref({})
const dsrTrend = ref([])
const reviewList = ref([])
const reviewLoading = ref(false)
const reviewPage = ref(1)
const reviewTotal = ref(0)
const reviewRating = ref(0)

// SVG 图表常量
const padL = 30, padR = 10, padT = 8, padB = 18
const svgW = 340, svgH = 120
const chartW = svgW - padL - padR
const chartH = svgH - padT - padB
const svgGridY = [padT, padT + chartH / 2, padT + chartH]

function dsrBarWidth(score) {
  if (!score && score !== 0) return '0%'
  return Math.min(100, Math.round((score / 5) * 100)) + '%'
}

function dsrHighRate(key) {
  const v = dsr.value[key]
  return v != null ? `${(v * 100).toFixed(0)}%` : '--'
}

function svgLine(field) {
  const trend = dsrTrend.value
  if (!trend?.length) return ''
  const minScore = 4.0, maxScore = 5.0
  return trend.map((d, i) => {
    const x = padL + (i / Math.max(trend.length - 1, 1)) * chartW
    const val = d[field] ?? minScore
    const y = padT + chartH - ((val - minScore) / (maxScore - minScore)) * chartH
    return `${x},${y}`
  }).join(' ')
}

function scoreClass(s) {
  if (!s) return ''
  if (s >= 4) return 'score-high'
  if (s >= 3) return 'score-mid'
  return 'score-low'
}

async function fetchDsr() {
  try {
    const data = await getDsrTrend()
    dsr.value = data
    dsrTrend.value = data?.trend || []
  } catch { /* silent */ }
}

const filteredReviews = computed(() => {
  const r = reviewRating.value
  if (r === 0) return reviewList.value
  return reviewList.value.filter(item => {
    if (r === 1) return item.rating >= 4  // 好评
    if (r === 2) return item.rating === 3  // 中评
    if (r === 3) return item.rating <= 2  // 差评
    return true
  })
})

async function fetchReviews() {
  reviewLoading.value = true
  try {
    const res = await getShopReviews({ pageNum: reviewPage.value, pageSize: 10 })
    reviewList.value = res?.records || []
    reviewTotal.value = res?.total || 0
  } catch { reviewList.value = [] }
  finally { reviewLoading.value = false }
}

function filterReviews(rating) {
  reviewRating.value = rating
  reviewPage.value = 1
  fetchReviews()
}

async function handleShopStatusChange() {
  try {
    const newStatus = await updateShopStatus()
    shopInfo.value.shopStatus = newStatus
    showToast(newStatus === 1 ? '已营业' : '已打烊')
  } catch {
    // 还原开关状态
    shopInfo.value.shopStatus = shopInfo.value.shopStatus === 1 ? 0 : 1
  }
}

// ── Tab 切换懒加载 ──
watch(activeTab, (tab) => {
  if (tab === 'goods' && goodsList.value.length === 0) {
    goodsList.value = []; goodsPage.value = 1; goodsFinished.value = false; fetchGoods()
  }
  if (tab === 'orders' && orderList.value.length === 0) {
    orderList.value = []; orderPage.value = 1; orderFinished.value = false; orderLoading.value = true; fetchOrders()
  }
  if (tab === 'data') {
    fetchDsr()
    getShopStats().then(data => { stats.value = data }).catch(() => {})
    if (reviewList.value.length === 0) {
      reviewPage.value = 1; fetchReviews()
    }
  }
})

onActivated(() => {
  fetchShop()
  if (activeTab.value === 'goods' && goodsList.value.length === 0) fetchGoods()
})
</script>

<style scoped>
.page-merchant {
  min-height: 100vh;
  background: #f5f3f0;
}
.loading-center { padding: 60px 0; }
.tab-content { padding: 12px 16px 24px; }

/* ── 店铺头部 ── */
.shop-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 16px;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
  position: relative;
}
.shop-avatar {
  flex-shrink: 0;
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,0.4);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255,255,255,0.15);
}
.shop-logo-img {
  border-radius: 12px;
}
.shop-meta { flex: 1; min-width: 0; }
.shop-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.shop-contact { font-size: 13px; opacity: 0.9; }
.shop-scope { font-size: 12px; opacity: 0.75; margin-top: 2px; }

/* ── 订单汇总 ── */
.order-summary { font-size: 13px; color: #9a9aae; margin-bottom: 8px; }
.order-status-tabs { margin-bottom: 8px; }

/* ── Merchant Tabs ── */
.merchant-tabs {
  margin-top: 12px;
}

/* ── 弹窗表单 ── */
.dialog-body { padding: 16px 20px 24px; display: flex; flex-direction: column; align-items: center; }
.license-section {
  width: 100%;
  margin-bottom: 12px;
}
.license-label {
  display: block;
  font-size: 13px;
  color: #5a5a6e;
  margin-bottom: 6px;
}
.license-img {
  border-radius: 8px;
  border: 1px solid #f0ece8;
}
.dialog-btn {
  margin-top: 16px; height: 40px; font-size: 14px; font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important; width: 100%;
}

/* ── Logo 上传 ── */
.logo-upload-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  margin-bottom: 16px;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
}
.logo-preview { border-radius: 12px; }
.logo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 12px;
}
.logo-upload-wrap:hover .logo-overlay { opacity: 1; }
.file-hidden { display: none; }

/* ── 分类选择按钮 ── */
.toolbar-btn-cat {
  flex-shrink: 0;
  font-size: 12px;
  color: #5a5a6e !important;
  border-color: #d0ccc8 !important;
  padding: 0 10px;
  height: 32px;
}
.category-sheet-list { padding: 8px 16px 24px; max-height: 50vh; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 10px; }
.category-sheet-item {
  flex: 0 0 calc(33.33% - 7px);
  padding: 10px 0;
  text-align: center;
  font-size: 13px;
  color: #1a1a2e;
  background: #f5f3f0;
  border-radius: 8px;
  cursor: pointer;
}
.category-sheet-item:active { background: #e0dcd8; }
.category-sheet-item.active { background: #e8573a; color: #fff; }

/* ── 工具栏 ── */
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.toolbar-btn {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important; font-weight: 600; padding: 0 16px;
}

/* ── 搜索栏 ── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  background: #fff;
  border-radius: 20px;
  padding: 0 12px;
  height: 36px;
  border: 1px solid #e0dcd8;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #1a1a2e;
  background: transparent;
}
.search-input::placeholder { color: #c8c4c0; }
.search-clear { cursor: pointer; }
.goods-pagination { margin-top: 16px; }

/* ── 商品列表 ── */
.list-items { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.list-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #f0ece8; cursor: pointer; transition: background 0.15s; }
.list-item:hover { background: #faf8f6; }
.list-item:last-child { border-bottom: none; }
.item-img { border-radius: 8px; flex-shrink: 0; }
.item-info { flex: 1; min-width: 0; }
.item-name { font-size: 14px; font-weight: 500; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.item-price { font-size: 15px; font-weight: 700; color: #e8573a; }
.item-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.tag-on { background: #e8f8ee; color: #07c160; }
.tag-off { background: #f5f3f0; color: #9a9aae; }
.item-actions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }

/* ── 商品卡片样式 ── */
.goods-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.goods-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s;
}
.goods-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

/* 左：主图 */
.card-img-wrap {
  flex-shrink: 0;
  width: 88px;
  height: 88px;
  border-radius: 10px;
  overflow: hidden;
  background: #f5f3f0;
  border: 1px solid #f0ece8;
  cursor: pointer;
}
.card-img { border-radius: 10px; }

/* 中：信息区 */
.card-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}
.card-subtitle {
  font-size: 12px;
  color: #9a9aae;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}
.card-brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.card-brand {
  font-size: 12px;
  color: #5a5a6e;
}
.card-price {
  font-size: 18px;
  font-weight: 700;
  color: #e8573a;
  margin-bottom: 6px;
}
.card-tag {
  font-size: 11px;
  padding: 1px 10px;
  border-radius: 10px;
  font-weight: 500;
}
.tag-on { background: #e8f8ee; color: #07c160; }
.tag-off { background: #f5f3f0; color: #9a9aae; }

/* 库存行 */
.card-stock-row {
  margin-top: 2px;
}
.stock-info-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.stock-info-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5a5a6e;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 6px;
  background: #faf8f6;
  transition: background 0.15s;
}
.stock-info-bar:hover {
  background: #f0ece8;
}
.stock-num { font-weight: 500; }
.stock-status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.stock-status-dot.stock-ok { background: #07c160; }
.stock-status-dot.stock-low { background: #f39c12; }
.stock-status-dot.stock-oos { background: #e8573a; }
.stock-status-text { font-size: 11px; color: #9a9aae; }
.stock-info-icon { margin-left: 2px; }

/* 库存 Badge */
.badge-multi, .badge-part-oos {
  font-size: 10px;
  padding: 0 6px;
  border-radius: 4px;
  font-weight: 500;
  line-height: 16px;
}
.badge-multi { background: #e3f2fd; color: #1989fa; }
.badge-part-oos { background: #fff3e0; color: #f39c12; }

/* SKU 库存悬浮弹窗 */
.stock-tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.14);
  padding: 12px 14px;
  min-width: 220px;
  z-index: 20;
  white-space: nowrap;
}
.stock-info-trigger:hover .stock-tooltip {
  display: block;
}
.stock-info-trigger:hover .stock-tooltip::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 20px;
  width: 10px; height: 10px;
  background: #fff;
  transform: rotate(45deg);
  box-shadow: 3px 3px 6px rgba(0,0,0,0.06);
}
.tooltip-title {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 8px;
}
.tooltip-table {
  font-size: 12px;
}
.tooltip-tr {
  display: flex;
  gap: 16px;
  padding: 4px 0;
  border-bottom: 1px solid #f5f3f0;
}
.tooltip-tr:last-child { border-bottom: none; }
.tooltip-th {
  font-weight: 600;
  color: #9a9aae;
  font-size: 11px;
}
.tt-sku { width: 70px; color: #1a1a2e; }
.tt-price { width: 60px; text-align: right; color: #e8573a; }
.tt-stock { width: 50px; text-align: right; color: #1a1a2e; }
.tooltip-th .tt-sku,
.tooltip-th .tt-price,
.tooltip-th .tt-stock { color: #9a9aae; }
.tooltip-empty {
  font-size: 12px;
  color: #c8c4c0;
  padding: 8px 0;
  text-align: center;
}

/* 右：操作按钮 */
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  padding-left: 4px;
}
.action-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.action-item:hover { background: #f5f3f0; }
.action-item:active { background: #e0dcd8; }
.action-item span {
  font-size: 11px;
  color: #5a5a6e;
}

.scope-popup {
  max-height: 60vh;
}
.scope-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f0ece8;
}
.scope-cancel {
  font-size: 14px;
  color: #9a9aae;
}
.scope-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
}
.scope-confirm {
  font-size: 14px;
  color: #e8573a;
  font-weight: 500;
}
.scope-list {
  padding: 12px 16px;
  max-height: 40vh;
  overflow-y: auto;
}
.scope-checkbox {
  padding: 10px 0;
}

/* ── 编辑商品弹窗 ── */
:deep(.edit-goods-dialog) {
  width: 92% !important;
  max-width: 520px;
}
:deep(.edit-goods-dialog .van-dialog__content) {
  max-height: 80vh;
  overflow-y: auto;
}

/* ── 订单管理 ── */
.order-item { display: flex; align-items: center; padding: 12px; }
.order-info { flex: 1; min-width: 0; }
.order-product { margin-bottom: 4px; }
.order-product-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.order-product-sku { font-size: 12px; color: #9a9aae; margin-left: 6px; }
.order-amount { font-size: 15px; font-weight: 700; color: #e8573a; margin-bottom: 4px; }
.order-contact { font-size: 12px; color: #5a5a6e; margin-bottom: 2px; }
.order-address { font-size: 12px; color: #9a9aae; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-bottom { display: flex; align-items: center; justify-content: space-between; }
.order-time { font-size: 11px; color: #c8c4c0; }
.order-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.status-0 { background: #fff3e0; color: #f39c12; }
.status-1 { background: #e8f8ee; color: #07c160; }
.status-2 { background: #e3f2fd; color: #1989fa; }
.status-3 { background: #f5f3f0; color: #9a9aae; }
.status-4 { background: #f5f3f0; color: #c8c4c0; }
.order-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
.action-btn { height: 28px; font-size: 12px; padding: 0 12px; }
.action-btn.primary { background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important; border: none !important; color: #fff !important; }

/* ── 订单详情弹窗行 ── */
.detail-row { display: flex; align-items: flex-start; width: 100%; padding: 8px 0; border-bottom: 1px solid #f5f3f0; }
.detail-row:last-child { border-bottom: none; }
.detail-lbl { width: 70px; font-size: 13px; color: #9a9aae; flex-shrink: 0; }
.detail-val { flex: 1; font-size: 13px; color: #1a1a2e; word-break: break-all; }
.detail-val.price { font-weight: 700; color: #e8573a; }
.detail-divider { height: 1px; background: #f0ece8; margin: 8px 0; width: 100%; }
.detail-goods-section { width: 100%; margin-top: 12px; }
.detail-goods-title { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 10px; }
.detail-goods-item { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f3f0; }
.detail-goods-item:last-child { border-bottom: none; }
.goods-thumb { border-radius: 6px; flex-shrink: 0; }
.goods-detail { flex: 1; min-width: 0; }
.goods-name { font-size: 13px; font-weight: 500; color: #1a1a2e; margin-bottom: 2px; }
.goods-sku { font-size: 12px; color: #9a9aae; margin-bottom: 4px; }
.goods-price-qty { display: flex; align-items: center; gap: 6px; }
.goods-price { font-size: 14px; font-weight: 700; color: #e8573a; }
.goods-qty { font-size: 12px; color: #c8c4c0; }
.order-status-text { font-size: 12px; padding: 2px 10px; border-radius: 10px; font-weight: 500; }
.order-status-text.s--1 { background: #f5f3f0; color: #9a9aae; }
.order-status-text.s-0 { background: #fff3e0; color: #f39c12; }
.order-status-text.s-1 { background: #e8f8ee; color: #07c160; }
.order-status-text.s-2 { background: #e3f2fd; color: #1989fa; }
.order-status-text.s-3 { background: #f5f3f0; color: #9a9aae; }
.order-status-text.s-4 { background: #f5f3f0; color: #c8c4c0; }
:deep(.order-detail-dialog) { width: 90% !important; }
:deep(.order-detail-dialog .van-dialog__content) { max-height: 80vh; overflow-y: auto; }

/* ── 店铺头部营业状态 ── */
.shop-header-main { display: flex; align-items: center; gap: 14px; cursor: pointer; }
.shop-status-row { display: flex; align-items: center; gap: 6px; padding: 8px 16px 4px; }
.shop-status-label { font-size: 12px; opacity: 0.8; }
.shop-status-text { font-size: 12px; font-weight: 600; }
.shop-status-text.on { color: #4caf50; }
.shop-status-text.off { color: rgba(255,255,255,0.6); }

/* ── 营收概览 ── */
.revenue-cards { display: flex; gap: 8px; margin-bottom: 10px; }
.revenue-card { flex: 1; background: #fff; border-radius: 12px; padding: 14px 10px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.revenue-num { font-size: 17px; font-weight: 700; color: #e8573a; }
.revenue-lbl { font-size: 11px; color: #9a9aae; margin-top: 4px; }

/* ── DSR 评分概览 ── */
.dsr-section { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.dsr-cards { display: flex; gap: 8px; }
.dsr-card { flex: 1; text-align: center; }
.dsr-score { font-size: 20px; font-weight: 700; color: #1a1a2e; line-height: 1.2; }
.dsr-label { font-size: 11px; color: #9a9aae; margin: 2px 0 4px; }
.dsr-bar-wrap { height: 3px; background: #f0ece8; border-radius: 2px; overflow: hidden; }
.dsr-bar { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #e8573a, #f39c12); transition: width 0.4s; }
.dsr-bar.service { background: linear-gradient(90deg, #1989fa, #5cadff); }
.dsr-bar.logistics { background: linear-gradient(90deg, #07c160, #4cd964); }
.dsr-footer { text-align: center; font-size: 11px; color: #c8c4c0; margin-top: 6px; }

/* ── DSR 趋势图 ── */
.chart-section { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.chart-wrap { margin: 4px 0; }
.dsr-svg { width: 100%; height: auto; }
.section-title { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 6px; }
.high-rate { display: flex; justify-content: center; gap: 16px; padding-top: 6px; border-top: 1px solid #f5f3f0; }
.rate-item { font-size: 11px; color: #5a5a6e; display: flex; align-items: center; gap: 4px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot.describe { background: #e8573a; }
.dot.service { background: #1989fa; }
.dot.logistics { background: #07c160; }

/* ── 评价列表 ── */
.review-section { }
.review-filter { display: flex; gap: 8px; margin-bottom: 10px; }
.filter-btn {
  font-size: 12px; padding: 4px 14px; border-radius: 14px; background: #f0ece8; color: #5a5a6e; cursor: pointer; transition: all 0.2s;
}
.filter-btn.active { background: #e8573a; color: #fff; font-weight: 500; }
.review-list { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.review-item { padding: 12px 14px; border-bottom: 1px solid #f0ece8; }
.review-item:last-child { border-bottom: none; }
.review-user-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.review-avatar { flex-shrink: 0; }
.review-avatar-placeholder { width: 32px; height: 32px; border-radius: 50%; background: #f5f3f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.review-user-info { flex: 1; min-width: 0; }
.review-username { display: block; font-size: 13px; font-weight: 600; color: #1a1a2e; }
.review-time { font-size: 11px; color: #c8c4c0; }
.review-stars { display: flex; gap: 2px; flex-shrink: 0; }
.review-score-row { display: flex; gap: 6px; margin-bottom: 8px; }
.review-score-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #f5f3f0; color: #9a9aae; }
.review-score-tag.score-high { background: #e8f8ee; color: #07c160; }
.review-score-tag.score-mid { background: #fff3e0; color: #f39c12; }
.review-score-tag.score-low { background: #fde8e5; color: #e8573a; }
.review-content { font-size: 13px; color: #5a5a6e; line-height: 1.4; margin-bottom: 6px; }
.review-images { display: flex; gap: 6px; flex-wrap: wrap; }
.review-img { border-radius: 6px; border: 1px solid #f0ece8; }
.review-pagination { margin-top: 12px; }

.company-list { padding: 8px 16px 24px; max-height: 50vh; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 10px; }
.company-item { flex: 0 0 calc(33.33% - 7px); padding: 10px 0; text-align: center; font-size: 14px; color: #1a1a2e; background: #f5f3f0; border-radius: 8px; cursor: pointer; }
.company-item:active { background: #e0dcd8; }

/* ── 商品管理左右双栏布局 ── */
.goods-layout {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.goods-sidebar {
  width: 150px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 12px 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  padding: 0 14px 10px;
  border-bottom: 1px solid #f0ece8;
  margin-bottom: 6px;
}
.sidebar-cat {
  padding: 8px 14px;
  font-size: 13px;
  color: #5a5a6e;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}
.sidebar-cat:hover {
  background: #faf8f6;
}
.sidebar-cat:active {
  background: #f5f3f0;
}
.sidebar-cat.active {
  color: #e8573a;
  font-weight: 600;
  background: #fef5f2;
  border-left-color: #e8573a;
}
.goods-main {
  flex: 1;
  min-width: 0;
}
.toolbar-sticky {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f5f3f0;
  padding-bottom: 8px;
}

/* 移动端：sidebar 折叠为横向滚动条 */
@media (max-width: 640px) {
  .goods-layout {
    flex-direction: column;
  }
  .goods-sidebar {
    width: 100%;
    position: static;
    max-height: none;
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 8px 12px;
    gap: 6px;
    -webkit-overflow-scrolling: touch;
  }
  .sidebar-title {
    display: none;
  }
  .sidebar-cat {
    flex-shrink: 0;
    padding: 6px 14px;
    font-size: 12px;
    white-space: nowrap;
    border-left: none;
    border-radius: 14px;
    background: #f5f3f0;
  }
  .sidebar-cat.active {
    background: #e8573a;
    color: #fff;
    border-left: none;
  }
}
</style>
