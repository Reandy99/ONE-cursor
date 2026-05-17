# Threads Job Crawler

MVP Python untuk mencari lead photographer/videographer dari postingan publik Threads berdasarkan keyword tertentu.

Crawler ini:

- membuka halaman search publik Threads,
- melakukan scroll dengan delay,
- membaca data yang terlihat di halaman,
- memberi skor lead sederhana,
- menghindari duplikasi memakai `seen_posts.json`,
- menulis hasil ke JSON dan CSV.

Crawler ini tidak melakukan login otomatis, auto-DM, auto-comment, auto-like, captcha bypass, rate-limit bypass, atau pengambilan data private.

## Struktur project

```text
threads-job-crawler/
├── crawler.py
├── config.py
├── keywords.txt
├── requirements.txt
├── seen_posts.json
├── output/
│   ├── leads.json
│   └── leads.csv
└── README.md
```

## Cara install

Pastikan Python 3 sudah tersedia.

```bash
cd threads-job-crawler
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

## Cara menjalankan

```bash
cd threads-job-crawler
source .venv/bin/activate
python crawler.py
```

Output akan ditulis ke:

- `output/leads.json`
- `output/leads.csv`

Terminal juga akan menampilkan ringkasan:

```text
Found X new leads
1. score=... | ...
```

## Menjalankan 1x per hari

Contoh cron untuk menjalankan setiap hari jam 08.00:

```cron
0 8 * * * cd /path/to/threads-job-crawler && /path/to/threads-job-crawler/.venv/bin/python crawler.py >> crawler.log 2>&1
```

Sesuaikan path dengan lokasi project di mesin Anda.

## Cara mengubah keyword

Edit `keywords.txt`, satu keyword per baris:

```text
butuh photographer
cari fotografer
dokumentasi event
```

Baris kosong akan diabaikan. Baris yang diawali `#` juga akan diabaikan.

## Cara mengubah jumlah post maksimal

Default maksimal output adalah 20 lead per run. Anda bisa mengubahnya di `config.py`:

```python
MAX_LEADS = 20
```

Atau lewat environment variable:

```bash
MAX_LEADS=10 python crawler.py
```

## Mode headed untuk debugging

Default browser berjalan dengan `headless=True`.

Untuk melihat browser saat crawler berjalan:

```bash
THREADS_HEADLESS=false python crawler.py
```

Anda juga bisa mengubah default di `config.py`:

```python
HEADLESS = False
```

Jika Threads membatasi akses publik, meminta login, menampilkan captcha, atau halaman search tidak memuat postingan, jalankan mode headed dan cek halaman secara manual. Crawler akan menampilkan log peringatan dan lanjut ke keyword berikutnya bila halaman gagal dimuat.

## Konfigurasi penting

Konfigurasi berada di `config.py`.

Beberapa nilai bisa dioverride dengan environment variable:

| Variable | Default | Keterangan |
| --- | --- | --- |
| `THREADS_HEADLESS` | `true` | `false` untuk membuka browser terlihat |
| `MAX_LEADS` | `20` | Maksimal lead yang disimpan per run |
| `SCROLL_COUNT` | `5` | Jumlah scroll per keyword |
| `SCROLL_DELAY_SECONDS` | `2.0` | Delay antar scroll |
| `KEYWORD_DELAY_SECONDS` | `2.0` | Delay antar keyword |
| `PAGE_TIMEOUT_MS` | `30000` | Timeout load halaman |
| `MIN_LEAD_SCORE` | `4` | Skor minimum agar post disimpan |

Gunakan environment variable untuk konfigurasi yang sensitif bila suatu saat project diperluas. Versi MVP ini tidak membutuhkan credential atau login.

## Lead scoring

Crawler memberi skor berdasarkan teks postingan:

- `+2` untuk setiap positive keyword yang muncul.
- `-3` untuk setiap negative keyword yang muncul.
- Hanya post dengan skor `>= 4` yang disimpan.
- Hasil diurutkan dari skor tertinggi.
- Maksimal output mengikuti `MAX_LEADS`.

Positive dan negative keyword dapat diedit di `config.py`.

## Deduplication

Crawler memakai `seen_posts.json` untuk menghindari duplikat antar run:

- Jika `post_url` ditemukan, URL tersebut dipakai sebagai ID unik.
- Jika `post_url` tidak ditemukan, crawler memakai hash SHA-256 dari teks post.
- Hanya lead yang diexport pada run tersebut yang ditambahkan ke `seen_posts.json`.

Jika Anda ingin mengulang dari awal, kosongkan file menjadi:

```json
[]
```

## Catatan selector Threads

Selector Threads bisa berubah kapan saja karena struktur HTML platform dikontrol oleh Threads. Selector utama berada di `crawler.py` pada `POST_CONTAINER_SELECTORS`.

Jika hasil kosong padahal halaman search menampilkan postingan:

1. Jalankan `THREADS_HEADLESS=false python crawler.py`.
2. Inspect struktur halaman secara manual.
3. Update `POST_CONTAINER_SELECTORS` atau helper ekstraksi di `crawler.py`.

Kode dibuat defensif agar selector yang gagal tidak langsung membuat crawler crash.

## Catatan etika dan batasan

Gunakan crawler ini hanya untuk lead research manual dari data publik yang terlihat di halaman.

Hal yang tidak disarankan dan tidak disediakan oleh project ini:

- spam,
- auto-DM,
- auto-comment,
- auto-like,
- scraping data private,
- login otomatis,
- bypass captcha,
- bypass rate limit,
- teknik menghindari deteksi platform.

Hormati aturan Threads, privasi user, dan batas akses platform. Jika platform membatasi akses atau meminta login, hentikan automasi dan lakukan debugging manual secara wajar.
