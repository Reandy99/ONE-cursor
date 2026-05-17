# Threads Job Crawler

MVP Python untuk mencari lead photographer/videographer dari postingan publik Threads berdasarkan keyword tertentu, dengan fokus default ke area Jabodetabek.

Crawler ini:

- membuka halaman search publik Threads,
- melakukan scroll dengan delay,
- membaca data yang terlihat di halaman,
- memberi skor lead sederhana,
- memfilter hasil agar default-nya hanya menyimpan post dengan sinyal lokasi Jabodetabek,
- memfilter hasil agar default-nya hanya menyimpan post terbaru dalam beberapa jam terakhir,
- menghindari duplikasi memakai `seen_posts.json`,
- menulis hasil ke JSON dan CSV,
- mengirim payload JSON ke n8n Webhook jika `N8N_WEBHOOK_URL` diisi.

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

Field utama output:

- `keyword`: keyword search yang menghasilkan lead
- `username`: username Threads jika bisa ditemukan
- `posted_at`: timestamp yang terlihat di Threads, misalnya `1 jam`, `3 hari`, atau tanggal
- `post_age_hours`: estimasi umur post dalam jam jika timestamp bisa diparse
- `text`: teks post yang terlihat di halaman
- `post_url`: permalink post
- `scraped_at`: waktu crawler mengambil data
- `lead_score`: skor lead
- `matched_locations`: lokasi target yang cocok, misalnya `jakarta` atau `jabodetabek`
- `matched_positive_keywords`: keyword positif yang ditemukan
- `matched_negative_keywords`: keyword negatif yang ditemukan
- `status`: default `new`

Terminal juga akan menampilkan ringkasan:

```text
Found X new leads
1. score=... | ...
```

Jika `N8N_WEBHOOK_URL` diisi, crawler juga akan mengirim hasil lead ke n8n setelah file JSON/CSV selesai ditulis.

## Menjalankan 1x per hari

Contoh cron untuk menjalankan setiap hari jam 08.00:

```cron
0 8 * * * cd /path/to/threads-job-crawler && /path/to/threads-job-crawler/.venv/bin/python crawler.py >> crawler.log 2>&1
```

Sesuaikan path dengan lokasi project di mesin Anda.

## Integrasi n8n Webhook

Crawler membaca URL Webhook n8n dari environment variable:

```bash
export N8N_WEBHOOK_URL="https://your-n8n-domain/webhook/threads-leads"
python crawler.py
```

Atau jalankan dalam satu command:

```bash
N8N_WEBHOOK_URL="https://your-n8n-domain/webhook/threads-leads" python crawler.py
```

Jika `N8N_WEBHOOK_URL` kosong, crawler tetap berjalan normal dan hanya menyimpan:

- `output/leads.json`
- `output/leads.csv`

Payload yang dikirim ke n8n:

```json
{
  "scraped_at": "2026-05-17T08:00:00+00:00",
  "source": "threads",
  "total_leads": 20,
  "leads": [
    {
      "keyword": "photographer jakarta",
      "username": "contoh_user",
      "posted_at": "2 jam",
      "post_age_hours": 2.0,
      "text": "Butuh photographer event di Jakarta...",
      "post_url": "https://www.threads.com/@contoh_user/post/POST_ID",
      "scraped_at": "2026-05-17T08:00:00+00:00",
      "lead_score": 9,
      "matched_locations": ["jakarta"],
      "matched_positive_keywords": ["butuh", "event", "photographer"],
      "matched_negative_keywords": [],
      "status": "new"
    }
  ]
}
```

Contoh workflow n8n:

```text
Schedule Trigger -> Execute Command / Webhook -> Google Sheets -> Telegram
```

Penjelasan praktis:

1. `Schedule Trigger`: jalankan workflow setiap hari, misalnya jam 08.00.
2. `Execute Command`: jalankan crawler di server yang memiliki project ini.
   Contoh command:

   ```bash
   cd /path/to/threads-job-crawler && N8N_WEBHOOK_URL="https://your-n8n-domain/webhook/threads-leads" .venv/bin/python crawler.py
   ```

