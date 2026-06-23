<template>
  <div class="welcome">
    <div class="welcome-title">卡牌收集</div>
    <p class="welcome-sub">你想要做什么？</p>
    <div class="welcome-cards">
      <div class="welcome-card" @click="$router.push('/collections')">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/>
          <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="wc-label">收集卡牌</span>
        <span class="wc-desc">导入卡牌图片、标记已拥有、导出未拥有的卡</span>
      </div>
      <div class="welcome-card" @click="$router.push('/albums')">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M8 8H16V12H8V8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M8 14H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="wc-label">制作图鉴</span>
        <span class="wc-desc">创建相册、添加图片和脚注、导出长图</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome{display:flex;flex-direction:column;align-items:center;padding-top:60px}
.welcome-title{font-size:28px;font-weight:700}
.welcome-sub{font-size:15px;color:var(--text2);margin-top:8px;margin-bottom:40px}
.welcome-cards{display:flex;flex-direction:column;gap:16px;width:100%;max-width:360px}
.welcome-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:32px 24px;border-radius:var(--radius);background:var(--surface);box-shadow:var(--shadow);cursor:pointer;transition:transform .15s,box-shadow .15s;color:var(--text);text-align:center}
.welcome-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.12)}
.wc-label{font-size:17px;font-weight:600}
.wc-desc{font-size:13px;color:var(--text2);line-height:1.4}
</style>
