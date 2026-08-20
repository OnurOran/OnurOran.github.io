# What Is WASM? The Technology Growing Quietly

### Docker's creator said we would not have needed Docker if WebAssembly had existed. Seven years later I measured it, and the sentence he got right is not the famous one.

In March 2019, Solomon Hykes wrote this:

> "If WASM+WASI existed in 2008, we wouldn't have needed to created Docker. That's how important it is."

Hykes created Docker. That is why the sentence travelled. It still gets quoted as shorthand for one idea: containers are on the way out.

He answered that reading himself, the same day.

> "So will wasm replace Docker?" No, but imagine a future where Docker runs linux containers, windows containers and wasm containers side by side. Over time wasm might become the most popular container type.

Two posts, hours apart, from the same person. The first one is famous. The second one is the one that came true.

Seven years on, both can be checked. I installed the toolchain, wrote a small program, ran the benchmarks, and tried the .NET path. Here is what I found.

## So what is WASM, exactly?

WebAssembly is a compilation target. It is not a language.

You write Rust, C, C++, Go or C#, and you compile *to* it, the same way you compile to x86 or ARM. The output is a `.wasm` module: a small binary that any compliant runtime can execute, on any CPU, on any operating system.

It is a W3C standard. The current specification is version 3.0, published on 17 September 2025.

It started in browsers, as a way to run code faster than JavaScript could. That part is old news. The interesting part is that it left the browser.

A module has no ambient access to anything. No filesystem, no network, no clock, no environment variables. It can compute, and that is all. Everything else has to be handed to it deliberately.

That property is why it turned up on servers.

## The missing link: WASI

Read the Hykes quote again, and notice the clause nobody quotes either: *"A standardized system interface was the missing link."*

A module that can only compute is safe and useless. To do real work it needs to open files, accept connections, read the clock. That needs an interface, and the interface has to be standard. Otherwise every runtime invents its own and portability dies on arrival.

That interface is WASI, the WebAssembly System Interface.

**WASI 0.3 shipped on 11 June 2026**, two months before I wrote this. It is the release that added native async. `async func`, `stream<T>` and `future<T>` became primitives of the Canonical ABI, and the old `wasi:io` package was removed.

The mechanical change is that scheduling moved out of the component and into the runtime. It uses completion-based semantics, closer to Linux `io_uring` than to readiness polling. The announcement describes what it replaces as the "three-step `start-foo` / `finish-foo` / `subscribe` dance from WASI 0.2".

If you have been waiting for server-side Wasm to feel finished, this was the missing piece. Hold that thought until the section on languages.

## Seeing the sandbox in two commands

Here is what "no ambient access" means in practice. This is a complete program:

```rust
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = env::args().nth(1).ok_or("usage: lineclient <file>")?;
    let text = fs::read_to_string(&path)?;
    println!("{}: {} lines", path, text.lines().count());
    Ok(())
}
```

It takes a filename and counts the lines. Compiled for WASI it comes to 130 KB.

Run it:

```
$ wasmtime run lineclient.wasm /etc/hostname
Error: Os { code: 44, kind: NotFound, message: "No such file or directory" }
```

The file exists. The program cannot see it. Now hand it one directory:

```
$ wasmtime run --dir=/etc lineclient.wasm /etc/hostname
/etc/hostname: 1 lines
```

Same binary, same argument. The only thing that changed is that you granted `/etc`.

Now look at the error text again, because this is the part I did not expect. Ask for a file outside the grant, then ask for a file that does not exist at all:

```
$ wasmtime run --dir=/etc lineclient.wasm /usr/lib/os-release
Error: Os { code: 44, kind: NotFound, message: "No such file or directory" }

$ wasmtime run --dir=/etc lineclient.wasm /etc/definitely-not-here
Error: Os { code: 44, kind: NotFound, message: "No such file or directory" }
```

Byte for byte, the same error. `/usr/lib/os-release` is really there, thirteen lines of it. The module is told it is not.

The sandbox never says "denied". It says "not found". Outside what it was given, the module cannot tell forbidden from nonexistent, so it cannot probe for what exists.

Compare the default on the other side:

```
$ docker run --rm alpine:3.21 sh -c 'ls /etc | wc -l; ls /'
36
bin dev etc home lib media mnt opt proc root ...
```

A full root filesystem, thirty-six files in `/etc`, `/proc` mounted, before you have written a line of code.

