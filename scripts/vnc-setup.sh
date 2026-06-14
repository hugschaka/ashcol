#!/bin/bash
# מקים דפדפן גרפי נגיש דרך הדפדפן (noVNC) בתוך container,
# כדי להריץ notebooklm login מ-IP של השרת.
set -e
export DEBIAN_FRONTEND=noninteractive
echo "=== installing VNC stack ==="
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq xvfb x11vnc novnc websockify >/dev/null 2>&1
echo "installed"

# נקה ריצות קודמות
pkill -f Xvfb 2>/dev/null || true
pkill -f x11vnc 2>/dev/null || true
pkill -f websockify 2>/dev/null || true
sleep 1

export DISPLAY=:99
echo "=== starting virtual display ==="
Xvfb :99 -screen 0 1360x900x24 >/tmp/xvfb.log 2>&1 &
sleep 3

echo "=== starting VNC server (password protected) ==="
mkdir -p /root/.vnc
x11vnc -storepasswd 'ashcol2026' /root/.vnc/passwd >/dev/null 2>&1
x11vnc -display :99 -rfbauth /root/.vnc/passwd -forever -shared -bg -rfbport 5900 >/tmp/x11vnc.log 2>&1
sleep 2

echo "=== starting noVNC web access (port 6080) ==="
websockify -D --web=/usr/share/novnc 6080 localhost:5900 >/tmp/novnc.log 2>&1
sleep 2

echo "=== launching notebooklm login in Chromium ==="
DISPLAY=:99 nohup notebooklm login --browser chromium >/tmp/login.log 2>&1 &
sleep 5

echo "=== status ==="
pgrep -a Xvfb >/dev/null && echo "Xvfb: running"
pgrep -a x11vnc >/dev/null && echo "x11vnc: running"
pgrep -fa websockify >/dev/null && echo "websockify: running"
echo "--- login log ---"
cat /tmp/login.log 2>/dev/null | head -10
