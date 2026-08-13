# Cloudflare OS Nedir, Ne Değildir?

### Cloudflare bu ay açık kaynak bir "AI işletim sistemi" yayınladı. Kurup denedim. Ne yapıyor, ne yapmıyor, ve tartışmaya değer tek iddiası ne?

> **[GÖRSEL 1 — kapak]** `images/01-hero-q3-workspace.png`
> Cloudflare OS'ta bir Q3 planlama çalışma alanı. Bu görsel reponun içinde geliyor
> (`docs/images/q3-planning-workspace.png`), Apache-2.0 kapsamında, atıfla güvenle
> kullanılabilir. Altyazı: *Cloudflare OS — görsel proje reposundan (Apache-2.0).*

---

Cloudflare, 4 Ağustos'ta **Cloudflare OS** diye bir şey yayınladı. Açık kaynak, Apache-2.0, [GitHub'da duruyor](https://github.com/cloudflare/cloudflare-os). Birkaç günde 6.400 yıldız topladı.

Haberlerin hepsi aynı iki kelimeye sarıldı: işletim sistemi.

İşin tuhafı, o iki kelimeyi Cloudflare'in kendisi daha baştan reddediyor. README'nin ikinci paragrafında açıkça yazıyor: bu, geleneksel anlamda bir bilgisayar işletim sistemi değil. Siz sormaya fırsat bulamadan söylüyorlar, ardından terimi hangi iki anlamda kullandıklarını anlatıyorlar.

O zaman sorulacak asıl soru şu: isim bir kenara, geriye ne kalıyor?

Kalan şey tek bir cümle. README'nin sonlarındaki bir bölümde duruyor ve "belki" diye temkinlendirilmiş:

> AI agent'ları **"basitçe kullanıcı olarak ele alınamaz."**

Bu artık bir pazarlama cümlesi değil. Yazılımın nasıl tasarlanması gerektiğine dair bir iddia, üstelik sınanabilir bir iddia. Ve bence "Cloudflare bir chatbot çıkardı"dan çok daha ilginç.

Yazmadan önce repoyu klonlayıp bilgisayarımda çalıştırdım. Aşağıda ne olduğunu, nasıl kurulduğunu ve bulduklarımı anlatıyorum.

---

## Önce ne olmadığını netleştirelim

**İşletim sisteminizin yerine geçen bir şey değil.** Ne Ubuntu'nun, ne Debian'ın, ne RHEL'in, ne de Windows veya macOS'un. ISO yok, kernel yok, bootloader yok. Karşınızdaki şey bir web uygulaması ve katmanlar şöyle diziliyor:

```
İşletim sisteminiz (asıl kernel)
  └── Node.js
       └── workerd            ← Cloudflare'in Workers runtime'ı
            └── Cloudflare OS
                 └── Gadget'lar  ← V8 isolate'ı, işletim sistemi process'i değil
```

Buradaki "process" dedikleri şeyi `htop`'ta arasanız bulamazsınız. JVM'i düşünün: o da yürütmeyi yönetir, kaynağa erişimi kontrol eder, kendi güvenlik modeli vardır. Ama kimse JVM'i Linux yerine kurmaz.

**DevOps aracı değil.** Shell konektörü yok. Dosya sistemi yok. Docker yok, Kubernetes yok, SSH yok. On altı gatekeeper'ın hepsi SaaS API'si. Adı altyapı çağrıştıran `gatekeeper-cloudflare` bile şu an yalnızca iki iş yapıyor: OAuth ile giriş ve AI Gateway faturalandırması. Gerisinin sonra geleceğini kendi README'sinde yazmışlar.

**Bilgisayarınızı yönetmiyor.** Buradaki korku ters tarafa bakıyor. Bu yazılım sizin makinenizi yönetmiyor; makinenizde bir kutunun içinde çalışıyor ve o kutudan çıkamıyor. Gadget'ın sunucu tarafının dışarıya çıkışı kapalı. İstemci tarafı sandbox'lanmış bir iframe'in içinde. Dosya sistemine erişim diye bir şey hiç yok.

Merak edip agent'a doğrudan sordum: bilgisayarımdaki klasörleri görebiliyor musun? Göremiyormuş. Yalnızca çalışma alanına bağladığım kaynaklara ve kendi ürettiği dosyalara erişebiliyormuş. Bu kibarlıktan değil, mimarinin böyle kurulmuş olmasından.

**Coding agent'lara rakip değil.** Uygulama yazıyor, orası doğru. Ama bu iş için tasarlanmış bir coding agent hem daha iyi kod yazar hem de size sahip olduğunuz dosyaları teslim eder. Cloudflare de zaten "daha iyi kod yazıyoruz" demiyor; dedikleri şey *daha az token harcıyoruz*, çünkü agent'ları tek bir dar ortama göre ayarlanmış. Bu ürünü uygulama yazma demosuna bakarak değerlendirirseniz, en sıradan yanına bakmış olursunuz.

**Doküman paylaşım sistemi de değil**, ilk bakışta öyle görünse de. Explore sayfasını açtığınızda karşınıza çıkan her şey üç tanecik: Docs, Slides, Sheets.

> **[GÖRSEL 2]** `images/05-explore-blueprints.jpg`
> Altyazı: *Yerleşik "ofis paketi" dediğimiz şeyin tamamı — üç blueprint, sizin yazacağınızdan bir farkı yok.*

Bu üçü, `packages/workshop-backend/format-blueprints/` klasöründeki üç dosyadan ibaret. Yani ofis paketi ürüne gömülü bir özellik değil. Sizin yarın yazdıracağınız uygulamayla aynı zeminde, aynı sandbox'ta, aynı izinlerle çalışan üç blueprint.

Bütün argümanı tek hamlede kuran şey de bu: kendi doküman editörümüzü burada sıradan bir uygulama olarak yazabiliyorsak, bu platform iddia ettiğimiz şeydir.

---

## Kurulum

Yirmi dakikanızı alıyor. Şirketinizde kullanmayı hiç düşünmüyor olsanız bile denemeye değer.

### 1. Klonlayın, çalıştırın

```bash
git clone https://github.com/cloudflare/cloudflare-os
cd cloudflare-os
pnpm run-local
```

Kurulum bundan ibaret. Bağımlılıkları indiriyor, gerekeni derliyor ve `http://localhost:8787` adresinde açılıyor.

Bende ilk çalıştırma iki dakika kadar sürdü. Sonrakiler çok daha hızlı, çünkü kaynak dosyaların hash'ini saklayıp bir şey değişmediyse derleme adımını tamamen atlıyor.

Açılış log'unu izlemenizi öneririm. Orada **on sekiz ayrı Worker** ayağa kalkıyor: bir router, bir backend ve on altı gatekeeper. Her birinin kendi yapılandırması üretiliyor. Bunu aklınızda tutun, birazdan döneceğim.

Verileriniz `.wrangler/` klasörüne yazılıyor. Sıfırlamak isterseniz o klasörü silmeniz yeterli. Tamamen kaldırmak için repoyu silin; sisteminizde başka hiçbir yere dokunmuyor.

### 2. `admin` adıyla kaydolun

Hazır bir hesap gelmiyor. "Create one" deyip kendiniz kaydoluyorsunuz.

**Kullanıcı adını mutlaka `admin` yapın.** Yerel modda dev sunucusu `["admin"]` diye bir yetki listesi tanımlıyor. Tam olarak bu isimle kaydolan kişi admin paneline girebiliyor. Başka bir isim seçerseniz karşınıza şu çıkıyor:

> **[GÖRSEL 7]** `images/07-admin-denied.jpg`
> Altyazı: *Başka bir isimle kaydolduğunuzda gördüğünüz ekran. Dokümanlarda bundan hiç söz edilmiyor.*

### 3. Bir model tanımlayın

Bunu yapmadan hiçbir şey çalışmıyor, çünkü ürünle birlikte gelen bir model yok.

Kolay yol için Cloudflare hesabına bile ihtiyacınız yok. AI Gateway modunu kullanmadığınız sürece bütün sağlayıcılar BYOK mantığıyla çalışıyor: kendi anahtarınızı model ayarlarına yapıştırıyorsunuz, fatura doğrudan sağlayıcıya gidiyor.

Anthropic, OpenAI, Google, Workers AI ve Ollama destekleniyor. Yerel model kullanacaksanız sağlayıcıyı `ollama`, adresi `http://localhost:11434` yapın; sonuna `/v1`'i kendisi ekliyor, anahtar vermezseniz auth header'ı hiç göndermiyor. Yalnız Ollama için önerilen model listesi bomboş, yani orada denenmiş bir şey yok. Karşınızdaki bir coding agent; beklentinizi ona göre ayarlayın.

Bir de ucuz modelle başlayın derim. Bu agent ciddi token yakıyor.

### 4. Kullanın

Bir çalışma alanı açıp yazmaya başlıyorsunuz. Harcamanız da başlıkta anlık olarak görünüyor.

> **[GÖRSEL 6]** `images/02-workspace-chat.jpg`
> Altyazı: *Bir çalışma alanı. Sol üstte anlık maliyet, ortada sohbet, sağda App / Code / Connections sekmeleri.*

Ben ilk olarak ne yapabildiğini sordum. Küçük uygulamalar üretip düzenleyebildiğini, kod yazabildiğini, izin verirsem GitHub, Google, Notion gibi servislere bağlanabileceğini söyledi. Sonra da çalışma alanında henüz bir uygulama olmadığını ekledi.

Son cümle önemli, çünkü oturum gerçekten bomboş başlıyor. Bir şey istediğinizde sağ panelde kendi kodu ve kendi bağlantıları olan bir Gadget beliriyor.

README birkaç başlangıç promptu öneriyor:

- *"Make a collaborative whiteboard app."* — sıfırdan bir uygulama üretiyor
- *"Make a tic tac toe game."* ve ardından *"Ben X olayım sen O. İlk hamlemi yaptım, sıra sende."* — agent az önce yazdığı oyunun içine girip oynuyor
- *"Make slides for my meeting with a customer."* — slides blueprint'ini kullanıyor

Asıl gösteri ikincisi. Her Gadget'ta istemci ve sunucu Cap'n Web RPC üzerinden konuşmak zorunda; bu zorunluluk sunucuyu ister istemez çağrılması kolay bir API'ye dönüştürüyor. Sonuç olarak agent, az önce yazdığı uygulamayı kullanabiliyor — ne MCP sunucusu yazmanız gerekiyor ne de ek bir bağlantı kurmanız. Bir kısıtı alıp özelliğe çevirmişler.

---

## Aklınıza gelen "AI işletim sistemi" bu değil

2023'ten beri ortalıkta dolaşan bir fikir var; kimi LLM OS diyor, kimi agentic OS. Özü şu: model bilgisayarın ana arayüzü haline geliyor ve her şeyi o çeviriyor. En bilinen anlatımı Karpathy'nin bir konuşmasından: LLM'i CPU, context window'u RAM, araçları da çevre birimleri gibi düşünün. Akademik tarafta da çalışmalar oldu, donanım tarafında birkaç deneme çıkıp kayboldu.

Düşünmeyi kolaylaştıran bir benzetmeydi. Ama sahaya inince geriye pek bir şey kalmadı.

Cloudflare OS bu değil, ve fark tam da meselenin kendisi.

O tabloda **model çekirdeğin yerine geçiyor.** Ortada o duruyor, geri kalan her şey etrafına diziliyor.

Burada ise model, sökülüp takılabilen bir parça. Kendi anahtarınızı getiriyorsunuz, dilediğiniz sağlayıcıyı seçiyorsunuz, isterseniz yerel bir adrese yönlendiriyorsunuz. Çekirdek ise oturup okuyabileceğiniz sıradan bir kod.

Yani agent burada yöneten taraf değil. Yönetilen taraf.

Aynı kelime, zıt kurgu.

---

## Peki neden OS demişler?

Cloudflare bu kelimeyle iki şey kastediyor. Birincisi, bir şirketin AI'ı güvenle kullanabilmesi için bir işletim sistemi. İkincisi, normal bir OS'un compute iş yüklerini yönetmesi gibi, AI iş yüklerini yöneten bir işletim sistemi.

Sonra da eşlemeyi tek tek veriyorlar:

| Normal OS | Cloudflare OS |
|---|---|
| kernel | `packages/workshop-backend` |
| device driver'lar | `packages/gatekeeper-*` |
| shell | `packages/workshop-frontend` |
| process'ler | gadget'lar |
| çalıştırılabilir dosyalar | blueprint'ler |
| kullanıcılar | kullanıcılar |
| ACL'ler | paylaşım izinleri |
| **???** | **agent'lar** |

Teknik olarak konuşursak burada bir uygulama var. Donanım yönetmiyor. CPU seviyesinde ayrıcalık ayrımı yok. Çekirdeklerde thread zamanlamıyor. Gerçek bir işletim sisteminin üstünde, sıradan bir userspace process olarak koşuyor. Linux, macOS ve Windows'la aynı cümlede anılamaz.

Ama bir şeyi işletim sistemi yapan şey de boot etmesi değil. Bir kaynağı paylaştırıyorsa, o kaynağı kullanan programları birbirinden yalıtıyorsa ve erişimlerini denetliyorsa, işletim sisteminin işini yapıyor demektir. Bu üçünü de yapıyor. Paylaştırdığı kaynak yalnızca donanım değil; şirketinizin sistemleri.

Kod tarafı da bu benzetmeyi boşa çıkarmıyor. Az önceki on sekiz Worker'ı hatırlayın: gatekeeper'lar bir monolitin içindeki modüller değil, gerçekten ayrı process'ler. Birinin ele geçirilmesi diğerlerine ulaşmıyor. Ortak bağlam kütüphanesi bile kendi başına ayrı bir bundle olarak derleniyor.

---

## Tablodaki boş hücre

Tabloya bir daha bakın. Son satır hariç her şey yerli yerinde oturuyor. Orada, normal OS sütununda `???` var.

O boşluk aslında bütün projenin sebebi: **agent'lar, işletim sistemlerinin henüz sahip olmadığı bir primitive.**

Muhakemeleri şöyle işliyor. Bir kullanıcı kendi yaptıklarının hesabını verir. Agent ise bir insana hesap vermek zorunda, hem de o insandan daha dar yetkilerle dolaşarak. Üstelik işini kod yazıp anında çalıştırarak görüyor. Dolayısıyla izin kararı, kimsenin gözden geçirmediği bir kod üzerinde, her çağrıda, çalışma anında verilmek durumunda.

Erişim kontrol listeleri bambaşka bir dünya için tasarlanmıştı: bir özneye bir kaynağa erişim verirsiniz, arkanızı dönüp gidersiniz. Bu model şunu söyleyemez — *bu agent, bu kişi adına, bu iş için, tam olarak şunu yapabilir.*

Capability söyleyebilir. Object-capability güvenliği onlarca yıllık bir fikir ve bugüne kadar kendine gerçek bir uygulama alanı bulamadı. Cloudflare'in bahsi de tam burada: o alan agent'lar.

Ardından temkinli cümle geliyor ve projedeki en cesur şey de o: belki geleneksel işletim sistemleri de agent'lara ayrı bir muamele yapmalı.

Katılmayabilirsiniz. Ama şuna dikkat edin — bu bir satış konuşması değil, sistem tasarımı üzerine bir argüman. Ve basın bülteninde değil, bir README'nin içinde duruyor.

---

## Peki ekranda nasıl görünüyor?

"Add resource" düğmesine bastığınız anda soyut olan şey somutlaşıyor.

> **[GÖRSEL 3]** `images/03-add-resource-granularity.jpg`
> Altyazı: *Kaynaklar hesap değil. GitHub burada Repository, Issue ve Pull Request diye ayrışıyor.*

GitHub'ın burada ne olduğuna dikkat edin. "GitHub hesabınız" diye bir şey yok. **Repository, Issue, Pull Request** — teker teker eklediğiniz ayrı kaynak tipleri. Google da öyle: Gmail Mailbox, Doc, Spreadsheet, Calendar, BigQuery. Confluence Site, Space, Page'e bölünüyor.

Meselenin felsefe olmaktan çıkıp somutlaştığı yer burası. Alıştığımız kurulumlarda araç sunucularını en baştan tanımlarsınız ve o andan itibaren her sohbette hepsi hazır bekler. Burada agent hiçbir şeye erişemeden başlıyor, kaynaklara tek tek tanıştırılıyor. Kendisi de "şuna erişmem lazım" diyebiliyor; siz izin veriyor ya da vermiyorsunuz.

Daha güvenli, ama daha çok sürtünme demek. Kullanıcılarınız bunu hissedecek. Ekiplere yaymayı düşünüyorsanız bu kararı bilerek verin; pilotta keşfedilecek bir detay değil.

> **[GÖRSEL 4]** `images/06-gatekeepers.jpg`
> Altyazı: *Gatekeeper'lar — servis başına bir konektör. Bir kez bağlıyorsunuz, sonra yaptığınız her şeye takabiliyorsunuz.*

---

## Çalınmaya değer iki fikir

**Kimlik bilgisi yerine capability.** OAuth kimlik bilgisini gatekeeper tutuyor ve dışarıya dar, tipli bir yüzey açıyor. Agent'ın kodunda görünen şey şu:

```js
const issues = await env.SUPPORT.listIssues({ state: "open" });
```

Bu satırda token yok. Agent'ın uzanabileceği hiçbir yerde de yok. Prompt injection ile onu kaynak kodu okumaya ikna edin; ihtiyaç duyduğu metot o binding'de zaten tanımlı değil. Saldırı modelin muhakemesine hiç gelmeden tip sisteminde ölüyor. Bu da önemli, çünkü modelin muhakemesi bu yığında asla güvenemeyeceğimiz tek parça.

**Simülasyonla onay.** Bu detayı daha önce hiçbir yerde görmemiştim. Alışıldık human-in-the-loop kurgusunda agent, onay isteyen her işlemde duruyor. İnsanların bir hafta içinde auto-approve'a geçmesinin sebebi de bu.

Burada gatekeeper işlemi simüle ediyor: agent'a "oldu" diyor, agent sonucu geri okumaya kalkarsa uydurma bir sonuç veriyor. Agent duraklamadan devam edip kırk işlemi kuyruğa yığıyor. Siz de sonra, size uygun bir vakitte hepsini toplu inceliyorsunuz.

Küçücük bir fikir. Ama bir onay akışının ilk haftayı atlatıp atlatamayacağına o karar veriyor.

---

## MCP konektöründe gördüğüm açık

MCP sunucusu bağlamak kolay. Endpoint'i yapıştırıyorsunuz, sunucunun tool'ları otomatik keşfedilip tipli metotlara dönüşüyor. Yetkiyi ister sunucunun tamamına verirsiniz, ister yalnızca seçtiğiniz tool'lara; listede olmayan her şey reddediliyor, sunucunun sonradan eklediği tool'lar dahil. Salt-okunur tool'lar anında dönüyor, geri kalanı onaya düşüyor.

Gel gelelim, *bir tool'un salt-okunur sayılıp sayılmayacağına MCP sunucusunun kendi annotation'ı karar veriyor.*

Yani bu katmanda güvence, kısıtlamaya çalıştığınız tarafın kendi beyanına dayanıyor. Yıkıcı bir tool'u "salt-okunur" diye etiketleyen bir sunucu, onay kuyruğunu es geçiyor.

Cloudflare bunu gizlemiyor. Bağlantı formunda, bir sunucuyu bağlamanın ona güvenmeye karar vermek olduğu yazıyor — tam da annotation'ları neyin sorulmadan çalışacağını belirlediği için. Ama bir önceki ekranda düpedüz "yazma işlemleri onay gerektirir" yazıyor. İki cümle yan yana pek rahat durmuyor.

> **[GÖRSEL 5]** `images/04-add-resource-mcp.jpg`
> Altyazı: *"Tool'lar otomatik keşfedilir, yazma işlemleri onay gerektirir." Neyin yazma sayıldığına sunucu karar veriyor.*

Bunu şirketinizde devreye alacaksanız buradan çıkan sonuç net: **personelin önüne gelen MCP endpoint'ini yapıştırmasına izin vermeyin.** `gatekeeper-mcp-portal` zaten bunun için var; yönetici tek bir URL tanımlıyor, kullanıcının girdiği bir şey olmuyor. Yaygınlaştırmada portalı kullanın.

Kasten yanlış etiketlenmiş bir tool'un kuyruğu gerçekten es geçip geçmediğini denemedim, düşününce denemenin bir anlamı da yok. Sonuç hiçbir şeyi değiştirmiyor: geçiyorsa endpoint'lerin önüne bir yönetici koyuyorsunuz, bir şekilde yakalanıyorsa yine koyuyorsunuz — çünkü dokümante edilmemiş bir davranışın üstüne politika kurulmaz.

Zaten daha işe yarar sinyal, Cloudflare'in "bir sunucuyu bağlamak ona güvenmektir" diye açıkça yazmış olması.

---

## Peki bu iş tutar mı?

**En güçlü karşı argüman şu: bu fikir bir kez zaten battı.**

Ürünü yapan Kenton Varda, bunun on yıl önceki kendi startup'ı **Sandstorm.io**'nun yeniden yapımı olduğunu [saklamıyor](https://x.com/KentonVarda/status/2084990137180590572). Gadget dedikleri şey, Sandstorm'daki Grain ile aynı fikir: her doküman, kendisini düzenleyen uygulamanın izole bir kopyasını alıyor. Cloudflare'in CTO'su da buna Sandstorm'un ruhani devamı dedi.

Sandstorm tutmadı. Varda'nın [Hacker News tartışmasında](https://news.ycombinator.com/item?id=49182996) tekrar tekrar anlattığı gerekçe şu: model, kendi kullandığı yazılımı değiştirmeye hem istekli hem muktedir kullanıcılara ihtiyaç duyuyordu ve öyle kullanıcı neredeyse yoktu. Mimari hazırdı, kullanıcılar değildi.

Şimdi diyor ki AI bu engeli kaldırdı. Bence de doğru argüman. Ama sonuçta bu, insanların nasıl davranacağına dair bir tahmin. Üstelik tahmini yapan kişi, doğru çıkmasını herkesten çok isteyen kişi. Ve on yıllık deneyim aksini söylüyor.

**Açık kaynak olması taşınabilir olduğu anlamına gelmiyor.** Apache-2.0 lisansı kulağa "lock-in'den kurtulduk" gibi geliyor. Ama bağımlılık listesine bakın: Dynamic Workers, Durable Object Facet'leri, Cap'n Web. Kendi sunucunuzda `workerd` ile çalıştırmak README'de **COMING SOON** olarak işaretli. Düşük seviyeli yapılandırma dokümanını okuyup denemenizi öneriyorlar ki bu desteklenen bir yol sayılmaz. Bugün elinizde iki seçenek var: Cloudflare hesabı ya da yerel geliştirme. On-prem zorunluluğunuz veya veri yerelliği kısıtınız varsa bu ürünü henüz kuramazsınız.

**Fork'larsanız geri dönüşü yok.** `CONTRIBUTING.md`'de dış katkı almadıklarını söylüyorlar; bir düzine satırı geçen PR'lar kapatılıyor. Gerekçeleri kendi içinde tutarlı: AI kod yazmayı kolaylaştırdı, asıl zor olan inceleme ve tutarlılık, dış katkı da işin kolay yarısını bağışlamak oluyor. Ama sizin açınızdan sonuç şu: bunu "şirketimizin OS'u" haline getirmek için yaptığınız her değişiklik, gönderecek yeriniz olmadan, sonsuza kadar sizin sırtınızda kalıyor.

**Bu kategoriyi dağıtım belirliyor, Cloudflare'in ise dağıtımı yok.** Microsoft, Copilot'u zaten her masada duran bir koltuğa gönderiyor. Google, Gemini'yi Workspace'in içine koyuyor. Analist Carmi Levy [CIO'ya](https://www.cio.com/article/4206332/cloudflare-wants-to-provide-the-operating-system-for-the-ai-first-enterprise.html) Cloudflare'inkinin Microsoft'un dağınık parçalarına kıyasla daha derli toplu paketlendiğini söylüyor; haklı da. Ama derli toplu mimari, paketlenmiş dağıtıma bugüne kadar defalarca kaybetti.

**Bir de kimsenin konuşmadığı bir ön koşul var.** Bütün bu değer önerisi, şirketinizin nasıl çalıştığını yazıya dökmüş olmasını varsayıyor. Dökmediyseniz elinize hiçbir işe yaramayan bir agent ve yarım kalmış Gadget yığını geçer. Bunu hiçbir mimari çözmüyor; kurumsal olgunluk meselesi.

### Bütün bunlara rağmen ayakta kalan

Ciddi her AI kurulumu eninde sonunda aynı soruya çarpıyor: *bu şeyin dokunmasına izin verdiğimiz şey ne, ve başka bir yere dokunsa bunu nereden anlardık?* Bugün bu sorunun cevabı genelde bir entegrasyon kapsamı, bir politika dokümanı ve kimsenin okumadığı bir log oluyor.

Cloudflare OS, bu soruyu altyapı katmanında cevaplamayı deneyen gördüğüm ilk yaygın girişim. Agent yetkisini aşamıyor, çünkü aşacağı metot ortada yok. Bir çıktıyı paylaşmak da başlı başına bir erişim kararı haline geliyor.

O yüzden hükmü ikiye ayırıyorum:

**Ürün olarak** şansı orta. Gerçek bir teknik avantajı, gerçek bir güvenlik hikâyesi ve sahici bir açık kaynak kredibilitesi var. Karşısında ise dağıtımsızlık, bir kez zaten batmış bir kuruluş bahsi ve desteklenen bir self-host yolunun bulunmaması duruyor.

**Yaklaşım olarak** neredeyse kaçınılmaz. Herkesin kullandığı platform bu olmasa bile, onun güvenlik modelini taşıyan bir şey olacak. Alternatifi, prompt injection'a politika dokümanıyla karşı koymaya çalışmak.

---

## Kapanış

İsim, Cloudflare'in kendisinin çoktan kabul ettiği bir tartışmayı başlatıyor. O tartışmayı bir kenara bırakınca altından daha iyi bir şey çıkıyor.

Çıkan şey bir öneri: agent'lar işletim sisteminin dünya tasavvurunda process'in ve kullanıcının yanına ait. Ve çalışma anında kendi kendini yazan koda göre tasarlanmış bir izin sistemiyle yönetilmeli.

Bunu oturtan şirketin Cloudflare olup olmayacağı ayrı bir mesele; haklı olup olmadıkları ayrı.

Bence haklılar.

Bunu şirketinizde gerçek bir sisteme bağladıysanız nasıl gittiğini duymak isterim. Neyin çalıştığını anlatan yazı bol; neyin bozulduğunu anlatan yok.

---

*Kaynaklar: [Cloudflare blog](https://blog.cloudflare.com/cloudflare-os/) · [basın bülteni](https://www.cloudflare.com/press/press-releases/2026/cloudflare-os-is-the-first-ai-workspace-built-around-how-companies-actually-work/) · [GitHub](https://github.com/cloudflare/cloudflare-os) · [Hacker News](https://news.ycombinator.com/item?id=49182996) · [CIO](https://www.cio.com/article/4206332/cloudflare-wants-to-provide-the-operating-system-for-the-ai-first-enterprise.html). Ekran görüntüleri bana ait, 8 Ağustos 2026 tarihli `main` sürümünden. Kapak görseli repoda Apache-2.0 lisansıyla geliyor.*

*Bu yazının İngilizce versiyonu [burada](https://medium.com/p/644fee8ba807).*
