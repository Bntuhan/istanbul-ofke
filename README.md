# İstanbul Öfke — Trafiği Mahvet Simülatörü

Web prototip (HTML5 Canvas + TypeScript + Vite). Bu sürüm **Core Feel dikey dilimi** —
Programmer Brief'in altın kuralına odaklanır:

> _"Ram doğru hissettirene kadar hiçbir şey önemli değil."_

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:5173 (veya gösterilen port)
```

Üretim derlemesi:

```bash
npm run build    # tsc tip kontrolü + vite build -> dist/
npm run preview
```

## Nasıl Oynanır

- **Uzun kaydır** = tam RAM (1 şarj harcar, hedefi yok eder).
- **Kısa kaydır** = hafif dürtme (bedava, yıkım yok).
- Masaüstünde test için: **WASD / ok tuşları** tam ram atar.
- Hasar barın biterse koşu biter; tekrar başlamak için kaydır/tıkla.

## Bu Dilimde Çalışan Sistemler

| Sistem | Dosya | Notlar |
|---|---|---|
| Kaydırma-Ram girişi | `engine/input.ts` | Swipe yön + büyüklük, kısa/uzun ayrımı, klavye fallback, haptic |
| Ram fiziği + şarj | `game/player.ts`, `game/ramSystem.ts` | 3 şarj, 4sn yenileme, Full Öfke'de sınırsız |
| Öfke Metresi | `game/ofkeMeter.ts` | 5 durum, decay, 100%'de 10sn Full Öfke (x3 skor) |
| Zincir Öfke (kombo) | `game/combo.ts` | x2→x5, 5'te burst, 10'da Full Öfke tetikler |
| Yıkım veritabanı | `game/targets.ts` | 5 hedef (hayalet frenci, çakarlı, dolmuş, çift park, simitçi) |
| Juice | `game/game.ts`, `engine/camera.ts`, `engine/particles.ts` | Hit-stop, kamera sarsıntısı, debris, Kaynıyor bullet-time |
| HUD + vignette | `game/hud.ts` | Öfke metresi, Hasar, skor, kombo, ram şarjları, durum rengi |
| **Level sistemi** | `game/levels.ts` | `LevelConfig` + `LevelManager`; Level 1 tam, hedef takibi, radyo intro |
| **Durum makinesi** | `game/game.ts` | intro → oynanıyor → kazandı/kaybetti, ekranlar |
| **Yoğun trafik** | `game/game.ts` | Şeritleri tampon-tampona dolduran spawner + araç-takip (dur-kalk jam) |
| **Ses (prosedürel)** | `engine/audio.ts` | WebAudio: Öfke'ye bağlı arabesk-tarzı katmanlı müzik, hedef-spesifik SFX, Full Öfke bas drop, radyo anonsu (TTS) |

Yıkım hedefleri tamamen data-driven (`TARGET_TYPES`) — yeni hedef eklemek bir tablo satırı.
Leveller de data-driven (`LEVELS`) — yeni level bir config satırı.

> Ses tarayıcı kuralı gereği ilk dokunuşta açılır. **M** tuşu sesi aç/kapatır.

## Sıradaki Adımlar (Brief Build Roadmap)

1. **Hedef-spesifik yıkım animasyonları** (şu an jenerik spin/fly): hayalet frenci kayar,
   dolmuş 180° döner + yolcular kaçar, çakarlı T-bone + flaşörler uçar.
2. **İETT Otobüsü boss** (3 vuruş) ve **sokak elementleri** (dilenci, çiçekçi, su satıcısı, yaya geçidi).
3. **Level 2 — Metrobüs Çılgınlığı** (Avcılar): 2.000 puan hedefi, otobüs trafiği, x2 otobüs kombosu.
4. Araç sistemi + modifikasyon (Tofaş → Renault 12 → Dolmuş → İETT → Tanker).
5. Gerçek arabesk müzik/ses asset'leri (şu an prosedürel placeholder).
