# WASM Nedir? Gürültüsüz Büyüyen Teknoloji

### Docker'ı yazan adam, "WebAssembly olsaydı Docker'a hiç gerek kalmazdı" demişti. Aradan yedi yıl geçti, ölçtüm — ve haklı çıktığı cümle, herkesin alıntıladığı cümle değil.

2019'un mart ayında Solomon Hykes şunu yazdı:

> "WASM+WASI 2008'de olsaydı, Docker'ı yazmamıza gerek kalmazdı. Önemi bu kadar büyük."

Hykes, Docker'ın yaratıcısı. Cümlenin bu kadar dolaşmasının sebebi de bu zaten. Hâlâ tek bir fikrin kısaltması olarak alıntılanıyor: container'ların günü doluyor.

Gel gelelim, bu okumaya cevabı kendisi vermiş. Hem de aynı gün.

> "Peki wasm Docker'ın yerini alacak mı?" Hayır. Ama Docker'ın linux container'ları, windows container'ları ve wasm container'larını yan yana çalıştırdığı bir geleceği düşünün. Zamanla wasm en yaygın container tipi olabilir.

Aynı kişi, birkaç saat arayla, iki cümle. Ünlü olan birincisi. Tutan ise ikincisi.

Yedi yıl sonra ikisini de kontrol edebilirsiniz. Ben toolchain'i kurdum, küçük bir program yazdım, ölçümleri aldım, bir de .NET tarafını denedim. Bulduklarım şöyle.

## Peki WASM tam olarak nedir?

WebAssembly bir derleme hedefi. Dil değil.

Rust, C, C++, Go ya da C# yazarsınız, ona **derlersiniz** — x86'ya veya ARM'a derlediğiniz gibi. Çıkan şey bir `.wasm` modülü: standarda uyan her runtime'ın, her işlemcide, her işletim sisteminde çalıştırabildiği küçük bir binary.

W3C standardı. Güncel spec sürümü 3.0, 17 Eylül 2025'te yayımlandı.

Tarayıcıda başladı; amaç JavaScript'ten hızlı kod koşturmaktı. O kısmı eski haber. Asıl ilginç olan, tarayıcıdan çıkmış olması.

Bir modülün hiçbir şeye kendiliğinden erişimi yoktur. Dosya sistemi yok, ağ yok, saat yok, environment variable yok. Hesap yapar, o kadar. Geri kalan her şeyin ona elle verilmesi gerekir.

Sunucu tarafında karşımıza çıkmasının sebebi de bu özellik.

## Eksik halka: WASI

Hykes'in cümlesine bir daha bakın ve kimsenin alıntılamadığı kısmı görün: *"Standart bir sistem arayüzü eksik halkaydı."*

Sadece hesap yapabilen bir modül hem güvenlidir hem işe yaramaz. Gerçek iş yapması için dosya açması, bağlantı kabul etmesi, saati okuması lazım. Bunun için bir arayüz gerekiyor — ve o arayüzün standart olması şart. Yoksa her runtime kendi arayüzünü uydurur, taşınabilirlik daha doğmadan ölür.

O arayüzün adı WASI: WebAssembly System Interface.

**WASI 0.3, 11 Haziran 2026'da çıktı.** Yani bu yazıyı yazmamdan iki ay önce. Native async'i getiren sürüm bu: `async func`, `stream<T>` ve `future<T>` artık Canonical ABI'ın birer primitifi, eski `wasi:io` paketi de kaldırıldı.

Mekanik olarak değişen şey şu: scheduling component'ten çıkıp runtime'a taşındı. Readiness polling yerine, Linux'taki `io_uring`'e yakın bir completion mantığı kullanılıyor. Duyuru, yerine geçtiği şeyi "WASI 0.2'nin üç adımlı `start-foo` / `finish-foo` / `subscribe` dansı" diye tarif ediyor.

Sunucu tarafındaki Wasm'ın tamamlanmasını bekliyorduysanız, eksik parça buydu. Bu cümleyi aklınızda tutun, dil desteği bölümünde geri döneceğim.