Both models can be made safe. A hardened container with a read-only root, dropped capabilities and a seccomp profile ends up somewhere similar. The difference is which direction the work runs. With containers you start with everything and take access away. With WASI you start with nothing and grant it.

Defaults decide what happens on the days nobody is paying attention.

## How fast is it? I measured

One machine, one configuration, so read this as an order of magnitude and not a lab result. Linux 6.17, Docker 29.7.2, wasmtime 47.0.3, .NET 10.0.110. Median of twenty runs, warm: image already pulled, module already compiled.

| | median | size |
|---|---|---|
| `wasmtime` — minimal WASI module | **15 ms** | 20 KB |
| `docker start` — container already created | 210 ms | — |
| `docker run` — `alpine:3.21 echo hello` | 281 ms | 3.5 MB |
| `docker run` — .NET 10 console app | 284 ms | 40 MB |

Roughly nineteen times faster to start, and far smaller. That is the number everyone quotes, and on its own it is the least interesting row in the table.

Look at the last two instead. A .NET application starts in 284 ms. `echo hello` on Alpine starts in 281 ms. Three milliseconds apart.

The .NET runtime is not the cost. The image size is not the cost. `docker start` on a container that already exists is still 210 ms, so creation is only about a quarter of it. What you are paying for is the container model itself: namespaces, cgroups, the network setup, the daemon round trip.

Wasm does not make your application faster. It removes that fixed toll. If your workload starts once and runs for a week, the toll is nothing. If it starts ten thousand times an hour, it is the whole bill.

