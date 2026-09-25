# MeshScope

Service mesh traffic console: live topology map, zones, traces,
alerts, incidents, saved views, runbooks, and settings. Everything is static—no
backend, no build step, and no dependencies to install.

Data di dalamnya sintetis dan dihasilkan di browser; ini prototipe interface,
bukan koleksi metrik sungguhan.

## Menjalankan secara lokal

Karena file-nya sudah terpisah (HTML, CSS, JS), buka lewat server kecil —
bukan klik dua kali — supaya path relatifnya terbaca:

Masuk dengan email apa pun dan kata sandi minimal 6 karakter.

## Struktur

```
index.html                  markup + sprite ikon SVG
favicon.ico                 favicon 16/32 px untuk browser lama
site.webmanifest            nama, warna, dan ikon saat dipasang sebagai app
.nojekyll                   matikan pemrosesan Jekyll di GitHub Pages
assets/
  css/base.css              design token, reset, halaman sign-in
  css/console.css           kerangka konsol, peta, delapan halaman, responsif
  js/core.js                helper, animasi sign-in, mesin topologi
  js/console.js             pita waktu, chart, tabel, dropdown, layout map/grid
  js/views.js               router + semua halaman di sidebar
  img/                      favicon SVG, ikon PWA, gambar preview
```

## Catatan

- Font diambil dari Google Fonts; tanpa internet, halaman jatuh ke font sistem.
- Animasi mengikuti `prefers-reduced-motion`.
- Tata letak diuji pada lebar 1920, 1600, 1100, dan 430 piksel.