## Sandbox'ı iki komutta görmek

"Kendiliğinden erişim yok" ne demek, pratikte bakalım. Aşağıdaki bir programın tamamı:

```rust
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = env::args().nth(1).ok_or("usage: lineclient <file>")?;
    let text = fs::read_to_string(&path)?;
    println!("{}: {} lines", path, text.lines().count());
    Ok(())
}
```

Bir dosya adı alıyor, satırlarını sayıyor. WASI için derlenince 130 KB tutuyor.

Çalıştıralım:

```
$ wasmtime run lineclient.wasm /etc/hostname
Error: Os { code: 44, kind: NotFound, message: "No such file or directory" }
```

Dosya duruyor. Program göremiyor. Şimdi tek bir dizini elimizle verelim:

```
$ wasmtime run --dir=/etc lineclient.wasm /etc/hostname
/etc/hostname: 1 lines
```

Aynı binary, aynı argüman. Değişen tek şey, `/etc`'yi vermiş olmanız.

Şimdi hata metnine bir daha bakın, çünkü beklemediğim kısım burası. Önce izin verilmeyen bir dosya isteyelim, sonra hiç var olmayan bir dosya:

```
$ wasmtime run --dir=/etc lineclient.wasm /usr/lib/os-release
Error: Os { code: 44, kind: NotFound, message: "No such file or directory" }

$ wasmtime run --dir=/etc lineclient.wasm /etc/definitely-not-here
Error: Os { code: 44, kind: NotFound, message: "No such file or directory" }
```

Harfi harfine aynı hata. Oysa `/usr/lib/os-release` gayet yerinde duruyor, on üç satır. Modüle "yok" deniyor.

Sandbox hiçbir zaman "izin yok" demiyor. "Bulunamadı" diyor. Kendisine verilenin dışında modül, yasak olanla var olmayanı ayırt edemiyor — dolayısıyla dışarıda ne var diye yoklayamıyor da.

Bir de karşı tarafın varsayılanına bakın:

```
$ docker run --rm alpine:3.21 sh -c 'ls /etc | wc -l; ls /'
36
bin dev etc home lib media mnt opt proc root ...
```

Tam bir root dosya sistemi, `/etc` altında otuz altı dosya, `/proc` bağlanmış — siz daha tek satır kod yazmadan.

İki modeli de güvenli hale getirebilirsiniz. Read-only root'u olan, capability'leri düşürülmüş, seccomp profili yazılmış bir container benzer bir yere varır. Fark, işin hangi yöne aktığında. Container'da her şeyle başlayıp erişimi **kısarsınız**. WASI'de hiçbir şeyle başlayıp **verirsiniz**.

Kimsenin dikkat etmediği günlerde ne olacağını da varsayılanlar belirler.

## Ne kadar hızlı? Ölçtüm

Tek makine, tek konfigürasyon. Yani aşağıdakini laboratuvar sonucu değil, büyüklük mertebesi olarak okuyun. Linux 6.17, Docker 29.7.2, wasmtime 47.0.3, .NET 10.0.110. Yirmi koşunun medyanı, sıcak başlangıç: image çekilmiş, modül önceden derlenmiş.

| | medyan | boyut |
|---|---|---|
| `wasmtime` — minimal WASI modülü | **15 ms** | 20 KB |
| `docker start` — container zaten oluşturulmuş | 210 ms | — |
| `docker run` — `alpine:3.21 echo hello` | 281 ms | 3.5 MB |
| `docker run` — .NET 10 console app | 284 ms | 40 MB |

Kabaca on dokuz kat hızlı başlıyor, boyutu da çok küçük. Herkesin alıntıladığı rakam bu — ve tek başına tablodaki en az ilginç satır.

Son iki satıra bakın onun yerine. Bir .NET uygulaması 284 ms'de kalkıyor. Alpine üzerinde `echo hello` 281 ms'de kalkıyor. Aradaki fark üç milisaniye.

