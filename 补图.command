#!/bin/zsh
# 火山引擎账户充值后，双击本文件即可把缺失的插画一次补齐并自动上线
cd "$(dirname "$0")"
echo "开始补生成缺失插画（已有的会自动跳过）..."
node tools/gen_scenes.mjs scenes
node tools/gen_scenes.mjs breads
echo "提交并上线..."
git add -A && git commit -m "art: 补齐缺失插画" && git push origin main
echo "完成！刷新页面即可看到新插画。"
