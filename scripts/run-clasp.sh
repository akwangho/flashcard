#!/bin/bash
# 與 deploy.sh 相同之 CA 設定後執行 clasp（供 npm scripts 使用）
_REPO="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
. "$_REPO/clasp-node-ca.sh"
exec clasp "$@"