Yani maliyet .NET runtime'ı değil. Image boyutu da değil. Üstelik hazır duran bir container'ı `docker start` ile başlatmak bile 210 ms sürüyor; demek ki oluşturma kısmı toplamın ancak dörtte biri. Ödediğiniz şey container modelinin kendisi: namespace'ler, cgroup'lar, ağ kurulumu, daemon'a gidiş dönüş.

Wasm uygulamanızı hızlandırmıyor. Bu sabit bedeli ortadan kaldırıyor. İş yükünüz bir kere başlayıp bir hafta koşuyorsa bedelin lafı bile olmaz. Saatte on bin kere başlıyorsa faturanın tamamı odur.

İşin bir de öteki yüzü var, bu tarz yazılar orayı genelde atlar: Wasm ham hesapta native'den yavaştır. En çok atıf alan ölçüm — [Jangda ve arkadaşları, USENIX ATC 2019](https://www.usenix.org/conference/atc19/presentation/jangda) — tarayıcıdaki Wasm'ı SPEC CPU üzerinde native'den yüzde 45 ila 55 yavaş bulmuş. O günden beri sunucu runtime'ları ilerledi, üstelik ben throughput ölçmedim; kesin rakamı açık bırakın. Ama yön açık: startup süresini ve yoğunluğu, azami hızdan vazgeçerek satın alıyorsunuz.

## Kubernetes'te zaten çalışıyor

Burası gelecek zamanlı bir bölüm değil.

`runwasi`, Wasm runtime'larını — Wasmtime, WasmEdge, Wasmer — containerd shim'i olarak sunuyor. Scheduling `RuntimeClass` üzerinden yapılıyor; yani gVisor ve Kata iş yüklerini zaten yerleştiren mekanizmanın aynısıyla. SpinKube ise operator'ü, containerd shim'ini ve runtime class yöneticisini tek pakette topluyor; katkı verenler arasında Microsoft, SUSE, Liquid Reply ve Fermyon var.

Kısacası Wasm iş yüklerini bugün mevcut cluster'ınıza, container'larınızın yanına, aynı node'lara koyabilirsiniz.

Ne var ki şuna dikkat edin: `RuntimeClass` **alternatif** bir runtime mekanizmasıdır, varsayılanı değiştirme mekanizması değil. gVisor yıllardır aynı yolla kullanılabiliyor ve hiçbir cluster varsayılan olarak ona geçmiş değil. İşin dürüst okuması bu — ki Hykes'in ikinci cümlesinde tarif ettiği şey de tam olarak buydu.

## Hangi dilde çalışıyor? Cevap sandığınızdan dar

Heyecanın toolchain'e çarptığı yer burası. "Doğruladım" yazan her satırı 15 Ağustos 2026'da kendi makinemde koşturdum.

| Dil | Hedef | Durum |
|---|---|---|
| Rust 1.97.1 | `wasm32-wasip2` | Hazır. WASI 0.3 async'i `wit-bindgen` ile çalışıyor. **Doğruladım: derledim, koştu.** |
| Go 1.26.2 | sadece `wasip1/wasm` | Bir kuşak geride. `wasip2` yok, dolayısıyla Component Model de yok. **Doğruladım.** |
| TinyGo | wasip1 / wasip2 | Çalışıyor, modüller küçük, Envoy ve Proxy-Wasm tarafında yaygın. Ama TinyGo kısıtlı bir fork; Go değil. |
| C / C++ | wasi-sdk | Çalışıyor. İlk hedef zaten buydu. Ergonomisi kaba. |
| C# / .NET 10.0.110 | `wasi-experimental` | **Kırık olduğunu doğruladım.** Aşağıda. |
| Python / JVM | — | Wasm'a derlenmiyorlar. Bunun yerine interpreter modülün içine derleniyor. Ağır. |

Go'dan başlayalım, çünkü markadan bağımsız olarak meseleyi en net o gösteriyor. Go 1.26.2 güncel sürüm. Neyi hedefleyebildiğini soralım:

```
$ go tool dist list | grep wasi
wasip1/wasm
```

