# Katkıda bulunma

Markdown dosyaları (`README.md`, `categories/`, `platforms/`, `licenses/`, `lists/`) otomatik üretilir. Elle düzenlenen tek yer `data/` klasörüdür.

## Yeni uygulama ekleme

1. `data/apps.json` dosyasına bir kayıt ekle:

```json
{
  "category": "Geliştirici Araçları",
  "category_slug": "gelistirici-araclari",
  "replaces": "Postman",
  "name": "Bruno",
  "url": "https://github.com/usebruno/bruno",
  "license_type": "osi",
  "license": "MIT",
  "platforms": ["Linux", "Windows", "macOS"],
  "description": "Koleksiyonlar git'te düz dosya olarak duruyor.",
  "laravel": false,
  "trending": false
}
```

2. Listeleri yeniden üret: `node scripts/build.mjs`
3. Değişen dosyalarla birlikte PR aç.

## Alanlar

| Alan | Değerler |
| --- | --- |
| `license_type` | `osi` (OSI onaylı), `open-core` (OSI çekirdek + `ee/`, `enterprise/` gibi ticari lisanslı klasörler), `other` (CC-BY gibi OSI dışı serbest lisanslar) veya `restricted` (BSL, FSL, Sustainable Use, Elastic, Commons Clause vb.) |
| `platforms` | `Linux`, `Windows`, `macOS`, `Android`, `iOS`, `Mobil`, `Masaüstü`, `Tümü`, `Web`, `Sunucu`, `Docker`, `CLI`, `VS Code`, `JetBrains`, `Tarayıcı eklentisi`, `Laravel paketi`, `Repo` (skill ve plugin koleksiyonları), `MCP sunucusu`, `Obsidian eklentisi`, `Thunderbird eklentisi`, `Zotero eklentisi` |
| `laravel` | Uygulamanın kendisi Laravel ile yazılmışsa `true` |
| `trending` | Repo 2025 veya sonrasında açıldıysa ve 5000+ yıldızı varsa `true` |

Yeni bir platform değeri eklersen `scripts/build.mjs` içindeki `PLATFORM_MAP`'e de ekle.

## Kabul kriterleri

- Proje aktif olmalı (son 12 ayda commit).
- Lisans projenin kendi LICENSE dosyasından kontrol edilmeli. Repo kökünde `ee/`, `enterprise/` veya `premium/` klasörü varsa `open-core` seç.
- Birden fazla uygulamayı tek kayıtta birleştirme; her uygulama kendi linkiyle ayrı kayıt olsun.
- Açıklama tek cümle, Türkçe ve pazarlama dili olmadan yazılmalı.
