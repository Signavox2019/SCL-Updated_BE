#!/bin/bash
set -e

echo "===== Installing Times New Roman fonts ====="

mkdir -p /usr/share/fonts/truetype/custom

cp .platform/fonts/*.TTF /usr/share/fonts/truetype/custom/

chmod 644 /usr/share/fonts/truetype/custom/*.TTF

fc-cache -fv

echo "===== Times New Roman fonts installed ====="
