#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting TotalFund..."

# Backend
cd "$ROOT/backend"
if [ ! -d "venv" ]; then
  echo "[BE] Creating virtualenv..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
echo "[BE] Backend starting on http://localhost:8000"
python3 bot.py &
BE_PID=$!

# Frontend
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo "[FE] Installing npm dependencies..."
  npm install
fi
echo "[FE] Frontend starting on http://localhost:3000"
npm start &
FE_PID=$!

# Trap Ctrl+C to kill both
trap "echo ''; echo 'Stopping...'; kill $BE_PID $FE_PID 2>/dev/null; exit 0" INT TERM

wait $BE_PID $FE_PID