There is a trade on the other side, and articles like this one usually skip it. Wasm is slower than native at raw compute. The most-cited measurement, [Jangda et al. at USENIX ATC 2019](https://www.usenix.org/conference/atc19/presentation/jangda), found browser Wasm 45 to 55 percent slower than native across SPEC CPU. Standalone server runtimes have improved since, and I did not measure throughput myself, so treat the exact number as open. The direction is not open. You buy startup time and density by giving up peak speed.

## It already runs on Kubernetes

This is not a future-tense section.

`runwasi` exposes Wasm runtimes — Wasmtime, WasmEdge, Wasmer — as containerd shims. Scheduling happens through `RuntimeClass`, the same mechanism that already places gVisor and Kata workloads. SpinKube packages the operator, the containerd shim and a runtime class manager together, with contributors from Microsoft, SUSE, Liquid Reply and Fermyon.

So you can put Wasm workloads on an existing cluster today, next to your containers, on the same nodes.

Note the shape of that, though. `RuntimeClass` is the mechanism for *an alternative runtime*, not for replacing the default one. gVisor has been available the same way for years and no cluster defaults to it. That is the honest read of where this is heading, and it is exactly what Hykes predicted in the second post.

## Which languages does it work in? The answer is narrower than you think

This is where enthusiasm meets the toolchain. Everything marked verified, I ran on my own machine on 15 August 2026.

| Language | Target | State |
|---|---|---|
| Rust 1.97.1 | `wasm32-wasip2` | Ready. WASI 0.3 async through `wit-bindgen`. **Verified: built and ran.** |
| Go 1.26.2 | `wasip1/wasm` only | One generation behind. No `wasip2`, so no Component Model. **Verified.** |
| TinyGo | wasip1 / wasip2 | Works, small modules, common in Envoy and Proxy-Wasm. But TinyGo is a restricted fork, not Go. |
| C / C++ | wasi-sdk | Works. The original target. Rough ergonomics. |
| C# / .NET 10.0.110 | `wasi-experimental` | **Verified broken.** See below. |
| Python / JVM | — | Do not compile to Wasm. The interpreter is compiled into the module instead. Heavy. |

Start with Go, because it makes the point without any brand attached. Go 1.26.2 is current. Ask it what it can target:

```
$ go tool dist list | grep wasi
wasip1/wasm
```

One entry. `wasip1`. A first-tier backend language, on its current release, a full interface generation behind the thing that shipped in June.

Now .NET, where I expected an "experimental but usable" answer and did not get one:

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

Exit code 0. It reports success. In the same run, before printing that line, it garbage-collects the .NET 10 packs it had just installed. What is left afterwards is nothing:

```
$ dotnet workload list                    → no workloads installed
$ ls /usr/lib/dotnet/packs | grep -i wasi → nothing
$ dotnet new list wasi                    → No templates found matching: 'wasi'.
```

A successful install that installs nothing, and does not tell you. I am not going to guess at the cause. The [.NET 10 preview issues around this path](https://github.com/dotnet/runtime/issues/117848) suggest it has been rough for a while, but I cannot say it is the same bug.

Notice something about my own example, too. The program back in the sandbox section is in Rust, and that is not a preference. WASI 0.3 async works in Rust and nowhere else yet. Any other language and the demo could not show the thing this article is about.

The example choice and the conclusion are the same fact.

## Will it replace Docker? No, and maturity is not the reason

The strongest argument against Wasm as a container replacement has nothing to do with how new it is.

A container ships a userland. It will run any Linux binary, including ones whose source you do not have and cannot rebuild. Wasm runs what was compiled to Wasm. No amount of WASI maturing changes that, because it is not a gap — it is the design. Existing binaries, full POSIX, databases, GPU work, heavy threading over shared memory: all outside the model today.

Three more, briefly.

**The trade is startup against throughput.** Wasm wins where processes are short-lived and numerous. It loses where one long-running process wants maximum speed. That single sentence settles most adoption arguments before they start.

**Language support is the real brake, not runtime performance.** The table above is the whole story. "The technology is ready" and "your language is ready" are different claims, and only one of them is about Wasm.

**Distribution beats architecture.** OCI has a decade of registries, scanners, signing, CI integrations and people who know how to debug it. Wasm has a cleaner model and a fraction of that. The cleaner model does not automatically win; it has to outlast the inertia. I wrote much the same thing about [Cloudflare's agent workspace](/en/2026-08-cloudflare-os/), which suggests the pattern is worth watching on its own.

So what is the argument that survives? Multi-tenancy. Say you run untrusted third-party code: plugins, customer functions, edge handlers. A container gives you a heavyweight isolation boundary that you have to configure correctly. Wasm gives you a light one that is closed by default. Cloudflare Workers, Fastly, Envoy filters and Shopify Functions are all that shape. None of them is a Docker replacement. All of them are production.

## The verdict, in two parts

**As a container replacement: no.** Not this year, and not on the current trajectory. The design boundary is permanent, the language support is a generation behind outside Rust, and OCI's ecosystem advantage is enormous. Anyone telling you to plan a migration is selling something.

**As a runtime for a specific class of workload: it is already here.** Short-lived, high-churn, multi-tenant, untrusted. It is in production at companies you use daily, it schedules on Kubernetes through the same mechanism as gVisor, and as of June it finally has async in the standard interface.

The quiet growth in the title is that second sentence. Wasm did not replace anything. It took a slice, kept it, and is widening it while the argument about Docker continues elsewhere.

What would change my mind: language support moving past Rust. If C#, Go and Python get first-class `wasip2` toolchains with working async, the calculation shifts, because the design boundary stops mattering for the workloads most teams actually have. Watch the toolchains, not the benchmarks.

Which brings it back to where it started. Hykes was right that a standardized system interface was the missing link. He was also right, in the post nobody quotes, about what would happen once it arrived: not a replacement, but another container type running side by side.

The second one took seven years to confirm.

*Next: this same technology running an entire Linux kernel inside a browser tab — and why that experiment matters more than it looks.*

See you in the next one.

---

*Sources: [WASI 0.3 announcement](https://bytecodealliance.org/articles/WASI-0.3) · [WASI roadmap](https://wasi.dev/roadmap) · [WASI 0.3 specification](https://wasi.dev/releases/wasi-p3) · [Component Model FAQ](https://component-model.bytecodealliance.org/reference/faq.html) · [SpinKube architecture](https://www.spinkube.dev/docs/topics/architecture/) · [containerd Wasm shims](https://github.com/deislabs/containerd-wasm-shims) · [Cloudflare Workers WebAssembly](https://developers.cloudflare.com/workers/runtime-apis/webassembly/) · [Not So Fast: WebAssembly vs. Native Code](https://www.usenix.org/conference/atc19/presentation/jangda) · [Hykes, 27 March 2019](https://x.com/solomonstre/status/1111004913222324225) and [the reply the same day](https://twitter.com/solomonstre/status/1111113329647325185)*

*Benchmarks and command output produced on Linux 6.17 with Docker 29.7.2, wasmtime 47.0.3, rustc 1.97.1, Go 1.26.2 and .NET SDK 10.0.110 on 15 August 2026.*