Tek satır. `wasip1`. Birinci sınıf bir backend dili, güncel sürümünde, haziranda çıkan şeyin bir arayüz kuşağı gerisinde.

Sıra .NET'te. Ben burada "deneysel ama kullanılabilir" gibi bir cevap bekliyordum, öyle olmadı:

```
$ sudo dotnet workload install wasi-experimental
Installing pack Microsoft.NET.Runtime.WebAssembly.Wasi.Sdk version 10.0.10...
...
Garbage collecting for SDK feature band(s) 10.0.100...
Uninstalling workload pack Microsoft.NET.Runtime.WebAssembly.Wasi.Sdk.net10 version 10.0.10...
Uninstalling workload pack Microsoft.NETCore.App.Runtime.Mono.net10.wasi-wasm version 10.0.10...
...
Successfully installed workload(s) wasi-experimental.
```

Exit code 0. Başarılı olduğunu söylüyor. İşin tuhafı, o başarı satırını basmadan hemen önce, aynı koşunun içinde, az önce kurduğu .NET 10 paketlerini garbage collection ile kaldırıyor. Geriye kalan da hiçbir şey:

```
$ dotnet workload list                    → kurulu workload yok
$ ls /usr/lib/dotnet/packs | grep -i wasi → boş
$ dotnet new list wasi                    → No templates found matching: 'wasi'.
```

