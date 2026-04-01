#!/bin/bash
# shellcheck shell=bash
# 僅供 source：為 Node（clasp、npm）設定 NODE_EXTRA_CA_CERTS。
# 由 deploy.sh、scripts/run-clasp.sh 載入；勿直接執行。
_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$_ROOT/deploy.local.sh" ]; then
    # shellcheck disable=SC1091
    . "$_ROOT/deploy.local.sh"
fi
if [ -z "${NODE_EXTRA_CA_CERTS:-}" ]; then
    if [ -n "${FLASHCARD_CA_BUNDLE:-}" ] && [ -f "${FLASHCARD_CA_BUNDLE}" ]; then
        export NODE_EXTRA_CA_CERTS="${FLASHCARD_CA_BUNDLE}"
    elif [ -f "$_ROOT/.node-extra-ca.pem" ]; then
        export NODE_EXTRA_CA_CERTS="$_ROOT/.node-extra-ca.pem"
    fi
fi
unset _ROOT
