#!/bin/bash
# מוסיף מנהל חלונות (fluxbox) ומפעיל מחדש את ה-login כדי שהחלון יוצג
export DEBIAN_FRONTEND=noninteractive
echo "=== installing window manager ==="
apt-get install -y -qq procps fluxbox >/dev/null 2>&1
echo "installed"

# נקה ריצות קודמות
pkill -f chrome 2>/dev/null || true
pkill -f notebooklm 2>/dev/null || true
pkill -f playwright 2>/dev/null || true
sleep 2

export DISPLAY=:99
echo "=== starting window manager ==="
pkill -f fluxbox 2>/dev/null || true
nohup fluxbox >/tmp/fluxbox.log 2>&1 &
sleep 3

echo "=== relaunching login ==="
DISPLAY=:99 nohup notebooklm login --browser chromium >/tmp/login.log 2>&1 &
sleep 10

echo "=== chrome windows on display ==="
DISPLAY=:99 xwininfo -root -children 2>/dev/null | grep -ic chrom || echo "0"
echo "=== login.log ==="
cat /tmp/login.log 2>/dev/null | tail -6