3. `Webhook`: terima HTTP POST JSON dari crawler.
4. `Google Sheets`: simpan setiap item dari `leads` sebagai baris baru.
5. `Telegram`: kirim ringkasan, misalnya `total_leads` dan beberapa lead dengan skor tertinggi.

Catatan: pada beberapa setup, `Execute Command` dipakai untuk menjalankan crawler, sedangkan `Webhook` berada di workflow lain untuk menerima payload dari crawler.

## Cara mengubah keyword

Edit `keywords.txt`, satu keyword per baris:

```text
butuh photographer jakarta
cari fotografer jabodetabek
dokumentasi event bekasi
```

Baris kosong akan diabaikan. Baris yang diawali `#` juga akan diabaikan.

## Fokus lokasi Jabodetabek

Secara default crawler hanya menyimpan post yang mengandung salah satu sinyal lokasi di `LOCATION_KEYWORDS`, misalnya:

- `jabodetabek`
- `jakarta`, `jaksel`, `jakbar`, `jakpus`, `jakut`, `jaktim`
- `bogor`
- `depok`
- `tangerang`, `tangerang selatan`, `tangsel`
- `bekasi`
- area populer seperti `bsd`, `serpong`, `alam sutera`, `bintaro`, `cibubur`, `sentul`, `kemang`, `scbd`, dan lainnya

Daftar lengkap bisa diedit di `config.py`:

```python
LOCATION_KEYWORDS = [
    "jabodetabek",
    "jakarta",
    "bekasi",
]
```

Kalau ingin crawler kembali menerima hasil global, set:

```bash
REQUIRE_LOCATION_MATCH=false python crawler.py
```

Post yang cocok dengan lokasi mendapat tambahan skor `LOCATION_SCORE`, default `+3`.

## Filter waktu terbaru

Secara default crawler hanya menyimpan post yang timestamp link-nya terlihat sebagai post baru, misalnya:

- `baru saja`
- `12 menit`
- `3 jam`

Default batas waktu adalah 5 jam terakhir:

```bash
MAX_POST_AGE_HOURS=5 python crawler.py
```

Kalau ingin lebih ketat, misalnya hanya 3 jam terakhir:

```bash
MAX_POST_AGE_HOURS=3 python crawler.py
```

Crawler membaca umur post dari timestamp link Threads, bukan dari seluruh teks post. Ini mencegah salah baca durasi event seperti `2 jam kerja` sebagai umur post. Crawler akan menolak post seperti `1 hari`, `2 hari`, atau tanggal lama. Untuk menjaga data tetap fresh, post yang hanya menampilkan tanggal tanpa jam/menit juga ditolak secara default karena tidak bisa dipastikan masuk 3-5 jam terakhir.

Kalau Anda ingin menerima post bertanggal hari ini walaupun Threads tidak menampilkan jam, set:

```bash
ACCEPT_DATE_ONLY_CURRENT_DAY=true python crawler.py
```

Kalau ingin mematikan filter waktu:

```bash
REQUIRE_RECENT_POSTS=false python crawler.py
```

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
| `N8N_WEBHOOK_URL` | kosong | URL Webhook n8n untuk menerima payload lead |
| `N8N_REQUEST_TIMEOUT_SECONDS` | `15.0` | Timeout HTTP POST ke n8n |
| `REQUIRE_LOCATION_MATCH` | `true` | Hanya simpan post yang menyebut lokasi Jabodetabek |
| `LOCATION_SCORE` | `3` | Tambahan skor jika post cocok dengan lokasi target |
| `REQUIRE_RECENT_POSTS` | `true` | Hanya simpan post yang timestamp-nya masih baru |
| `MAX_POST_AGE_HOURS` | `5.0` | Batas umur post maksimal dalam jam |
| `ACCEPT_DATE_ONLY_CURRENT_DAY` | `false` | Terima post bertanggal hari ini walau tanpa jam/menit |
| `LOCAL_TIMEZONE` | `Asia/Jakarta` | Timezone lokal untuk pengecekan tanggal hari ini |
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
- `+3` jika post mengandung sinyal lokasi Jabodetabek.
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
