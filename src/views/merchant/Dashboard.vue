<template>
  <div class="page-merchant">
    <NavBar title="我的店铺" />

    <!-- ==================== 🏪 方案B · 极简信息流 ==================== -->
    <div v-if="shopInfo" class="shop-header">
      <!-- 顶栏：左侧信息区 + 右侧操作区 -->
      <div class="sh-top">
        <div class="sh-avatar">
          <van-image width="52" height="52" :src="shopInfo.shopLogo || defaultLogo" class="sh-avatar-img" />
        </div>
        <div class="sh-info">
          <div class="sh-name-row">
            <span class="sh-name">{{ shopInfo.shopName }}</span>
            <span class="sh-badge" :class="shopInfo.shopStatus === 1 ? 'on' : 'off'">
              <span class="sh-dot"></span>
              {{ shopInfo.shopStatus === 1 ? '营业中' : '休息中' }}
            </span>
          </div>
          <div class="sh-tags">
            <span class="sh-tag" v-if="shopInfo.businessHours">{{ shopInfo.businessHours }}</span>
            <span class="sh-tag" v-if="shopInfo.afterSaleInfo">{{ shopInfo.afterSaleInfo }}</span>
          </div>
          <div class="sh-meta">{{ shopInfo.contactPhone || shopInfo.contactName }}</div>
          <div class="sh-scope-row">
            <span class="sh-scope">{{ scopeDisplayText || '未设置经营范围' }}</span>
          </div>
        </div>
        <div class="sh-actions">
          <div class="sh-edit" @click="openShopDetail">
            <van-icon name="edit" size="18" />
            <span>编辑店铺</span>
          </div>
          <div class="sh-status-toggle">
            <van-switch v-model="shopInfo.shopStatus" :active-value="1" :inactive-value="0" size="18" @change="handleShopStatusChange" />
            <span class="sh-status-label">{{ shopInfo.shopStatus === 1 ? '营业中' : '休息中' }}</span>
          </div>
        </div>
      </div>

      <!-- 店铺简介行 -->
      <div class="sh-desc-row" v-if="shopInfo.shopDesc">
        <span class="sh-desc-label">店铺简介：</span>
        <span class="sh-desc-text">{{ shopInfo.shopDesc }}</span>
      </div>

      <!-- 评分行 -->
      <div class="sh-score">
        <span class="sh-star">★</span> <span class="sh-num">{{ shopInfo.describeScore ?? '--' }}</span>
        <span class="sh-gap"></span>
        <span class="sh-star">★</span> <span class="sh-num">{{ shopInfo.serviceScore ?? '--' }}</span>
        <span class="sh-gap"></span>
        <span class="sh-star">★</span> <span class="sh-num">{{ shopInfo.logisticsScore ?? '--' }}</span>
        <span class="sh-total">{{ shopInfo.dsrCount || 0 }}条评价</span>
      </div>
    </div>
    <van-loading v-else-if="shopLoading" class="loading-center" size="24" />

    <!-- 店铺公告（独立模块） -->
    <div class="sh-notice" v-if="shopInfo?.shopNotice">
      <div class="sh-notice-inner">
        <van-icon name="volume-o" size="16" class="sh-notice-icon" />
        <span class="sh-notice-text">{{ shopInfo.shopNotice }}</span>
      </div>
    </div>

    <!-- 店铺信息编辑弹窗 -->
    <van-dialog v-model:show="showShopDetail" title="编辑店铺信息" :show-confirm-button="false" closeable close-icon-position="top-left" class="shop-edit-dialog">
      <div class="dialog-body shop-edit-body">
        <!-- 板块1：直接编辑（无需审核） -->
        <div class="edit-section">
          <div class="edit-section-title">直接编辑</div>
          <div class="upload-row">
            <div class="upload-col">
              <div class="upload-label">店铺头像</div>
              <div class="upload-box logo-box" @click="logoInputRef?.click()">
                <img v-if="shopForm.logoPreview" :src="shopForm.logoPreview" class="upload-preview" />
                <img v-else :src="shopInfo?.shopLogo || defaultLogo" class="upload-preview" />
                <div class="upload-overlay"><van-icon name="camera-o" size="18" color="#fff" /></div>
              </div>
            </div>
          </div>
          <input ref="logoInputRef" type="file" accept="image/*" class="file-hidden" @change="onLogoSelected" />
          <van-field v-model="shopForm.shopName" label="店铺名称" placeholder="请输入店铺名称" maxlength="50" :rules="[{ required: true, message: '请输入店铺名称' }]" />
          <van-field v-model="shopForm.businessHours" label="营业时间段" placeholder="如：09:00-22:00" />
          <van-field v-model="shopForm.shopDesc" label="店铺简介" type="textarea" placeholder="请输入店铺简介" :rows="3" autosize />
          <van-field v-model="shopForm.afterSaleInfo" label="售后说明" type="textarea" placeholder="请输入售后说明" :rows="2" autosize />
          <van-field v-model="shopForm.shopNotice" label="店铺公告" type="textarea" placeholder="请输入店铺公告" :rows="2" autosize />

        <van-button round block class="dialog-btn dialog-btn-basic" @click="handleSaveBasic" :loading="basicSaving">保存</van-button>
        </div>

        <!-- 板块2：需提交审核 -->
        <div class="edit-section">
          <div class="edit-section-title">需提交审核</div>
          <div class="upload-row">
            <div class="upload-col">
              <div class="upload-label">营业执照 <span class="required">*</span></div>
              <div class="upload-box cert-box" @click="licenseInputRef?.click()">
                <img v-if="shopForm.licensePreview" :src="shopForm.licensePreview" class="upload-preview" />
                <img v-else :src="shopInfo?.businessLicense" class="upload-preview" style="object-fit: contain;" />
                <div class="upload-overlay"><van-icon name="camera-o" size="18" color="#fff" /></div>
              </div>
            </div>
            <div class="upload-col">
              <div class="upload-label">食品许可证 <span class="optional">可选</span></div>
              <div class="upload-box cert-box" @click="foodLicenseInputRef?.click()">
                <img v-if="shopForm.foodLicensePreview" :src="shopForm.foodLicensePreview" class="upload-preview" />
                <img v-else-if="shopInfo?.foodLicense" :src="shopInfo?.foodLicense" class="upload-preview" style="object-fit: contain;" />
                <div v-else class="upload-placeholder"><van-icon name="plus" size="24" color="#c8c4c0" /></div>
                <div class="upload-overlay"><van-icon name="camera-o" size="18" color="#fff" /></div>
              </div>
            </div>
          </div>
          <input ref="licenseInputRef" type="file" accept="image/*" class="file-hidden" @change="onLicenseSelected" />
          <input ref="foodLicenseInputRef" type="file" accept="image/*" class="file-hidden" @change="onFoodLicenseSelected" />
          <van-field v-model="shopForm.contactName" label="联系人" placeholder="请输入联系人姓名" />
          <van-field v-model="shopForm.contactPhone" label="联系手机号" type="tel" placeholder="请输入联系电话" maxlength="11" :rules="[{ required: true, message: '请输入手机号', trigger: 'onBlur' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'onBlur' }]" />
          <van-field v-model="shopForm.businessScopeName" readonly label="主营分类" placeholder="请选择主营分类" :rules="[{ required: true, message: '请选择主营分类' }]">
            <template #button>
              <van-button size="small" round plain class="modify-btn" @click="showScopePicker = true">修改</van-button>
            </template>
          </van-field>
          <van-field v-model="shopForm.legalPerson" label="法人信息" placeholder="请输入法人姓名" :rules="[{ required: true, message: '请输入法人信息' }]" />
          <van-field v-model="shopForm.businessAddress" label="经营地址" placeholder="请输入经营地址" :rules="[{ required: true, message: '请输入经营地址' }]" />
          <van-field v-model="shopForm.verifiedContact" label="实名认证" placeholder="请输入实名认证信息" />
          <van-button round block class="dialog-btn dialog-btn-audit" @click="handleSaveAudit" :loading="auditSaving">提交审核申请</van-button>
        </div>
      </div>

      <!-- 经营范围多选：居中弹窗在编辑窗内 -->
      <van-popup v-model:show="showScopePicker" round class="scope-popup scope-popup-inner" @open="onScopeOpen">
        <div class="scope-popup-header">
          <span class="scope-cancel" @click="showScopePicker = false">取消</span>
          <span class="scope-title">选择经营范围</span>
          <span class="scope-confirm" @click="onScopeConfirm">确定</span>
        </div>
        <div class="scope-list">
          <van-checkbox-group v-model="scopeSelected">
            <div v-for="opt in flatScopeOptions" :key="opt.value" class="scope-checkbox-row">
              <van-checkbox :name="opt.value" shape="square" class="scope-checkbox-item">{{ opt.text }}</van-checkbox>
            </div>
          </van-checkbox-group>
          <van-empty v-if="flatScopeOptions.length === 0" description="暂无分类" />
        </div>
      </van-popup>
    </van-dialog>


    <!-- ==================== Tabs ==================== -->
    <van-tabs v-model:active="activeTab" class="merchant-tabs">
      <van-tab title="商品管理" name="goods" />
      <van-tab title="订单管理" name="orders" />
      <van-tab title="数据评价" name="data" />
      <van-tab title="资金管理" name="fund" />
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
            <select v-model="goodsStatus" class="status-select" @change="handleStatusChange">
              <option value="">全部状态</option>
              <option value="1">上架</option>
              <option value="0">下架</option>
            </select>
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
                  <span class="audit-tag" :class="auditTagClass(item.auditStatus)">{{ auditTagText(item.auditStatus) }}</span>
                </div>
                <div class="card-audit-msg" v-if="item.auditStatus === 2 && item.auditMsg">驳回原因：{{ item.auditMsg }}</div>
                <div class="card-audit-hint" v-if="item.auditStatus === 2">请修改商品信息后重新提交审核</div>
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
      <van-dialog v-model:show="showEditGoods" title="编辑商品" :show-confirm-button="false" closeable close-icon-position="top-left" class="edit-goods-dialog shop-edit-dialog-inner">
        <div class="edit-dialog-body">
          <div v-if="editRejectMsg" class="edit-reject-banner">
            <van-icon name="warn-o" size="16" color="#c62828" />
            <span>驳回原因：{{ editRejectMsg }}</span>
          </div>
          <GoodsForm ref="editGoodsFormRef" :init-form="editGoodsData" submit-text="保存" @submit="handleEditGoods" />
        </div>
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

    <!-- ==================== Tab 资金管理 ==================== -->
    <div v-show="activeTab === 'fund'" class="tab-content">
      <div class="fund-sub-tabs">
        <span v-for="st in fundSubTabs" :key="st.key" class="fund-sub-tab" :class="{ active: fundActiveSub === st.key }" @click="fundActiveSub = st.key">{{ st.label }}</span>
      </div>
      <AccountFund v-show="fundActiveSub === 'account'" ref="accountFundRef" @go-withdraw="fundActiveSub = 'withdraw'" />
      <WithdrawFund v-show="fundActiveSub === 'withdraw'" ref="withdrawFundRef" />
      <FlowFund v-show="fundActiveSub === 'flow'" />
      <CommissionFund v-show="fundActiveSub === 'commission'" />
      <ReportFund v-show="fundActiveSub === 'report'" />
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
        <div class="revenue-card" style="border:1px solid #e8f8ee;">
          <div class="revenue-num" style="color:#07c160;">¥{{ fundAvailableBalance ?? stats.availableBalance ?? '0.00' }}</div>
          <div class="revenue-lbl">可提现余额</div>
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
import { showToast, showConfirmDialog, showDialog } from 'vant'
import { useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import GoodsForm from '../../components/goods/GoodsForm.vue'
import { getShopInfo, updateShopInfo, getShopOrders, getShopStats, getShopReviews, updateMerchantGoods, getMerchantGoodsPage, getDsrTrend, updateShopStatus, publishGoods, toggleMerchantGoodsStatus } from '../../api/merchant.js'
import AccountFund from './fund/Account.vue'
import WithdrawFund from './fund/Withdraw.vue'
import FlowFund from './fund/Flow.vue'
import CommissionFund from './fund/Commission.vue'
import ReportFund from './fund/Report.vue'
import { getBalance as getFundBalance } from '../../api/merchant_fund.js'
import { getSpuDetail, deleteSpu } from '../../api/goods.js'
import { getOrderDetail, deliverOrder } from '../../api/order.js'
import { getMyCategories } from '../../api/merchant.js'
import { getTree } from '../../api/category.js'
const router = useRouter()
const defaultImg = 'https://img.yzcdn.cn/vant/ipad.jpeg'

const defaultLogo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e8573a' rx='16'/%3E%3Ctext x='50' y='66' text-anchor='middle' font-size='44' fill='%23fff'%3E🏪%3C/text%3E%3C/svg%3E"

const activeTab = ref('goods')
const fundSubTabs = [
  { key: 'account', label: '结算账户' },
  { key: 'withdraw', label: '提现' },
  { key: 'flow', label: '资金流水' },
  { key: 'commission', label: '分佣明细' },
  { key: 'report', label: '经营报表' },
]
const accountFundRef = ref(null)
const withdrawFundRef = ref(null)

// 经营范围选择
const showScopePicker = ref(false)
const scopeTreeData = ref([])
const scopeSelected = ref([])
const expandedParents = ref(new Set())

/** 展平分类树为平铺选项 */
function flattenTree(nodes) {
  const result = []
  for (const n of nodes) {
    result.push({ text: n.name, value: String(n.id) })
    if (n.children?.length) result.push(...flattenTree(n.children))
  }
  return result
}

/** 根据 ID 在 scopeTreeData 中查找分类名称 */
function findCatName(id) {
  for (const p of scopeTreeData.value) {
    if (String(p.id) === String(id)) return p.name
    if (p.children) {
      const c = p.children.find(ch => String(ch.id) === String(id))
      if (c) return c.name
    }
  }
  return id
}

/** 店铺主页展示的经营范围中文文本（由 shopInfo.businessScope ID 转换） */
const scopeDisplayText = computed(() => {
  if (!shopInfo.value?.businessScope) return ''
  return shopInfo.value.businessScope.split(',').filter(Boolean).map(id => findCatName(id)).join('、')
})

/** 弹窗内平铺的全部分类选项 */
const flatScopeOptions = ref([])

onMounted(async () => {
  // 加载全部分类树 → 展平为选项（供弹窗数据源 + 名称查找）
  try {
    const tree = await getTree()
    scopeTreeData.value = tree || []
    flatScopeOptions.value = flattenTree(tree || [])
  } catch { scopeTreeData.value = []; flatScopeOptions.value = [] }
  // 加载商家经营分类（商品管理分类筛选用）
  try {
    const cats = await getMyCategories()
    if (cats?.length) {
      const list = []
      function walk(nodes) {
        for (const n of nodes) {
          list.push({ text: n.name, value: String(n.id) })
          if (n.children?.length) walk(n.children)
        }
      }
      walk(cats)
      flatCategories.value = list
      return
    }
  } catch { /* 忽略 */ }
  // fallback：商家无分类限制时使用全部分类
  if (flatCategories.value.length === 0 && categoryOptions.value.length > 0) {
    flatCategories.value = categoryOptions.value
  }
})

/** 店铺主页「修改」按钮 → 打开经营范围弹窗 */
async function openScopeDirectly() {
  scopeFromHeader.value = true
  showScopePicker.value = true
}

/** 弹窗每次打开：调用 API 获取商家已有分类 → 自动勾选 */
const scopeFromHeader = ref(false)

async function onScopeOpen() {
  // 从 API 获取商家已有分类 ID 作为默认勾选
  try {
    const cats = await getMyCategories()
    if (cats?.length) {
      const ids = []
      function collect(nodes) {
        for (const n of nodes) {
          ids.push(String(n.id))
          if (n.children?.length) collect(n.children)
        }
      }
      collect(cats)
      scopeSelected.value = ids
      showToast('已默认勾选您原本的分类，如需修改请重新选择')
    } else {
      scopeSelected.value = shopForm.businessScope ? shopForm.businessScope.split(',').filter(Boolean) : []
    }
  } catch {
    scopeSelected.value = shopForm.businessScope ? shopForm.businessScope.split(',').filter(Boolean) : []
  }
}

/** 弹窗「确定」 */
async function onScopeConfirm() {
  shopForm.businessScope = scopeSelected.value.map(String).join(',')
  shopForm.businessScopeName = scopeSelected.value.map(id => findCatName(id)).join('、')
  showScopePicker.value = false

  // 从店铺主页直接修改 → 立即提交审核
  if (scopeFromHeader.value) {
    scopeFromHeader.value = false
    try {
      await updateShopInfo({ businessScope: shopForm.businessScope })
      showDialog({ title: '提示', message: '修改申请已提交，请等待平台审核，审核通过后生效', confirmButtonColor: '#e8573a' })
      await fetchShop()
    } catch { /* toast by interceptor */ }
  }
}

// ═══════════════ 店铺管理 ═══════════════
const shopLoading = ref(false)
const shopInfo = ref(null)
const showShopDetail = ref(false)
const basicSaving = ref(false)
const auditSaving = ref(false)

const shopForm = reactive({
  shopName: '', businessScope: '', businessScopeName: '', contactName: '', contactPhone: '',
  shopDesc: '', shopNotice: '', businessHours: '', afterSaleInfo: '',
  legalPerson: '', businessAddress: '', verifiedContact: '',
  logoPreview: '', licensePreview: '', foodLicensePreview: '',
})
const logoInputRef = ref(null)
const licenseInputRef = ref(null)
const foodLicenseInputRef = ref(null)
const logoFile = ref(null)
const licenseFile = ref(null)
const foodLicenseFile = ref(null)

function onLogoSelected(e) {
  const f = e.target.files?.[0]
  if (!f) return
  logoFile.value = f
  const reader = new FileReader()
  reader.onload = (ev) => { shopForm.logoPreview = ev.target?.result || '' }
  reader.readAsDataURL(f)
  e.target.value = ''
}
function onLicenseSelected(e) {
  const f = e.target.files?.[0]
  if (!f) return
  licenseFile.value = f
  const reader = new FileReader()
  reader.onload = (ev) => { shopForm.licensePreview = ev.target?.result || '' }
  reader.readAsDataURL(f)
  e.target.value = ''
}
function onFoodLicenseSelected(e) {
  const f = e.target.files?.[0]
  if (!f) return
  foodLicenseFile.value = f
  const reader = new FileReader()
  reader.onload = (ev) => { shopForm.foodLicensePreview = ev.target?.result || '' }
  reader.readAsDataURL(f)
  e.target.value = ''
}

async function fetchShop() {
  shopLoading.value = true
  try { shopInfo.value = await getShopInfo() }
  catch { shopInfo.value = null }
  finally { shopLoading.value = false }
}

function openShopDetail() {
  if (!shopInfo.value) return
  const s = shopInfo.value
  shopForm.shopName = s.shopName || ''
  shopForm.businessScope = s.businessScope || ''
  shopForm.businessScopeName = (s.businessScope || '').split(',').filter(Boolean).map(id => findCatName(id)).join('、')
  shopForm.contactName = s.contactName || ''
  shopForm.contactPhone = s.contactPhone || ''
  shopForm.shopDesc = s.shopDesc || ''
  shopForm.shopNotice = s.shopNotice || ''
  shopForm.businessHours = s.businessHours || ''
  shopForm.afterSaleInfo = s.afterSaleInfo || ''
  scopeFromHeader.value = false  // 从对话框编辑，不触发直接保存
  // 图片预览重置
  shopForm.logoPreview = ''
  shopForm.licensePreview = ''
  shopForm.foodLicensePreview = ''
  logoFile.value = null
  licenseFile.value = null
  foodLicenseFile.value = null
  showShopDetail.value = true
}

async function handleSaveBasic() {
  if (!shopForm.shopName) return showToast('请输入店铺名称')
  basicSaving.value = true
  try {
    const prev = shopInfo.value || {}
    const changed = {}

    // 只上传有变动的图片
    let logoUrl = prev.shopLogo
    if (logoFile.value) {
      const { uploadImage } = await import('../../api/merchant.js')
      logoUrl = await uploadImage(logoFile.value, 'cert')
    }
    if (logoUrl !== prev.shopLogo) changed.shopLogo = logoUrl

    // 基础字段
    const fields = {
      shopName: shopForm.shopName,
      shopDesc: shopForm.shopDesc,
      shopNotice: shopForm.shopNotice,
      businessHours: shopForm.businessHours,
      afterSaleInfo: shopForm.afterSaleInfo,
    }
    for (const [key, val] of Object.entries(fields)) {
      if (String(val) !== String(prev[key] || '')) {
        changed[key] = val
      }
    }

    if (Object.keys(changed).length === 0) {
      showToast('未检测到修改')
      showShopDetail.value = false
      return
    }

    await updateShopInfo(changed)
    showToast('保存成功')
    showShopDetail.value = false
    await fetchShop()
  } catch { /* toast by interceptor */ }
  finally { basicSaving.value = false }
}

async function handleSaveAudit() {
  if (!shopForm.contactName) return showToast('请输入联系人姓名')
  if (!shopForm.contactPhone) return showToast('请输入联系手机号')
  if (!shopForm.legalPerson) return showToast('请输入法人信息')
  if (!shopForm.businessAddress) return showToast('请输入经营地址')
  if (!shopForm.businessScope) return showToast('请选择主营分类')
  auditSaving.value = true
  try {
    const prev = shopInfo.value || {}
    const changed = {}

    // 图片上传（有变动才上传）
    let licenseUrl = prev.businessLicense
    if (licenseFile.value) {
      const { uploadImage } = await import('../../api/merchant.js')
      licenseUrl = await uploadImage(licenseFile.value, 'cert')
    }
    if (licenseUrl !== prev.businessLicense) changed.businessLicense = licenseUrl

    let foodUrl = prev.foodLicense
    if (foodLicenseFile.value) {
      const { uploadImage } = await import('../../api/merchant.js')
      foodUrl = await uploadImage(foodLicenseFile.value, 'cert')
    }
    if (foodUrl !== prev.foodLicense) changed.foodLicense = foodUrl

    // 文本字段
    const fields = {
      contactName: shopForm.contactName,
      contactPhone: shopForm.contactPhone,
      businessScope: shopForm.businessScope,
      legalPerson: shopForm.legalPerson,
      businessAddress: shopForm.businessAddress,
      verifiedContact: shopForm.verifiedContact,
    }
    for (const [key, val] of Object.entries(fields)) {
      if (String(val) !== String(prev[key] || '')) {
        changed[key] = val
      }
    }

    if (Object.keys(changed).length === 0) {
      showToast('未检测到修改')
      return
    }

    await updateShopInfo(changed)
    showDialog({ title: '提示', message: '修改申请已提交，请等待平台审核，审核通过后生效', confirmButtonColor: '#e8573a' })
    showShopDetail.value = false
    await fetchShop()
  } catch { /* toast by interceptor */ }
  finally { auditSaving.value = false }
}

// ═══════════════ 商品管理 ═══════════════
const goodsList = ref([])
const goodsLoading = ref(false)
const goodsFinished = ref(false)
const goodsPage = ref(1)
const goodsTotal = ref(0)
const goodsKeyword = ref('')
const goodsStatus = ref('')
const goodsCategoryId = ref(null)
const showEditGoods = ref(false)
const editGoodsData = ref({})
const editGoodsId = ref(null)
const editGoodsFormRef = ref(null)
const editRejectMsg = ref('')

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
    if (goodsStatus.value !== '') params.status = goodsStatus.value
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

function handleStatusChange() {
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
  editRejectMsg.value = item.auditMsg || ''
  try {
    const detail = await getSpuDetail(item.id)
    editGoodsData.value = { ...detail }
    showEditGoods.value = true
  } catch {
    showToast('商品不存在，无法编辑')
  }
}

async function handleEditGoods(payload) {
  await updateMerchantGoods(editGoodsId.value, payload)
  showToast('修改已提交，等待平台审核')
  showEditGoods.value = false
  goodsPage.value = 1; goodsFinished.value = false; fetchGoods()
}

async function handleToggle(item) {
  const action = item.status === 1 ? '下架' : '上架'
  const newStatus = item.status === 1 ? 0 : 1
  // 上架必须审核通过
  if (newStatus === 1 && item.auditStatus !== 1) {
    const msg = item.auditStatus === 2 ? '商品已被驳回，请修改后重新提交' : '商品待审核，请等待平台审核通过后上架'
    return showToast(msg)
  }
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
function auditTagClass(status) {
  const map = { 0: 'audit-pending', 1: 'audit-passed', 2: 'audit-reject' }
  return map[status] ?? ''
}
function auditTagText(status) {
  const map = { 0: '待审核', 1: '已通过', 2: '已驳回' }
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
const stats = ref({ totalAmount: 0, monthAmount: 0, totalOrderCount: 0, availableBalance: 0 })
const fundAvailableBalance = ref(null)
const fundActiveSub = ref('account')
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
    getFundBalance().then(v => { fundAvailableBalance.value = v }).catch(() => {})
    if (reviewList.value.length === 0) {
      reviewPage.value = 1; fetchReviews()
    }
  }
  if (tab === 'fund') {
    accountFundRef.value?.fetchAccount?.()
    accountFundRef.value?.fetchBalance?.()
    withdrawFundRef.value?.fetchBalance?.()
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




/* ── 方案B · 极简信息流 ── */
.shop-header {
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%);
  color: #fff;
}
.sh-top {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 18px 12px;
}
.sh-avatar {
  flex-shrink: 0;
  width: 52px; height: 52px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.1);
}
.sh-avatar-img { border-radius: 50%; }
.sh-info { flex: 1; min-width: 0; }
.sh-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.sh-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.sh-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 8px;
  font-weight: 600;
}
.sh-badge.on { background: rgba(105,240,174,0.2); color: #69f0ae; }
.sh-badge.off { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.6); }
.sh-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.sh-badge.on .sh-dot { box-shadow: 0 0 3px currentColor; }
.sh-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
.sh-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.sh-meta { font-size: 13px; font-weight: 600; opacity: 0.55; }
.sh-scope-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.sh-scope { font-size: 11px; opacity: 0.55; }
.sh-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 4px 0 2px;
  max-width: 110px;
}
.sh-edit {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 16px;
  background: rgba(255,255,255,0.2);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s;
  white-space: nowrap;
}
.sh-edit:hover { background: rgba(255,255,255,0.32); }
.sh-edit :deep(.van-icon) { color: #fff; }

/* ── 右侧状态开关 ── */
.sh-status-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.sh-status-label {
  font-size: 10px;
  opacity: 0.75;
  white-space: nowrap;
}

/* ── 店铺简介行 ── */
.sh-desc-row {
  padding: 2px 18px 10px;
  display: flex;
  gap: 4px;
  font-size: 12px;
  line-height: 1.5;
}
.sh-desc-label { color: rgba(255,255,255,0.5); white-space: nowrap; flex-shrink: 0; }
.sh-desc-text { color: rgba(255,255,255,0.85); word-break: break-word; flex: 1; }

/* ── 评分行 ── */
.sh-score {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: rgba(0,0,0,0.06);
  font-size: 13px;
  gap: 0;
}
.sh-star { color: #ffd54f; font-size: 14px; margin-right: 2px; }
.sh-num { font-weight: 700; font-size: 14px; }
.sh-gap {
  width: 1px; height: 12px;
  background: rgba(255,255,255,0.2);
  margin: 0 10px;
}
.sh-total { font-size: 11px; opacity: 0.55; margin-left: auto; }

/* ── 公告独立模块 ── */
.sh-notice { padding: 0 16px 6px; }
.sh-notice-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fff8e6;
  border-radius: 12px;
  border: 1px solid #fceebe;
}
.sh-notice-icon { flex-shrink: 0; color: #f39c12; }
.sh-notice-text { font-size: 13px; color: #8d6e00; line-height: 1.5; flex: 1; min-width: 0; }

/* ── 订单汇总 ── */
.order-summary { font-size: 13px; color: #9a9aae; margin-bottom: 8px; }
.order-status-tabs { margin-bottom: 8px; }

/* ── Merchant Tabs ── */
.merchant-tabs {
  margin-top: 12px;
}

/* ── 弹窗表单 ── */
.dialog-body { padding: 16px 20px 24px; display: flex; flex-direction: column; }
.shop-edit-body { align-items: stretch; }
.dialog-btn {
  margin-top: 20px; height: 42px; font-size: 15px; font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important; color: #fff !important; width: 100%;
}

/* ── 图片上传区 ── */
.upload-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.upload-col {
  flex: 1;
  min-width: 80px;
  text-align: center;
}
.upload-col .upload-label {
  font-size: 12px;
  color: #5a5a6e;
  margin-bottom: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.required { color: #e8573a; }
.optional { font-size: 11px; color: #c8c4c0; font-weight: 400; }
.audit-hint {
  font-size: 10px;
  color: #f39c12;
  background: #fff8e6;
  padding: 0 6px;
  border-radius: 4px;
  line-height: 18px;
  font-weight: 500;
}
.upload-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 2px dashed #e0dcd8;
  background: #faf8f6;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}
.upload-box:hover { border-color: #e8573a; }
.upload-box.logo-box { max-width: 80px; margin: 0 auto; border-radius: 12px; }
.upload-box.cert-box { border-radius: 8px; }
.upload-preview { width: 100%; height: 100%; object-fit: cover; }
.upload-placeholder { color: #c8c4c0; }
.upload-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.upload-box:hover .upload-overlay { opacity: 1; }
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
.status-select {
  border: 1.5px solid #e0dcd8; border-radius: 8px; padding: 6px 8px;
  font-size: 12px; color: #1a1a2e; background: #fff; outline: none;
}
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

/* ── 审核状态标签 ── */
.audit-tag { font-size: 11px; padding: 1px 8px; border-radius: 10px; font-weight: 500; }
.audit-tag.audit-pending { background: #fff3e0; color: #f39c12; }
.audit-tag.audit-passed { background: #e8f8ee; color: #07c160; }
.audit-tag.audit-reject { background: #fde8e5; color: #e8573a; }
.card-audit-msg { font-size: 12px; color: #e8573a; margin-bottom: 2px; }
.card-audit-hint { font-size: 12px; color: #f39c12; font-weight: 500; margin-bottom: 4px; }

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
.scope-popup-inner {
  width: 85vw;
  max-width: 440px;
  border-radius: 12px;
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
/* ── 经营范围平铺复选框 ── */
.scope-checkbox-row {
  padding: 6px 0;
}
.scope-checkbox-item {
  padding: 0;
}
.modify-btn {
  color: #e8573a !important;
  border-color: #e8573a !important;
  font-size: 12px !important;
  padding: 0 10px !important;
  height: 28px !important;
}
.modify-btn-shop {
  color: #fff !important;
  border-color: rgba(255,255,255,0.5) !important;
  font-size: 11px !important;
  padding: 0 8px !important;
  height: 24px !important;
  flex-shrink: 0;
}

/* ── 编辑弹窗分栏 ── */
.edit-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0ece8;
}
.edit-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.edit-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e8573a;
  display: inline-block;
}
.dialog-btn-basic {
  margin-top: 20px;
  height: 42px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  width: 100%;
}
.dialog-btn-audit {
  margin-top: 20px;
  height: 42px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #e8573a 0%, #f39c12 100%) !important;
  border: none !important;
  color: #fff !important;
  width: 100%;
}

/* ── 编辑驳回横幅 ── */
.edit-dialog-body { padding: 16px 20px 24px; display: flex; flex-direction: column; }
.edit-reject-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  padding: 10px 14px;
  background: #fdecea;
  border-radius: 8px;
  font-size: 13px;
  color: #c62828;
  font-weight: 500;
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
:deep(.shop-edit-dialog) {
  width: 90% !important;
  max-width: 500px;
}
:deep(.shop-edit-dialog .van-dialog__content) {
  max-height: 85vh;
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
/* ── 资金管理子标签 ── */
.fund-sub-tabs {
  display: flex;
  gap: 12px;
  padding: 0 0 8px;
  border-bottom: 1.5px solid #eeeae6;
  margin-bottom: 14px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.fund-sub-tab {
  font-size: 13px;
  font-weight: 500;
  color: #5a5a6e;
  cursor: pointer;
  padding: 6px 0 8px;
  border-bottom: 2px solid transparent;
  transition: color 0.2s;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.fund-sub-tab:hover { color: #1a1a2e; }
.fund-sub-tab.active { color: #1a1a2e; font-weight: 600; border-bottom-color: #e8573a; }
</style>
