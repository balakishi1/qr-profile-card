# QR Profile Card — Quraşdırma

## Necə işləyir
- `index.html` — məhsulun özü (istifadəçi görür): lisenziya açarı ilə aktivləşir, bir dəfə hansı cihazda açılsa, o cihaza bağlanır.
- `admin.html` (`/admin`) — sənin idarəetmə panelin: yeni açar yarat, cihazı sıfırla, kimin cəhd etdiyini gör.
- `netlify/functions/*` — bütün yoxlama məntiqi burada işləyir (server-side, kimsə HTML-i açıb koda baxsa belə, cihaz məlumatı və şifrələmə açarı ora görünmür).
- Verilənlər Supabase-də saxlanılır, icazəsiz cəhdlərdə Telegram bot vasitəsilə sənə mesaj gəlir.

## 1. Supabase qur
1. supabase.com-da yeni layihə yarat (əgər hazır varsa onu da istifadə edə bilərsən).
2. **SQL Editor**-də `supabase-schema.sql` faylının içindəkiləri işə sal (bu, cədvəlləri VƏ şəkil/video saxlamaq üçün "media" adlı storage bucket-i də avtomatik yaradır).
3. **Project Settings > API**-dan bunları götür:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (⚠️ anon key yox, service_role) → `SUPABASE_SERVICE_KEY`
   - `anon public` key → `SUPABASE_ANON_KEY`
4. **Storage** bölməsinə keçib `media` bucket-inin yarandığını təsdiqlə (adətən avtomatik görünür; görünmürsə əl ilə "New bucket" → ad: `media`, "Public bucket" seçimini aç).

## 2. Telegram bildirişləri (opsional, tövsiyə olunur)
1. @BotFather-dən bot yarat, `TELEGRAM_BOT_TOKEN` götür.
2. Botla söhbətə başla, öz `chat_id`-ni tap (məs. @userinfobot ilə) → `TELEGRAM_CHAT_ID`.

## 3. Netlify-da deploy et
1. Bu qovluğu GitHub reposuna at (və ya Netlify CLI ilə birbaşa `netlify deploy`).
2. Netlify-da **"Add new site" > "Import from Git"** ilə repo-nu bağla.
3. **Site settings > Environment variables**-a bunları əlavə et:

| Dəyişən | Dəyər |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key |
| `SUPABASE_ANON_KEY` | Supabase **anon public** key (Project Settings > API-da, service_role-un yanında) — bu açıq/ictimai açardır, paylaşmaq təhlükəsizdir, albom şəkil/video yükləməsi üçün lazımdır |
| `SESSION_SECRET` | özün uydur, məs. 32 simvollıq təsadüfi mətn (bu, cihaz sessiyalarını imzalamaq üçündür) |
| `ADMIN_PASSWORD` | admin panelə giriş şifrən |
| `TELEGRAM_BOT_TOKEN` | (opsional) bot tokenin |
| `TELEGRAM_CHAT_ID` | (opsional) chat id-n |

4. Deploy et. Netlify avtomatik `npm install` işlədib `@supabase/supabase-js`-i quracaq.

## 4. İstifadə axını
1. Sən `/admin` səhifəsinə şifrənlə girirsən.
2. "Yeni lisenziya yarat" düyməsi ilə müştəri/işçi üçün açar yaradırsan (məs. `A1B2C3D4`).
3. Açarı ona göndərirsən (Telegram/WhatsApp).
4. O adam `index.html` linkini (əsas sayt ünvanını) açıb açarı daxil edir → cihazı avtomatik bağlanır.
5. Başqa cihazdan həmin açarla girməyə cəhd etsə: rədd olunur, admin panelində "Cəhd logları"nda görünür və Telegram-a bildiriş gəlir.
6. Sən istəsən "Cihazı sıfırla" düyməsi ilə o adama yeni cihazdan giriş icazəsi verə bilərsən (məs. telefonu dəyişəndə).

## Bu versiyada yenilənənlər
- **QR keyfiyyəti düzəldildi** — əvvəllər post şəklinin üzərinə qoyulanda QR bulanıqlaşıb oxunmurdu (kiçik ekran ölçüsündən süni böyütmə səbəbindən). İndi QR həmişə yüksək çözünürlükdə (800-1000px) təzədən yaradılır — nə qədər böyütsən də iti/oxunaqlı qalır.
- **Albomlar** — Profildə "Albomlar" adlı yeni bölmə: istədiyin qədər albom yarada bilərsən (məs. "Mətbəx layihələri", "Zal dizaynları"), hər albomda çoxlu şəkil VƏ video yükləyə bilərsən. QR skan olunanda açılan profil səhifəsində bu albomlar qalereya şəklində görünür, üstünə klikləyəndə tam ekranda açılır (video avtomatik oynayır).
- QR skan edəndə "tapılmadı" xətası tam düzəldildi (üç fərqli üsulla slug oxunur, Netlify-ın redirect qeyri-sabitliyinə baxmayaraq işləyir)
- Lisenziya açarları daha qısadır (6 simvol), admin istəsə özü də açar təyin edə bilər
- Profil bölməsinə şəkil/loqo yükləmə əlavə olundu — ictimai profil səhifəsində və vizitkada görünür
- Yeni "Vizitka dizaynı" — QR sadə şəkil kimi deyil, ad + şəkil + telefon + izahlı mətn ilə peşəkar vizitka kartı kimi yüklənir/paylaşılır
- Post üzərinə yerləşdirmə bölməsində QR-ın altına "Skan et" kimi alt yazı default olaraq əlavə olunur (istəsən söndürə bilərsən)
- Telefon nömrəsi ayrıca sahədə saxlanılır, profil səhifəsində birbaşa zəng/WhatsApp düyməsi kimi görünür

## Vacib qeyd — real limitlər
Cihaz tanınması brauzerin fingerprint-i (canvas + user agent + ekran + s.) əsasında olur. Bu, sənaye standartıdır, amma 100% qırılmaz deyil:
- Brauzer məlumatlarını təmizləyəndə (cache/localStorage silinəndə) və ya **incognito/private** rejimdə açılanda sistem bunu "yeni cihaz" kimi görür və girişi rədd edir — bu halda admin paneldən "Cihazı sıfırla" lazımdır.
- Çox təcrübəli istifadəçi developer tools ilə fingerprint-i saxtalaşdıra bilər — amma bu, adi istifadəçi üçün maneədir, tam hərbi səviyyəli qorunma deyil.
- Əgər tam bağlanmış mühit lazımdırsa (məs. native mobil tətbiq və ya browser extension), bu ayrı layihədir — mənə de, onu da qura bilərəm.

## Albom (şəkil/video) limitləri
- Supabase-in pulsuz planında ümumi storage həcmi 1GB-dır (video çox yer tutduğu üçün bir neçə onlarla video ilə dolur). Çox istifadə gözlənirsə, Supabase-in ödənişli planına keçmək lazım gələ bilər.
- Tək fayl ölçüsü limiti defolt olaraq 50MB-dır (Supabase Dashboard > Storage > media bucket > Settings-dən artıra bilərsən, plana bağlıdır).
- Yükləmə sürəti istifadəçinin internet bağlantısına bağlıdır — böyük videolar (100MB+) yavaş internetdə uzun çəkə bilər.
