@echo off
echo [1/4] Installing AI_engine...
cd AI_engine && pip install -r requirements.txt
echo.

echo [2/4] Installing Backend...
cd ../Backend && pip install -r requirements.txt
echo.

echo [3/4] Installing nest_gateway...
cd ../nest_gateway && npm install
echo.

echo [4/4] Installing Frontend...
cd ../Frontend && npm install
echo.

echo ===========================================
echo All libraries installed successfully!
echo ===========================================
pause
