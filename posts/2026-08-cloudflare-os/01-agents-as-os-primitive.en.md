# What Cloudflare OS Is, and What It Isn't

### Cloudflare open-sourced an "AI operating system" this month. I installed it. Here's what it does, what it doesn't, and the one claim worth arguing about.

> **[IMAGE 1 — hero]** `images/01-hero-q3-workspace.png`
> A Q3 planning workspace in Cloudflare OS. This image ships inside the repository
> (`docs/images/q3-planning-workspace.png`) under Apache-2.0, so it is safe to reuse with
> attribution. Caption: *Cloudflare OS — image from the project repository (Apache-2.0).*

---

On 4 August, Cloudflare released **Cloudflare OS**. It's open source, Apache-2.0, and [on GitHub](https://github.com/cloudflare/cloudflare-os), where it picked up 6,400 stars in a few days.

The headlines all led with the same two words: operating system.

Cloudflare rules those two words out themselves, in the second paragraph of their own README. This is not a traditional computer operating system, they say, before anyone can raise it — and then they explain the two senses they do mean.

Which leaves a better question. Set the name aside, and what's actually here?

One sentence, as it turns out. It sits in a section near the end of the README, and it comes hedged with a "perhaps":

> AI agents **"cannot simply be treated as users."**

That isn't marketing. It's a claim about how software should be designed, and it's one you can test. I find it a lot more interesting than "Cloudflare shipped a chatbot."

I cloned the repository and ran it on my own machine before writing any of this. Here's what it is, how to install it, and what I found.

---

## First, what it isn't

**It doesn't replace your operating system.** Not Ubuntu, not Debian, not RHEL, not Windows or macOS. There's no ISO, no kernel, no bootloader. What you're installing is a web app, and the layers stack up like this:

```
Your OS (the real kernel)
  └── Node.js
       └── workerd            ← Cloudflare's Workers runtime
            └── Cloudflare OS
                 └── Gadgets  ← V8 isolates, not OS processes
```

Go looking for one of its "processes" in `htop` and you won't find it. The JVM is the closest familiar thing: it manages execution, controls access to resources, has its own security model — and nobody installs it instead of Linux.

**It doesn't do DevOps.** No shell connector, no filesystem, no Docker, no Kubernetes, no SSH. All sixteen gatekeepers are SaaS APIs. Even `gatekeeper-cloudflare`, which sounds like infrastructure, currently does exactly two things: OAuth sign-in and AI Gateway billing. Its README says the rest is coming later.

**It doesn't touch your machine.** The worry here points the wrong way. This doesn't manage your computer — it runs inside a box on your computer and can't get out of it. Gadget server code has outbound networking switched off. Client code runs in a sandboxed iframe. There's no filesystem access at all.

I asked the agent directly whether it could see my folders. It couldn't: only the resources I'd connected to the workspace, and the files it had created itself. That's not politeness, it's how the thing is built.

**It isn't competing with a coding agent.** It does build apps. But a purpose-built coding agent writes better code and hands you files you actually own. Cloudflare doesn't claim otherwise — what they claim is *fewer tokens*, because their agent is tuned for one narrow environment. Judge this product by its app-building demo and you're judging it on its least interesting feature.

**And it isn't a document system**, though it looks like one at first. Open the Explore page and the whole library is three items: Docs, Slides, Sheets.

> **[IMAGE 2]** `images/05-explore-blueprints.jpg`
> Caption: *The whole built-in "office suite" — three blueprints, no more privileged than anything you build.*

Those three are three files in `packages/workshop-backend/format-blueprints/`. The office suite isn't a feature of the product. It's three blueprints sitting on the same substrate, in the same sandbox, with the same permissions as anything you'd write tomorrow.

That's the argument in a single move: if we can write our own document editor as an ordinary app here, then the platform is what we say it is.

---

## Installing it

Twenty minutes, and worth doing even if you never deploy it anywhere.

### 1. Clone and run

```bash
git clone https://github.com/cloudflare/cloudflare-os
cd cloudflare-os
pnpm run-local
```

That's the whole install. It pulls dependencies, builds what it needs, and starts serving at `http://localhost:8787`.

The first run took about two minutes for me. Every run after that is quick, because it hashes the source files and skips the build entirely when nothing has changed.

