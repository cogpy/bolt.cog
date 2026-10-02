# DTE role-tailored device workspace

Open **`/dte`** (or **DTE Workspace** in the classic Bolt header). The original Bolt chat and WebContainer workbench at `/` are unchanged.

| Pane | Concrete behavior | Boundary |
|---|---|---|
| Device Manager tree | Windows Device Manager–inspired hierarchy of typed reference and proposed components | Documentation inventory, **not** a Windows hardware scan |
| Device Development editor | CodeMirror editor for versioned JSON device definitions, local validation, browser-local save, revert, and JSON download | Browser-only draft; no writes to Bochs, Dynav, GitHub or the guest |
| Core Self chat | Live contextual model response via the fork's Anthropic SDK, selected trusted device metadata and identity-mesh guidance | No persistent hypergraph memory, tool access or fake resident response |
| APL253 rule console | Read exact rules from user-imported skill Markdown, list/range queries, and request new typed transformations from the live model | Not an OS shell; imported rules are **text**, not executed |

## Run and inspect

```sh
pnpm install --frozen-lockfile
pnpm dev
# open http://localhost:5173/dte (use the URL printed by Remix if the port differs)
pnpm test -- app/lib/dte/dte.test.ts
pnpm typecheck
pnpm build
```

Configure `ANTHROPIC_API_KEY` in the **server environment** to use chat or `generate` in the rule console. The DTE endpoints select `claude-sonnet-4-6`, confirmed on the configured Anthropic Models API during development; the original `/api/chat` model choice is deliberately unchanged and may require separate migration from its retired Claude 3.5 ID. The app does not embed or request credentials in the browser. If missing, these features return a truthful configuration error; inventory, editor, and imported-rule lookup still work. The upstream Bolt fork already has a public chat endpoint and no built-in login: do not publish an AI-backed deployment without access control, quotas and abuse protection.

The device editor persists drafts in this browser's `localStorage` under `dte-device-draft-v1:<id>`. Exports are explicit downloads. Reference/proposed status in the sidebar is trusted inventory metadata and cannot be promoted by editing a JSON draft; this application does **not** validate physical-device presence. A reference label denotes the previously validated Linux Bochs 3.0-style NPU/ASSD prototype, not a running connection.

The rule console accepts skill-owned `.md` files with `**APL001 NAME**` followed by a fenced block containing `NL:` and `→`. Import `expanded_rules_1_71.md`, `expanded_rules_72_142.md`, and `expanded_rules_143_253.md` from your skill as appropriate; no private rule corpus is committed to this public fork. Type `help`, `list 1 25`, `rule 1`, `range 1 5` or `generate 1 reinterpret this rule for an interrupt gateway`. `generate` requires an imported source pattern and the server model key; results are newly generated text, not an engine execution.

## Architecture and provenance

- `app/lib/dte/devices.ts` — typed documentation inventory and BAR/identity validator.
- `app/lib/dte/rules.ts` — bounded, non-executing corpus parser.
- `app/components/dte/` — tree, JSON editor, live chat, terminal UI, responsive styles.
- `app/routes/dte.tsx` — route, with client-only panes; `api.dte-chat.ts` and `api.dte-rules.ts` — model-backed endpoints with input limits and error logging.
- Existing reference: `hardware-emulation/dte-bochs-npu-assd-reference` in the user's separate Deep Tree Echo workspace. This public Bolt fork does **not** vendor those source files, compiled plugin, binary image or validation log.
- The NPU/ASSD PCI function uses vendor `0x1d7e`, device `0xacc1`, two 4 KiB MMIO BARs, NPU XOR staging and four volatile ASSD records; it does not implement neural training, DMA, host disk persistence or the other **proposed** DTE devices. Its validated guest runtime used a separate **Bochs 3.1.devel Linux** build; a 3.0 Windows DLL and snapshot round-trip were **not** validated.
- The actual Windows RoleTailoredClient installation was unavailable (`D:\dynav` absent) when this workspace was built. No executable was opened or changed, and no Windows Bochs DLL was built here. A future RTC bridge must be a separately reviewed, read-only adapter with explicit selected path and permissions.

**Further reading:** [Bochs development plugins](https://bochs.sourceforge.io/doc/docbook/development/bochsplugins.html), [Bochs device model lifecycle](https://bochs.sourceforge.io/doc/docbook/development/devmodel.html), and the [Bolt.new source project](https://github.com/stackblitz/bolt.new). The named `cogpy/navcog-rtc` is a separate cognitive SDK rather than proof of an installed Dynamics NAV runtime; no executable dependency on it is introduced.
