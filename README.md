# MeshScope

Konsol lalu lintas service mesh: peta topologi yang hidup, zona, trace,
alert, incident, saved view, runbook, dan setelan. Semua statis — tidak ada
backend, tidak ada build step, tidak ada dependency yang perlu dipasang.

Data di dalamnya sintetis dan dihasilkan di browser; ini prototipe antarmuka,
bukan koleksi metrik sungguhan.

## Menjalankan secara lokal

Karena file-nya sudah terpisah (HTML, CSS, JS), buka lewat server kecil —
bukan klik dua kali — supaya path relatifnya terbaca:

```bash
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

Masuk dengan email apa pun dan kata sandi minimal 6 karakter.

## Deploy ke GitHub Pages

1. Buat repository baru, unggah seluruh isi folder ini ke akar repo
   (`index.html` harus berada di akar, bukan di dalam subfolder).
2. Buka **Settings → Pages**.
3. Bagian **Source** pilih **Deploy from a branch**, lalu pilih branch
   `main` dan folder `/ (root)`. Simpan.
4. Tunggu satu sampai dua menit. Situs terbit di
   `https://<username>.github.io/<nama-repo>/`.

Semua path di proyek ini relatif (`assets/...`, bukan `/assets/...`), jadi
situsnya tetap jalan baik di URL proyek (`/nama-repo/`) maupun di domain
sendiri. File `.nojekyll` membuat GitHub menyajikan berkas apa adanya tanpa
diproses Jekyll.

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

Ketiga berkas JavaScript berbagi satu lingkup global dan **harus dimuat
berurutan**: `core.js` → `console.js` → `views.js`.

## Catatan

- Font diambil dari Google Fonts; tanpa internet, halaman jatuh ke font sistem.
- Animasi mengikuti `prefers-reduced-motion`.
- Tata letak diuji pada lebar 1920, 1600, 1100, dan 430 piksel.
