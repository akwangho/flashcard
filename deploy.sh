#!/bin/bash
# ============================================
# 英文單字閃卡 - Google Apps Script 部署腳本
# ============================================
# 用法:
#   bash deploy.sh setup    # 首次設定（安裝 clasp、登入、連結專案）
#   bash deploy.sh push     # 推送程式碼到 Google Apps Script
#   bash deploy.sh pull     # 從 Google Apps Script 拉取程式碼
#   bash deploy.sh open     # 在瀏覽器開啟 Apps Script 編輯器
#   bash deploy.sh web      # 在瀏覽器開啟 Web App
#   bash deploy.sh status   # 查看檔案狀態
#   bash deploy.sh logs     # 查看執行日誌
#   bash deploy.sh          # 預設：推送程式碼
# ============================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 輔助函式
info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $1${NC}"; }
error()   { echo -e "${RED}❌ $1${NC}"; }

# 切換到腳本所在目錄
cd "$(dirname "$0")"

# ============================================
# 首次設定
# ============================================
cmd_setup() {
    echo ""
    echo "========================================"
    echo "  英文單字閃卡 - 首次部署設定"
    echo "========================================"
    echo ""

    # 1. 檢查 Node.js
    if ! command -v node &> /dev/null; then
        error "找不到 Node.js，請先安裝: https://nodejs.org/"
        exit 1
    fi
    success "Node.js $(node -v) 已安裝"

    # 2. 檢查/安裝 clasp
    if ! command -v clasp &> /dev/null; then
        info "正在安裝 @google/clasp..."
        npm install -g @google/clasp
        success "clasp 安裝完成"
    else
        success "clasp 已安裝"
    fi

    # 3. 登入 Google 帳號
    echo ""
    info "接下來需要登入你的 Google 帳號"
    info "（會開啟瀏覽器進行 OAuth 授權）"
    echo ""
    read -p "按 Enter 開始登入... " -r
    clasp login
    success "Google 帳號登入成功"

    # 4. 連結到現有的 Apps Script 專案
    echo ""
    echo "========================================"
    echo "  連結到你的 Apps Script 專案"
    echo "========================================"
    echo ""
    info "請提供你的 Apps Script 專案 ID"
    echo ""
    echo "  取得方式："
    echo "  1. 開啟你的 Apps Script 專案"
    echo "     https://script.google.com/"
    echo "  2. 點左側「專案設定」（齒輪圖示）"
    echo "  3. 複製「指令碼 ID」"
    echo ""
    echo "  或者從 URL 中取得："
    echo "  https://script.google.com/d/{SCRIPT_ID}/edit"
    echo ""

    read -p "請輸入 Script ID: " SCRIPT_ID

    if [ -z "$SCRIPT_ID" ]; then
        error "Script ID 不能為空"
        exit 1
    fi

    # 從 URL 中提取 ID（如果使用者貼了完整 URL）
    if [[ "$SCRIPT_ID" == *"script.google.com"* ]]; then
        SCRIPT_ID=$(echo "$SCRIPT_ID" | grep -oP '(?<=/d/)[^/]+' 2>/dev/null || echo "$SCRIPT_ID" | sed -n 's|.*/d/\([^/]*\).*|\1|p')
    fi

    # 建立 .clasp.json
    cat > .clasp.json << EOF
{
  "scriptId": "$SCRIPT_ID",
  "rootDir": "."
}
EOF

    success ".clasp.json 已建立"

    # 5. 確認檔案狀態
    echo ""
    info "檢查即將推送的檔案..."
    echo ""
    clasp status
    echo ""

    # 6. 詢問是否要推送
    echo ""
    read -p "是否現在就推送程式碼到 Apps Script？(y/N) " -r PUSH_NOW

    if [[ "$PUSH_NOW" =~ ^[Yy]$ ]]; then
        cmd_push
    else
        echo ""
        success "設定完成！之後可以用以下指令推送："
        echo ""
        echo "  bash deploy.sh push    # 推送程式碼"
        echo "  bash deploy.sh         # 同上（預設動作）"
        echo ""
    fi
}

# ============================================
# 推送程式碼
# ============================================
cmd_push() {
    # 檢查 .clasp.json 是否存在
    if [ ! -f .clasp.json ]; then
        error "尚未設定專案，請先執行: bash deploy.sh setup"
        exit 1
    fi

    info "正在推送程式碼到 Google Apps Script..."
    echo ""
    clasp push
    echo ""
    success "推送完成！"
    echo ""
    echo "  開啟編輯器:  bash deploy.sh open"
    echo "  開啟 Web App: bash deploy.sh web"
    echo ""
}

# ============================================
# 拉取程式碼
# ============================================
cmd_pull() {
    if [ ! -f .clasp.json ]; then
        error "尚未設定專案，請先執行: bash deploy.sh setup"
        exit 1
    fi

    warn "這將覆寫本地檔案！"
    read -p "確定要從 Apps Script 拉取程式碼？(y/N) " -r CONFIRM

    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        info "正在從 Google Apps Script 拉取程式碼..."
        clasp pull
        success "拉取完成！"
    else
        info "已取消"
    fi
}

# ============================================
# 開啟 Apps Script 編輯器
# ============================================
cmd_open() {
    if [ ! -f .clasp.json ]; then
        error "尚未設定專案，請先執行: bash deploy.sh setup"
        exit 1
    fi
    clasp open
}

# ============================================
# 開啟 Web App
# ============================================
cmd_web() {
    if [ ! -f .clasp.json ]; then
        error "尚未設定專案，請先執行: bash deploy.sh setup"
        exit 1
    fi
    clasp open --webapp
}

# ============================================
# 查看檔案狀態
# ============================================
cmd_status() {
    if [ ! -f .clasp.json ]; then
        error "尚未設定專案，請先執行: bash deploy.sh setup"
        exit 1
    fi
    clasp status
}

# ============================================
# 查看日誌
# ============================================
cmd_logs() {
    if [ ! -f .clasp.json ]; then
        error "尚未設定專案，請先執行: bash deploy.sh setup"
        exit 1
    fi
    clasp logs
}

# ============================================
# 指令路由
# ============================================
case "${1:-push}" in
    setup)  cmd_setup ;;
    push)   cmd_push ;;
    pull)   cmd_pull ;;
    open)   cmd_open ;;
    web)    cmd_web ;;
    status) cmd_status ;;
    logs)   cmd_logs ;;
    help|--help|-h)
        echo ""
        echo "用法: bash deploy.sh [指令]"
        echo ""
        echo "指令:"
        echo "  setup    首次設定（安裝 clasp、登入、連結專案）"
        echo "  push     推送程式碼到 Google Apps Script（預設）"
        echo "  pull     從 Google Apps Script 拉取程式碼"
        echo "  open     在瀏覽器開啟 Apps Script 編輯器"
        echo "  web      在瀏覽器開啟 Web App"
        echo "  status   查看即將推送的檔案"
        echo "  logs     查看 Apps Script 執行日誌"
        echo "  help     顯示此說明"
        echo ""
        ;;
    *)
        error "未知指令: $1"
        echo "執行 'bash deploy.sh help' 查看所有指令"
        exit 1
        ;;
esac