Watch the startup log while it comes up. **Eighteen separate Workers** start: a router, the backend, and sixteen gatekeepers, each with its own generated config. Hold onto that — I'll come back to it.

Your data lands in `.wrangler/`. Delete that folder to reset, delete the repo to uninstall. Nothing else on your system is touched.

### 2. Sign up as `admin`

There's no default account waiting for you. Click "Create one" and register.

**Use the username `admin`.** In local mode the dev server defines an allowlist of `["admin"]`, and whoever registers with that exact name gets the admin panel. Pick anything else and this is what you get:

> **[IMAGE 7]** `images/07-admin-denied.jpg`
> Caption: *What you see if you register under any other name. The docs don't mention it.*

### 3. Set up a model

Nothing works until you do, because no model ships with it.

The easy path doesn't need a Cloudflare account at all. Outside AI Gateway mode, every provider is bring-your-own-key: you paste your key into the model settings and the bill goes straight to the provider.

Anthropic, OpenAI, Google, Workers AI, and Ollama are all supported. For a local model, set the provider to `ollama` and the URL to `http://localhost:11434` — it appends `/v1` itself and skips the auth header when you give no key. Be aware that the suggested-model list for Ollama is empty, so nothing there has been validated. This is a coding agent, so set expectations accordingly.

Start with something cheap. The agent burns tokens.

### 4. Use it

Open a workspace and start typing. Your spend shows up live in the header as you go.

> **[IMAGE 6]** `images/02-workspace-chat.jpg`
> Caption: *A workspace. Live cost top left, chat in the middle, App / Code / Connections on the right.*

My first exchange was just asking what it could do. It told me it builds and edits small apps, writes code, and can connect to services like GitHub, Google, and Notion if I let it — then added that the workspace didn't have an app in it yet.

That last part matters, because a session really does start empty. You ask for something, and a Gadget appears in the right-hand panel with its own code and its own connections.

The README suggests a few opening prompts:

- *"Make a collaborative whiteboard app."* — builds one from scratch
- *"Make a tic tac toe game."* followed by *"I'll be X and you be O. I've made my first move. Your turn."* — the agent plays inside the app it just wrote
- *"Make slides for my meeting with a customer."* — uses the slides blueprint

The second one is the real demo. Every Gadget's client and server have to talk over Cap'n Web RPC, and that requirement leaves the server with an API that's easy to call. So the agent can turn around and use the app it just built, with no MCP server and no extra wiring. A constraint, turned into a feature.

---

## It isn't the "AI operating system" you might be picturing

There's been a loose idea going around since about 2023 — LLM OS to some, agentic OS to others. The model becomes the computer's main interface and runs everything from there. Karpathy sketched the best-known version in a talk: the LLM as CPU, the context window as RAM, tools as peripherals. Academic work followed, and a few hardware attempts came and went.

As a way of thinking it was useful. As a shipping category, not much of it stuck.

This is not that, and the difference is the whole point.

In the LLM-as-OS picture, **the model is the kernel**. It sits in the middle and everything else arranges itself around it.

Here the model is a swappable part — bring your own key, pick any provider, point it at a local endpoint. The kernel is plain code you can sit down and read.

So the agent isn't the thing doing the governing. It's the thing being governed.

Same word, opposite arrangement.

---

## So why call it an OS?

Cloudflare means two things by it: an operating system for a company to use AI safely, and an operating system for AI workloads, the way a normal OS manages compute workloads.

Then they map it out row by row:

| Normal OS | Cloudflare OS |
|---|---|
| kernel | `packages/workshop-backend` |
| device drivers | `packages/gatekeeper-*` |
| shell | `packages/workshop-frontend` |
| processes | gadgets |
| executables | blueprints |
| users | users |
| ACLs | shared permissions |
| **???** | **agents** |

Technically, what you have here is an application. It doesn't manage hardware, there's no CPU-level privilege separation, it doesn't schedule threads on cores, and it runs as an ordinary userspace process on a real operating system. You can't put it in a sentence with Linux, macOS, and Windows.

But booting isn't what makes something an operating system either. If it shares out a resource, isolates the programs using it, and controls how they reach it, then it's doing an OS's job. This does all three. The resource just isn't hardware — it's your company's systems.

The code backs the analogy up, too. Remember those eighteen Workers: the gatekeepers aren't modules inside a monolith, they're genuinely separate processes, which is why compromising one doesn't reach the others. Even the shared context library compiles into its own standalone bundle.

