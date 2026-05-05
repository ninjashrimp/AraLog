#!/usr/bin/env bash
set -x


cd ~/projects/aralog
sed -i 's/maxWidth: 2000/maxWidth: 3200/' js/services/photo-service.js
sed -i 's/maxHeight: 2000/maxHeight: 3200/' js/services/photo-service.js
sed -i "s/CACHE_VERSION = 'aralog-v[0-9]*'/CACHE_VERSION = 'aralog-v19'/" sw.js
git add .
git commit -m "Foto-Auflösung: max 3200px für Detailaufnahmen"
git push
