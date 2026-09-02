# QR Profile Card — Quraşdırma

## v22 dəyişiklikləri (bu versiya)
- **3 dil (AZ/EN/RU):**
  - `register.html` — tam UI tərcüməsi, sağ yuxarıda AZ/EN/RU dil düymələri.
  - İctimai profil (`profile.js`, `/p/:slug`) — bütün başlıq/düymə/mesaj mətnləri 3 dildə, sağ yuxarıda üzən dil düymələri (AZ/EN/RU). Ziyarətçinin brauzer dilinə görə ilkin dil avtomatik seçilir, sonra localStorage-də yadda saxlanılır.
  - `index.html` (redaktor) — "Haqqımda (bio)" və "Ətraflı haqqımda mətni" indi **AZ/EN/RU tab-larla** ayrıca yazılır. Yalnız AZ doldursan kifayətdir (digər dillər avtomatik AZ-a "fallback" edir), amma xarici müştərilər üçün EN/RU-nu da doldurmaq tövsiyə olunur. Köhnə (tək dilli) profillər problemsiz işləməyə davam edir.
- **Google (Gmail) ilə qeydiyyat və giriş:**
  - `register.html`-də "Google ilə davam et" düyməsi — ad/email avtomatik dolur.
  - `index.html`-də "Google ilə daxil ol" düyməsi — əvvəllər Google (və ya eyni email) ilə qeydiyyatdan keçmisənsə, açar yazmadan birbaşa profilə keçir.
  - **VACİB:** Bunun işləməsi üçün Google Cloud Console-da bir **OAuth 2.0 Client ID (Web application)** yaratmalısan, "Authorized JavaScript origins" hissəsinə saytının domenini (`https://sənin-domenin.az`) əlavə et, sonra Netlify-da `GOOGLE_CLIENT_ID` env dəyişənini həmin Client ID ilə təyin et. Təyin etməsən, Google düymələri sadəcə görünməyəcək, sistemin qalan hissəsi normal işləyəcək.
- **"Açarımı unutmuşam" bərpası** — `index.html`-də email yazıb açarını yenidən email-ə göndərə bilərsən (`recover-key.js`).
- **Rəy formasında QR profil linki** — indi "🔗 QR profilimin linkini əlavə et" düyməsinə basınca sahə açılır, tam link və ya sosial şəbəkə linki yazıla bilər; link tapılmasa belə klikable şəkildə saxlanılır.
- **VACİB:** Bu versiyanı yükləmədən əvvəl Supabase SQL Editor-də yenidən `supabase-schema.sql`-i işə sal (yeni sütunlar: `licenses.google_sub`, `licenses.google_email`) — mövcud data silinmir.

## v21 dəyişiklikləri
- Qeydiyyat səhifəsindəki (`register.html`) rəy formasına: rəy yazanın şəkli (avtomatik kiçildilib yüklənir), öz QR profilinin açarı (varsa avatar+link avtomatik oradan çəkilir) və sosial şəbəkə linki əlavə olundu.
- İctimai profil səhifəsi (`/p/:slug`, `profile.js`) tünd göy-bənövşəyi mövzudan **açıq, modern, LinkedIn tərzli göy mövzuya** keçirildi.
- Profilə yeni funksionallıqlar əlavə olundu: baxış sayğacı + keçid/albom statistikası, "Öz QR kodumu göstər" düyməsi (modal), təsdiqlənmiş profil nişanı dəstəyi (`profile_data.verified = true`).