---

## The empty cell

Look at the table again. Every row lines up except the last one, where the normal-OS column just says `???`.

That gap is the reason the project exists. **Agents are a primitive that operating systems don't have yet.**

The reasoning goes like this. A user answers for their own actions, while an agent has to answer to a human — and do it holding narrower permissions than that human has. On top of that, an agent works by writing code and running it on the spot. So the permission decision lands per call, at runtime, on code nobody reviewed.

Access control lists were designed for a different world, one where you grant a principal access to a resource and walk away. They can't express *this agent, for this person, for this task, may do exactly this one thing.*

Capabilities can. Object-capability security is decades old and never found its killer application, and Cloudflare's bet is that agents are it.

Then comes the hedged line, which is the boldest thing in the project: maybe normal operating systems ought to give agents special treatment too.

You can disagree with that. But notice it's an argument about system design rather than a sales pitch — and that it's sitting in a README, not the press release.

---

## What it looks like on screen

Click "Add resource" and the abstraction turns concrete.

> **[IMAGE 3]** `images/03-add-resource-granularity.jpg`
> Caption: *Resources aren't accounts. GitHub splits into Repository, Issue, and Pull Request.*

Look at what GitHub is here. Not "your GitHub account" — **Repository, Issue, Pull Request**, separate types you add one at a time. Google splits into Gmail Mailbox, Doc, Spreadsheet, Calendar, BigQuery. Confluence into Site, Space, Page.

This is where it stops being philosophy. In most setups you configure your tool servers up front, and from then on every chat has all of them sitting there. Here an agent starts with access to nothing and gets introduced to resources one at a time. It can ask for an introduction, and you say yes or no.

Safer, and more friction. Your users will feel it. If you're planning to roll this out across teams, decide that on purpose rather than discovering it during the pilot.

> **[IMAGE 4]** `images/06-gatekeepers.jpg`
> Caption: *Gatekeepers — one connector per service, connected once, then wired into whatever you build.*

---

## Two ideas worth stealing

**Capabilities instead of credentials.** The gatekeeper holds the OAuth credential and exposes a narrow, typed surface. In agent code that comes out as:

```js
const issues = await env.SUPPORT.listIssues({ state: "open" });
```

No token in that line, and none anywhere the agent can reach. Prompt-inject it into trying to read source code and the method it would need doesn't exist on that binding. The attack dies at the type system without ever reaching the model's judgment — which matters, because the model's judgment is the one part of this stack that will never be reliable.

**Approval by simulation.** This is the piece I hadn't seen before. In the usual human-in-the-loop setup, the agent stops dead on every action that needs approval, which is exactly why people switch on auto-approve within a week.

Here the gatekeeper simulates the result instead. It tells the agent the action succeeded, and hands back fabricated results if the agent reads them again. The agent carries on and queues up forty actions, and you review them in bulk later, when it suits you.

Small idea. It decides whether an approval flow survives its first week.

---

## A gap in the MCP connector

Connecting an MCP server is easy: paste an endpoint and its tools are discovered automatically, arriving as typed methods. You can grant the whole server or only the tools you pick, and anything not on the list is refused — including tools the server adds later. Read-only tools return straight away, and everything else queues for approval.

Except that *the MCP server's own annotations decide which tools count as read-only.*

So at this layer the guarantee rests on a self-declaration from the party you're trying to constrain. A server that labels a destructive tool as read-only walks past the approval queue.

Cloudflare doesn't hide this. The connect form says that connecting a server means deciding to trust it, precisely because its annotations determine what runs without asking. But the screen before it states flatly that writes need approval, and the two don't sit comfortably together.

> **[IMAGE 5]** `images/04-add-resource-mcp.jpg`
> Caption: *"Tools are discovered automatically, and writes need approval." What counts as a write is the server's call.*

If you're deploying this, the conclusion is straightforward: **don't let staff paste arbitrary MCP endpoints.** That's what `gatekeeper-mcp-portal` is for — an admin configures one URL and users supply nothing. For a rollout, use the portal.

I haven't tested whether a deliberately mislabelled tool actually gets through, and on reflection there's no point. The result wouldn't change anything. If it slips past, you put an admin in front of the endpoints. If it somehow gets caught, you still put an admin in front of the endpoints, because you can't build a policy on undocumented behaviour.