Hiçbir şey kurmayan, üstelik bunu size söylemeyen bir "başarılı kurulum". Sebebini tahmin etmeye kalkmayacağım. [.NET 10 önizlemelerinde bu yolla ilgili açılan sorunlar](https://github.com/dotnet/runtime/issues/117848) bir süredir sıkıntılı olduğuna işaret ediyor, ama aynı bug olduğunu söyleyemem.

Bir de kendi örneğime dikkat edin. Sandbox bölümündeki program Rust ile yazılmış ve bu bir tercih değil. WASI 0.3'ün async'i şu an Rust'ta çalışıyor, başka yerde çalışmıyor. Başka bir dil seçseydim, örnek bu yazının anlattığı şeyi gösteremezdi.

Yani örneğin dili ile yazının vardığı sonuç, aynı olgunun iki yüzü.

## Docker'ın yerini alır mı? Hayır — ve sebebi olgunlaşmamışlık değil

Wasm'ın container yerine geçmesine karşı en güçlü argümanın, teknolojinin yeniliğiyle hiçbir ilgisi yok.

Container bir userland paketler. İçinde ne varsa çalıştırır — kaynağı elinizde olmayan, yeniden derleyemeyeceğiniz binary'ler dahil. Wasm ise sadece Wasm'a derlenmiş olanı koşturur. WASI ne kadar olgunlaşırsa olgunlaşsın bu değişmez, çünkü bu bir eksik değil; tasarımın kendisi. Bugün modelin dışında kalanlar: mevcut binary'ler, tam POSIX, veritabanları, GPU işleri, shared memory üzerinden ağır threading.

Üç madde daha, kısaca.

**Takas startup ile throughput arasında.** Wasm, süreçlerin kısa ömürlü ve çok sayıda olduğu yerde kazanır; uzun süre koşan tek bir sürecin azami hızı istediği yerde kaybeder. Bu tek cümle, adaptasyon tartışmalarının çoğunu daha başlamadan bitirir.

**Asıl fren dil desteği, runtime performansı değil.** Yukarıdaki tablo hikâyenin tamamı. "Teknoloji hazır" ile "sizin diliniz hazır" farklı iddialar ve bunlardan yalnızca biri Wasm hakkında.

**Dağıtım, mimariyi yener.** OCI'ın arkasında on yıllık registry'ler, tarayıcılar, imzalama, CI entegrasyonları ve onu debug etmeyi bilen insanlar var. Wasm'ın elinde daha temiz bir model ve bunun küçük bir kısmı var. Temiz model kendiliğinden kazanmıyor; ataleti aşındırması gerekiyor. Aşağı yukarı aynı şeyi [Cloudflare'in agent workspace'i](/tr/2026-08-cloudflare-os/) için de yazmıştım — desenin kendisi ayrıca izlenmeye değer.

Peki ayakta kalan argüman ne? Multi-tenancy. Güvenmediğiniz üçüncü parti kodu çalıştırıyorsanız — eklentiler, müşteri fonksiyonları, edge handler'ları — container size doğru yapılandırmanız gereken ağır bir izolasyon sınırı verir; Wasm ise varsayılanı kapalı olan hafif bir sınır. Cloudflare Workers, Fastly, Envoy filtreleri, Shopify Functions: hepsi bu şekilde. Hiçbiri Docker'ın yerine geçmiyor. Hepsi üretimde.

## Hüküm ikiye ayrılıyor

**Container yerine geçen olarak: hayır.** Bu yıl değil, mevcut gidişatta da değil. Tasarım sınırı kalıcı, Rust dışındaki dil desteği bir kuşak geride, OCI'ın ekosistem üstünlüğü de devasa. Size migration planlamanızı söyleyen birinin satacak bir şeyi vardır.

**Belirli bir iş yükü sınıfının runtime'ı olarak: çoktan burada.** Kısa ömürlü, hızlı dönen, multi-tenant, güvenilmeyen kod. Her gün kullandığınız şirketlerde üretimde koşuyor, Kubernetes'e gVisor ile aynı mekanizmadan giriyor ve haziran itibarıyla standart arayüzünde nihayet async var.

Başlıktaki "gürültüsüz büyüme" işte bu ikinci cümle. Wasm hiçbir şeyin yerine geçmedi. Bir dilim aldı, elinde tuttu ve Docker tartışması başka yerde sürerken o dilimi genişletiyor.

Fikrimi ne değiştirir: dil desteğinin Rust'ı aşması. C#, Go ve Python birinci sınıf `wasip2` toolchain'lerine ve çalışan async'e kavuşursa hesap değişir, çünkü o zaman tasarım sınırı çoğu ekibin gerçekten sahip olduğu iş yükleri için önemsizleşir. Benchmark'ları değil, toolchain'leri izleyin.

Ki bu da bizi başladığımız yere getiriyor. Hykes, standart bir sistem arayüzünün eksik halka olduğu konusunda haklıydı. Kimsenin alıntılamadığı o ikinci cümlede, arayüz geldikten sonra ne olacağı konusunda da haklıydı: yerine geçme değil, yan yana koşan bir başka container tipi.

İkincisinin doğrulanması yedi yıl sürdü.

*Sırada: aynı teknolojinin bir tarayıcı sekmesinde koca bir Linux çekirdeği çalıştırması — ve o denemenin göründüğünden neden daha önemli olduğu.*

Gelecek yazılarda görüşmek üzere.

---

*Kaynaklar: [WASI 0.3 duyurusu](https://bytecodealliance.org/articles/WASI-0.3) · [WASI yol haritası](https://wasi.dev/roadmap) · [WASI 0.3 spesifikasyonu](https://wasi.dev/releases/wasi-p3) · [Component Model SSS](https://component-model.bytecodealliance.org/reference/faq.html) · [SpinKube mimarisi](https://www.spinkube.dev/docs/topics/architecture/) · [containerd Wasm shim'leri](https://github.com/deislabs/containerd-wasm-shims) · [Cloudflare Workers WebAssembly](https://developers.cloudflare.com/workers/runtime-apis/webassembly/) · [Not So Fast: WebAssembly vs. Native Code](https://www.usenix.org/conference/atc19/presentation/jangda) · [Hykes, 27 Mart 2019](https://x.com/solomonstre/status/1111004913222324225) ve [aynı gün gelen cevabı](https://twitter.com/solomonstre/status/1111113329647325185)*

*Ölçümler ve komut çıktıları 15 Ağustos 2026'da Linux 6.17 üzerinde, Docker 29.7.2, wasmtime 47.0.3, rustc 1.97.1, Go 1.26.2 ve .NET SDK 10.0.110 ile alındı.*
