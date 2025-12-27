@echo off

git checkout main
git pull origin main

git branch -D flow-only

git subtree split --prefix=flow -b flow-only

git push origin flow-only --force

pause >nul