Cloudflare telling you plainly that connecting a server means trusting it is the more useful signal anyway.

---

## Does it stand a chance?

**The strongest argument against it: this idea already failed once.**

Kenton Varda built it, and he [says openly](https://x.com/KentonVarda/status/2084990137180590572) that it's a remake of **Sandstorm.io**, his own startup from ten years ago. A Gadget is the same idea as a Sandstorm Grain: every document gets its own isolated copy of the app that edits it. Cloudflare's CTO called it Sandstorm's spiritual successor.

Sandstorm didn't win. Varda's own explanation, which he repeats across the [Hacker News thread](https://news.ycombinator.com/item?id=49182996), is that the model needed users who were both willing and able to modify their own software — and there weren't any. The architecture was ready; the users weren't.

His claim now is that AI removed that barrier. I think it's the right argument. But it's still a guess about how people behave, made by the person who most wants it to be true, and ten years of evidence points the other way.

**Open source isn't the same as portable.** Apache-2.0 sounds like freedom from lock-in until you look at the dependencies: Dynamic Workers, Durable Object Facets, Cap'n Web. Running it on your own server with `workerd` is marked **COMING SOON** — they suggest reading the low-level config docs and having a go, which isn't a supported path. Today you get two options: a Cloudflare account, or local dev. If you need on-prem or data residency, you can't deploy this yet.

**A fork is a one-way door.** `CONTRIBUTING.md` says they aren't taking outside contributions, and PRs over about a dozen lines get closed. Their reasoning holds up — AI made writing code easy, review and coherence are the hard part, and outside contributions donate the easy half. But the consequence for you is concrete: everything you customise to turn this into your company's OS is yours to maintain forever, with nowhere to send it back.

**Distribution decides this category, and Cloudflare has none.** Microsoft ships Copilot into a seat that already exists on every desk. Google ships Gemini into Workspace. Analyst Carmi Levy [argues to CIO](https://www.cio.com/article/4206332/cloudflare-wants-to-provide-the-operating-system-for-the-ai-first-enterprise.html) that Cloudflare's version is more coherently bundled than Microsoft's scattered pieces, and he's right. Coherent architecture has also lost to bundled distribution many times before.

**And there's a precondition nobody mentions.** All of this assumes your company has written down how it works. If it hasn't, what you get is an agent that knows nothing useful and a pile of half-finished Gadgets. No architecture fixes that one.

### What survives all of it

Every serious AI deployment runs into the same question eventually: *what is this thing allowed to touch, and how would we know if it touched something else?* Right now that gets answered with an integration scope, a policy document, and a log nobody reads.

This is the first mainstream attempt I've seen to answer it in the substrate. The agent can't exceed its grant because the method isn't there, and sharing an output is itself an access decision.

So I'd split the verdict in two.

**As a product**, moderate odds. There's a real technical advantage here, a real security story, and real open-source credibility. Against that: no distribution, a founding bet that already failed once, and no supported way to self-host.

**As a pattern**, close to inevitable. If this isn't the platform everyone ends up using, something carrying its security model will be. The alternative is defending prompt injection with a policy document.

---

## Closing

The name starts an argument Cloudflare had already conceded. Put it aside and there's something better underneath.

What's underneath is a proposal: agents belong in the operating system's model of the world, next to processes and users, governed by permissions designed for code that writes itself at runtime.

Whether Cloudflare is the company that makes that stick is a different question from whether they're right.

I think they're right.

If you've already connected this to a real system inside a company, I'd like to hear how that went. Write-ups of what works are everywhere. Write-ups of what broke are not.

---

*Sources: [Cloudflare blog](https://blog.cloudflare.com/cloudflare-os/) · [press release](https://www.cloudflare.com/press/press-releases/2026/cloudflare-os-is-the-first-ai-workspace-built-around-how-companies-actually-work/) · [GitHub](https://github.com/cloudflare/cloudflare-os) · [Hacker News](https://news.ycombinator.com/item?id=49182996) · [CIO](https://www.cio.com/article/4206332/cloudflare-wants-to-provide-the-operating-system-for-the-ai-first-enterprise.html). Screenshots are mine, from `main` on 8 August 2026. The hero image ships in the repository under Apache-2.0.*

*A Turkish version is available [here](https://medium.com/p/769daeca75ba).*