## Necə işləyir
- `index.html` — məhsulun özü (istifadəçi görür): lisenziya açarı ilə aktivləşir. Admin hər lisenziya üçün icazə verilən **cihaz sayını** təyin edir (məs. 2 — telefon + kompyuter). O sayda cihaza qədər eyni açarla aktivləşmək olar, hamısında **eyni profil** (linklər, şəkillər, albomlar) görünür — heç birində məlumatı təkrar doldurmaq lazım deyil.
- `admin.html` (`/admin`) — sənin idarəetmə panelin: yeni açar yarat (cihaz limiti ilə), ayrı-ayrı cihazları sil, kimin cəhd etdiyini məkanı ilə birlikdə gör.
- `netlify/functions/*` — bütün yoxlama məntiqi burada işləyir (server-side, kimsə HTML-i açıb koda baxsa belə, cihaz məlumatı və şifrələmə açarı ora görünmür).
- Verilənlər Supabase-də saxlanılır, icazəsiz cəhdlərdə (yaxud yeni cihaz aktivləşəndə) Telegram bot vasitəsilə sənə mesaj gəlir — şəhər, region, ölkə və internet operatoru daxil olmaqla.

## 1. Supabase qur
1. supabase.com-da yeni layihə yarat (əgər hazır varsa onu da istifadə edə bilərsən).
2. **SQL Editor**-də `supabase-schema.sql` faylının içindəkiləri işə sal (bu, cədvəlləri VƏ şəkil/video saxlamaq üçün "media" adlı storage bucket-i də avtomatik yaradır). ⚠️ Əgər `licenses` cədvəli artıq mövcuddursa, fayldakı `alter table` sətirləri onu təhlükəsiz şəkildə yeniləyəcək (mövcud məlumatlar silinmir).
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
| `ADMIN_CONTACT_PHONE` | (opsional) sənin (admin) telefon nömrən, məs. `+994504759150`. Bu, **bütün profil səhifələrinin altında** "Siz də belə profil istəyirsiniz?" reklam bölməsində göstərilir və WhatsApp-a keçid verir |
| `GMAIL_USER` | (tövsiyə olunur) email göndərmək üçün öz Gmail ünvanın, məs. `balakishi5@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail-in "App Password"-u (aşağıda necə alınacağı izah olunub) — **bu, adi Gmail parolun DEYİL** |
| `RESEND_API_KEY` | (opsional, Gmail təyin olunmayıbsa istifadə olunur) resend.com-da pulsuz hesab aç, API key götür |
| `RESEND_FROM` | (opsional) göndərən ünvan, məs. `QR Profile Card <bildiris@sendomeni.com>` |

### 📧 Email göndərmə — Gmail ilə (tövsiyə olunan üsul)
Sistem indi email-ləri **sənin öz Gmail ünvanından** (`balakishi5@gmail.com` kimi) göndərə bilir — domen almağa ehtiyac yoxdur, istənilən ünvana çatır:

1. Google hesabında **2 addımlı doğrulama** (2-Step Verification) aktiv olmalıdır (Google Account → Security)
2. **myaccount.google.com/apppasswords** səhifəsinə get
3. Tətbiq adı yaz (məs. "QR Profile Card"), **Yarat** bas
4. Sənə 16 simvollu bir kod göstəriləcək (məs. `abcd efgh ijkl mnop`) — bunu boşluqsuz kopyala
5. Netlify-da:
   - `GMAIL_USER` = `balakishi5@gmail.com`
   - `GMAIL_APP_PASSWORD` = həmin 16 simvollu kod

Bu iki dəyişəni əlavə etdikdən sonra bütün email-lər (əlaqə formu + elan göndər) avtomatik Gmail vasitəsilə, sənin ünvanından, istənilən qəbul edənə gedəcək — Resend-ə, domenə ehtiyac qalmayacaq.

⚠️ **Qeyd:** Adi Gmail hesabının gündəlik göndərmə limiti ~500 email-dir — bu, kiçik/orta müştəri bazası üçün kifayət qədərdir.

### Resend istifadə etmək istəsən (Gmail əvəzinə, alternativ)
Gmail təyin olunmayıbsa, sistem avtomatik Resend-ə keçir (əgər `RESEND_API_KEY` varsa). Amma diqqət: Resend-in pulsuz `onboarding@resend.dev` göndərəni yalnız sənin öz Resend hesabına email göndərə bilir, başqa ünvanlara yox — bunun üçün resend.com-da öz domenini "Domains" bölməsindən təsdiqləyib `RESEND_FROM`-u ona uyğun təyin etməlisən. Ona görə Gmail üsulu daha sadədir.

Deploy et. Netlify avtomatik `npm install` işlədib bütün asılılıqları (`@supabase/supabase-js`, `nodemailer`) quracaq.

## 4. İstifadə axını
1. Sən `/admin` səhifəsinə şifrənlə girirsən.
2. "Yeni lisenziya yarat" hissəsində müştəri/işçi üçün açar yaradırsan (məs. `A1B2C3` — yaxud öz adını yaz), **"Cihaz sayı"** sahəsinə həmin adamın istifadə edəcəyi cihaz sayını yazırsan (məs. 2 — telefon + kompyuter).
3. Açarı ona göndərirsən (Telegram/WhatsApp).
4. O adam əsas sayt linkini telefonunda açıb açarı daxil edir → 1-ci cihaz bağlanır, profilini doldurur.
5. **Eyni açarı kompyuterində də daxil edir** → limit dolmayıbsa (2/2-dən azdırsa) avtomatik 2-ci cihaz kimi bağlanır, **eyni profil məlumatları hər iki cihazda görünür** — heç nə təkrar doldurulmur.
6. Limit dolandan sonra (3-cü cihazdan cəhd) — rədd olunur, admin panelində "Cəhd logları"nda şəhər/ölkə/operator məlumatı ilə görünür, Telegram-a bildiriş gəlir.
7. Admin panelində hər lisenziyanın yanında bütün bağlı cihazlar ayrı-ayrı siyahılanır — istəsən yalnız BİR cihazı silə bilərsən (digərlərinə toxunmadan), ya da "Cihaz sayı"nı istənilən vaxt artıra/azalda bilərsən.

## Bu versiyada yenilənənlər (v20)
- **Qeydiyyat → dərhal profilə keçid** — `/register`-dən sorğu göndərəndən sonra "Profilimi indi qur →" düyməsi çıxır, basan kimi əsas sayt açılır, açar avtomatik doldurulur və aktivləşdirilir (özün əl ilə köçürüb-yapışdırmağa ehtiyac yoxdur). Bunun üçün `index.html`-ə `?key=AÇAR` parametrini oxuyan məntiq əlavə olundu.
- **Avtomatik "xoş gəldin" email-i** — qeydiyyatdan keçən kimi (`request-license` funksiyası) istifadəçiyə HTML formatında email gedir: açarı, "Profilimi indi qur" linki, və qısa istifadə təlimatı (5 addım) daxil olmaqla. Bunun üçün ayrıca quraşdırma lazım deyil — mövcud `GMAIL_USER`/`GMAIL_APP_PASSWORD` (və ya Resend) ayarları avtomatik işə düşür.
- **`/register` tam yeni, peşəkar "landing page" dizaynı** — LinkedIn/UNEC tipli sadə, işgüzar, ağ-fon+lacivərd üslub: xüsusiyyətlər bölməsi, "necə işləyir" addımları, canlı statistika (aktiv istifadəçi sayı, ortalama reytinq), platform haqqında rəylər bölməsi və biznes əməkdaşlığı bloku.
- **Platform statistikası (dinamik say)** — yeni `platform.js` funksiyası aktiv istifadəçi sayını, ümumi rəy sayını və ortalama reytinqi hesablayıb `/register` səhifəsində canlı göstərir.
- **Platform rəyləri (ulduz + şərh)** — istifadəçilər (məhsulun özü haqqında, profil sahibləri haqqında yox) ulduz reytinqi və şərh yaza bilir, `/register`-də siyahı və orta bal görünür. Admin panelində yeni **"Platform rəyləri"** tabından uyğunsuz rəyi silmək mümkündür.
- **Yeni SQL lazımdır** — yuxarıdakı `supabase-schema.sql`-i YENİDƏN SQL Editor-də işə sal (`platform_reviews` cədvəlini yaradır, mövcud məlumatlara toxunmur).

## Əvvəlki versiyadan
- **Email göndərmə kökündən düzəldi — Gmail SMTP dəstəyi əlavə olundu.** İndi email-lər sənin öz Gmail ünvanından (`GMAIL_USER` + `GMAIL_APP_PASSWORD`) göndərilir, domen almağa ehtiyac yoxdur, istənilən ünvana çatır. Resend hələ də alternativ kimi dəstəklənir (Gmail təyin olunmayıbsa avtomatik ona keçir).
- **Özünə-xidmət qeydiyyatı artıq avtomatik aktivləşir** — `/register`-dən keçən yeni istifadəçi dərhal aktiv açar alır, admin təsdiqini gözləmək lazım deyil. Sənə Telegram-a məlumat kimi bildiriş gəlir (əməliyyat tələb olunmur).

## Əvvəlki versiyalardan
- **Fəaliyyət sahələri (çoxlu biznes filtri)** — Profil bölməsində "Fəaliyyət sahələri" yarat (məs. "Mühasibatlıq", "Mebel"), hər link/albom hansı sahəyə aid olduğunu seç. QR skan olunanda yuxarıda seçim düymələri çıxır, ziyarətçi maraqlandığı sahəni seçir, yalnız ona aid olanlar görünür — qarışıqlıq olmur.
- **Bug düzəldi:** qeydiyyatda yazılan telefon nömrəsi indi düzgün olaraq profildəki "Telefon" sahəsinə düşür (əvvəllər sadəcə qeyd kimi saxlanılırdı, görünmürdü).
- **Öz açarını yaza bilmək** — `/register` səhifəsində indi istəyən öz açarını (məs. `CASAELEGANZA`) yaza bilər, boş saxlasa avtomatik yaranır. Artıq götürülmüş açar yazılsa, xəbərdarlıq göstərilir.

## Əvvəlki versiyalardan
- **Mesajları silmək mümkündür** — admin panelində "Mesajlar" tabında hər sətrin yanında "Sil" düyməsi var.
- **Qeydiyyat linki əsas səhifədə** — açar daxil etmə ekranının altında "Hələ açarınız yoxdur? Qeydiyyatdan keçin →" linki var, `/register`-ə aparır.
- **Qeydiyyatda email məcburidir** — daxil edilən email avtomatik "əlaqə email"i kimi təyin olunur (sonra Profil bölməsindən dəyişə bilər). Bu, gələcək "Elan göndər" bildirişlərinin ora çatması üçündür.
- **Diplomlar bölməsi** — Sertifikatlardan tam ayrı, "🎓 Diplomlar" adlı ikinci qalereya bölməsi əlavə olundu.
- **Elan üçün hazır şablon** — admin panelində "Elan göndər" tabında "📋 Şablonu yüklə" düyməsi, hazır format doldurur, sadəcə yeniliyi yazıb göndərmək qalır.

## Əvvəlki versiyalardan
- **Əlaqə mesajları artıq admin-ə (sənə) gəlmir** — "Mənimlə əlaqə et" (əvvəlki "Bizimlə əlaqə") formundan gələn hər mesaj YALNIZ profil sahibinin öz email-inə gedir. Sən Telegram-a heç bir bildiriş almırsan — istəsən admin panelindəki "Mesajlar" tabından bütün mesajlara baxa bilərsən.
- **Reklam/tanıtım bölməsi** — hər profil səhifəsinin altında (əgər `ADMIN_CONTACT_PHONE` təyin olunubsa) "Siz də belə profil istəyirsiniz?" adlı kiçik bölmə görünür, sənin telefon nömrənlə, basanda birbaşa sənə WhatsApp açılır — bu, məhsulu yeni müştərilərə tanıtmaq üçündür.

## Əvvəlki versiyalardan
- **"Bizimlə əlaqə" mesajları artıq düzgün ünvana gedir** — əvvəllər hamısı sənin Telegram-ına düşürdü (bu, başqasına satdığın məhsul üçün düzgün deyildi). İndi hər lisenziya sahibi Profil bölməsində öz email-ini təyin edir, mesajlar birbaşa ORA göndərilir (Resend vasitəsilə). Sən yenə də Telegram-a nəzarət bildirişi alırsan.
- **Vizitka üslubları** — indi 3 hazır dizayn arasından seçim var: Standart (indiqo), Lüks (qara-qızılı), Rəngli/Yaradıcı.
- **Profili paylaş düymələri** — QR skan olunanda açılan səhifədə "Paylaş", WhatsApp və Telegram düymələri ilə istənilən ziyarətçi profili başqasına göndərə bilər.
- **"Ana ekrana əlavə et" (PWA)** — profil səhifəsi indi telefonun "Ana ekrana əlavə et" funksiyasını dəstəkləyir, öz loqonla tətbiq ikonu kimi əlavə olunur. (Qeyd: bu, əsl Apple/Google Wallet kartı deyil — o, ödənişli developer hesabı və sertifikat tələb edir; bunun əvəzinə vCard funksiyası "yadda saxla" ehtiyacını real şəkildə ödəyir.)
- **Özünə-xidmət qeydiyyat səhifəsi** (`/register`) — müştərilərin özləri ad yazıb sorğu göndərə bilər, sənə Telegram bildirişi gəlir, admin paneldən sadəcə "Aktivləşdir" düyməsinə basmaqla təsdiqləyirsən — açar əvvəlcədən yaranıb, sənin əl ilə yazmağına ehtiyac qalmır.
- **"Elan göndər" (broadcast)** — admin panelində yeni tab: bir mesaj yazıb bütün aktiv müştərilərinə eyni anda email göndərə bilərsən (yeni funksiya, yenilik və s. barədə).

## Əvvəlki versiyalardan
- **Kontaktı yadda saxla (vCard)** — profil səhifəsində "📇 Kontaktı yadda saxla" düyməsi ilə, adı/telefonu/email-i birbaşa telefonun kontaktlarına əlavə etmək mümkündür.
- **WhatsApp-a hazır mesajla keçid** — Profil bölməsində WhatsApp üçün hazır mətn yaza bilərsən, düymə basılanda həmin mesaj artıq yazılmış şəkildə açılır.
- **Sertifikatlar / nailiyyətlər bölməsi** — diplom, sertifikat şəkillərini ayrıca yükləyib, profil səhifəndə üfüqi sürüşdürülən "🏆 Sertifikatlar" zolağı kimi göstərə bilərsən.
- **Digər biznes/profilə keçid düyməsi** — əgər başqa lisenziyaların (başqa biznesin) varsa, ora aparan xüsusi düymə əlavə edə bilərsən.
- **İş saatları statusu** — işlək günləri və saatları təyin et, profil səhifəsində avtomatik (Bakı vaxtı ilə hesablanan) "🟢 Hazırda açıqdır / 🔴 Hazırda bağlıdır" nişanı görünəcək.
- **Xəritə önizləməsi** — Profil bölməsində ünvan yazanda arxa planda avtomatik koordinat tapılır (OpenStreetMap, ödənişsiz), profil səhifəsində kiçik xəritə kartı kimi göstərilir, üstünə basanda tam xəritə açılır.
- **Müştəri rəyləri bölməsi** — ad, ulduz reytinqi (1-5) və rəy mətni ilə testimonial kartları əlavə edə bilərsən.

## Əvvəlki versiyalardan
- **Dublikat şəkil problemi düzəldildi** — əvvəllər böyük örtük şəkil ilə kiçik dairəvi avatar eyni fotonu iki dəfə göstərirdi. İndi böyük şəkil yükləyəndə kiçik dairə tam götürülür, sadəcə bir dəfə, təmiz görünür.
- **"Öz haqqımda" statistika bölməsi** — Profil bölməsində ayrıca iri (portret formatlı) şəkil yükləyə bilərsən, ətraflı "haqqımda" mətni yaza bilərsən və "15+ İl təcrübə", "300+ Seminar" kimi statistika sətirləri (maks. 4 ədəd) əlavə edə bilərsən. QR skan olunanda bu, foto + statistika + mətn şəklində peşəkar bölmə kimi görünür.
- **Sosial şəbəkələr 2-sütunlu düymə şəbəkəsi** — hər link indi kompakt, rəngli ikonlu düymə kimi görünür, 2 sütunda düzülür, üzərinə basan kimi həmin şəbəkə açılır.
- **İşləyən "Bizimlə əlaqə" forması** — hər profil səhifəsinin sonunda Ad/Email/Mesaj sahələri və "Göndər" düyməsi var. Göndərilən mesajlar Supabase-də saxlanılır VƏ sənə (admin) Telegram-a bildiriş kimi gəlir. Admin panelində yeni **"Mesajlar"** tabından bütün gələn mesajları görə bilərsən.
- Özünə-xidmət "Cihazlarımı sıfırla" düyməsi (əvvəlki versiyadan)
- QR keyfiyyəti, çox-cihaz dəstəyi, albom sistemi (əvvəlki versiyalardan)
- **Çox-cihaz dəstəyi** — hər lisenziya üçün admin icazə verilən cihaz sayını təyin edir (1-10 arası). Eyni açar o say qədər fərqli cihazda aktivləşə bilər, hamısında **ortaq profil** (linklər, albomlar, şəkillər) görünür. Admin panelində hər cihaz ayrıca idarə olunur (təkini sil, limiti dəyişdir).
- **Detallı cəhd izləməsi** — indi hər aktivasiya/rədd cəhdində IP-ə əsasən şəhər, region, ölkə və internet operatoru avtomatik müəyyən olunur, həm admin panelində, həm Telegram bildirişində göstərilir.
- **Ünvan/Məkan linki** — Profil bölməsində link tipi kimi "Ünvan/Məkan" seçib ünvan yaza bilərsən; QR skan olunanda bu, klikləndikdə birbaşa Google Maps-də həmin ünvanı açan düyməyə çevrilir. Vizitkada da ünvan pill şəklində göstərilir.
- **Öz adını yaz** — hər link üçün indi tip seçməklə yanaşı, öz istədiyin adı da yaza bilərsən (məs. "TOT Təlimi", screenshot-dakı Linktree nümunəsi kimi).
- **Tam yeni "Linktree" üslublu profil dizaynı** — daha iri, parlaq halolu avatar, xüsusi şrift (Baloo 2), yuxarıda sürətli sosial-şəbəkə ikon sırası, incə grid fon naxışı, yumşaq animasiyalar (fade-in, pulsasiya edən avatar həlqəsi) — daha canlı və "vay effekti" verən görünüş.
- **QR keyfiyyəti düzəldildi** — əvvəllər post şəklinin üzərinə qoyulanda QR bulanıqlaşıb oxunmurdu (kiçik ekran ölçüsündən süni böyütmə səbəbindən). İndi QR həmişə yüksək çözünürlükdə (800-1000px) təzədən yaradılır — nə qədər böyütsən də iti/oxunaqlı qalır.
- **Albomlar** — Profildə "Albomlar" adlı bölmə: istədiyin qədər albom yarada bilərsən (məs. "Mətbəx layihələri", "Zal dizaynları"), hər albomda çoxlu şəkil VƏ video yükləyə bilərsən. QR skan olunanda açılan profil səhifəsində bu albomlar qalereya şəklində görünür, üstünə klikləyəndə tam ekranda açılır (video avtomatik oynayır).
- QR skan edəndə "tapılmadı" xətası tam düzəldildi (üç fərqli üsulla slug oxunur, Netlify-ın redirect qeyri-sabitliyinə baxmayaraq işləyir)
- Lisenziya açarları daha qısadır (6 simvol), admin istəsə özü də açar təyin edə bilər
- Profil bölməsinə şəkil/loqo yükləmə əlavə olundu — ictimai profil səhifəsində və vizitkada görünür
- Yeni "Vizitka dizaynı" — QR sadə şəkil kimi deyil, ad + şəkil + telefon + izahlı mətn ilə peşəkar vizitka kartı kimi yüklənir/paylaşılır
- Post üzərinə yerləşdirmə bölməsində QR-ın altına "Skan et" kimi alt yazı default olaraq əlavə olunur (istəsən söndürə bilərsən)
- Telefon nömrəsi ayrıca sahədə saxlanılır, profil səhifəsində birbaşa zəng/WhatsApp düyməsi kimi görünür

## Vacib qeyd — real limitlər
Cihaz tanınması brauzerin fingerprint-i (canvas + user agent + ekran + s.) əsasında olur və nəticə localStorage-də saxlanılır. Bu, sənaye standartıdır, amma 100% qırılmaz deyil:
- **Ən çox rast gəlinən problem:** Safari (xüsusən iOS-da) və WhatsApp/Instagram-ın daxili brauzeri ("in-app browser") müəyyən müddətdən sonra və ya tətbiqi bağlayanda saytın yaddaşını (localStorage) avtomatik təmizləyir. Bu halda sistem eyni fiziki telefonu "yeni cihaz" kimi görür və artıq dolmuş limitə görə rədd edir.
  - **Tövsiyə:** Linki WhatsApp/Instagram-ın öz daxili brauzerində deyil, **Safari və ya Chrome**-da aç (linkin üstünə uzun bas → "Open in Browser" / "Safari-də aç" seçimi). iOS-da bundan sonra "Add to Home Screen" (Ana ekrana əlavə et) etsən, yaddaş daha etibarlı saxlanılır.
- **Özünə-xidmət həll:** Bu problem yaşandıqda istifadəçi artıq admin gözləməli deyil — bloklanma ekranında **"♻️ Cihazlarımı sıfırla və yenidən cəhd et"** düyməsi var, ora basıb öz açarını yenidən daxil edən kimi bütün köhnə cihaz qeydləri təmizlənir və dərhal yenidən aktivləşir. Bu əməliyyat sənə (admin) Telegram-a bildiriş kimi gəlir ki, kim edibsə xəbərin olsun (əgər bu sən deyilsənsə, açarı dərhal söndürə bilərsən).
- Çox təcrübəli istifadəçi developer tools ilə fingerprint-i saxtalaşdıra bilər — amma bu, adi istifadəçi üçün maneədir, tam hərbi səviyyəli qorunma deyil.
- Tez-tez bu problemlə qarşılaşan müştərilər üçün admin paneldən "Cihaz sayı"nı 1-2 əlavə artırmaq (məs. 2 yerinə 3) əlavə təhlükəsizlik boşluğu yaradır.
- Əgər tam bağlanmış mühit lazımdırsa (məs. native mobil tətbiq və ya browser extension), bu ayrı layihədir — mənə de, onu da qura bilərəm.

## Albom (şəkil/video) limitləri
- Supabase-in pulsuz planında ümumi storage həcmi 1GB-dır (video çox yer tutduğu üçün bir neçə onlarla video ilə dolur). Çox istifadə gözlənirsə, Supabase-in ödənişli planına keçmək lazım gələ bilər.
- Tək fayl ölçüsü limiti defolt olaraq 50MB-dır (Supabase Dashboard > Storage > media bucket > Settings-dən artıra bilərsən, plana bağlıdır).
- Yükləmə sürəti istifadəçinin internet bağlantısına bağlıdır — böyük videolar (100MB+) yavaş internetdə uzun çəkə bilər.
