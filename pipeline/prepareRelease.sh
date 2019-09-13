#!/bin/bash
set -euv

rm -rf dist/
rm -rf release/

npm run build

mkdir -p release
mv ./dist ./release/dist
cp package.json ./release/package.json
cp README.md ./release/README.md
cp CHANGELOG.md ./release/CHANGELOG.md
cp LICENSE ./release/LICENSE
