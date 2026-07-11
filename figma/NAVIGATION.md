# XBuild Frontend — Navigation Map

This documents the frontend's actual routing/navigation as implemented today —
not a target design. There is **no React Router or URL-based routing**
anywhere in this app; every "page" is a `useState` value branching JSX in
`App.tsx` / `DesignStudio.tsx` / `StartPage.tsx`. See `ARCHITECTURE.md` for the
broader tech-stack overview; this file drills into *what leads to what*.

Where a route/tab/state is declared but never actually reachable, it's called
out explicitly — several exist in the current codebase.

---

## 1. Top-level tree

```
main.tsx
└─ App.tsx  (root state: isAuthenticated, role, currentRoute, buildIntent)
   │
   ├─ UNAUTHENTICATED — currentRoute (marketing)
   │  ├─ 'home'          → StartPage.tsx (+ BrandFeatures.tsx while idle)
   │  │                     · onboarding wizard lives here, see §2
   │  │                     · overlays: SignInModal.tsx, EarnModal.tsx
   │  ├─ 'models'        → ModelsPage.tsx
   │  ├─ 'how-it-works'  → ServicesPage.tsx
   │  ├─ 'earn'          → FinanceModule.tsx
   │  └─ 'about'         → AboutXBuild.tsx
   │     (GlobalHeader's marketing nav is hardcoded to exactly these 4 tabs —
   │      models / how-it-works / earn / about. No 'contact' tab exists.)
   │
   └─ AUTHENTICATED — role (set by SignInModal from email domain:
      │                 *@xhomes.us → 'admin', anything else → 'owner')
      ├─ 'admin' → AdminView.tsx, see §4
      └─ 'owner' → DesignStudio.tsx, see §3
```

Every marketing sub-page (`ModelsPage`, `ServicesPage`, `FinanceModule`,
`AboutXBuild`) takes an `onAction`/`onNavigate` callback wired to
`handleEducationCTA`, which just returns `currentRoute` to `'home'` — there is
no cross-navigation between marketing pages other than via the header or "back
to home."

---

## 2. StartPage onboarding wizard (`components/landing/StartPage.tsx`)

Internal `PageState` drives a single-page wizard (no route change):

```
initial ──(user submits address)──▶ searching ──▶ locating
                                                       │
                          ┌────────────────────────────┼───────────────┐
                          ▼                            ▼               ▼
                   residence-type                 not-fitted     needs-review
                          │                        (terminal)     (terminal)
              ┌───────────┴───────────┐
              ▼                       ▼
          eligible                not-fitted
              │
              ▼
     "ready" (Choose Your Build Path)
              │  selectGoal() → Free Build / Owner-Funded / Still Exploring
              ▼
     "typology" (ADU Type — Detached/Attached)
              │  onComplete() = handleSignIn(goal)
              ▼
     App.tsx: isAuthenticated=true, currentRoute='project',
              buildIntent = goal==='personal' ? 'buyout' : 'freeBuild'
              ▼
        DesignStudio.tsx (see §3)
```

- **`'ineligible'`** is declared in the `PageState` type and has two render
  guards checking for it (`StartPage.tsx:665`, `:1310`) but **no `setState('ineligible')`
  call exists anywhere in the file** — it's unreachable dead state, same
  pattern as `'permitting'` below.
- "Back" buttons (`handleBack`) step back through `ready`/`typology`/`residence-type`.
- Any state past `initial` shows the persistent wizard step indicator
  (Eligibility / Context / Typology).

---

## 3. Authenticated · Owner branch — `DesignStudio.tsx`

```
DesignStudio
├─ viewContext: 'project' | 'models' | 'services' | 'financing'   ⚠ see note below
│
└─ activeTab (only rendered as clickable pills when viewContext==='project'):
   │        Pills actually shown: site → design → value → timeline
   │        (linear unlock: each tab enables the next once the prior
   │         is marked complete via `completedTabs`)
   │
   ├─ 'overview'  → OverviewDashboard.tsx
   │                 reachable, but NOT one of the 4 pill tabs — only via the
   │                 avatar-menu "Dashboard" link or the initial default state
   ├─ 'site'      → SiteFeasibility.tsx  (2D/3D lot view + feasibility panel)
   ├─ 'design'    → designView: 'exterior' | 'interior'
   │                 ├─ 'exterior' → SiteVisualizer.tsx (mode="design")
   │                 └─ 'interior' → InteriorStudio.tsx
   │                    (toggled by InteriorStudio's onSwitchView / SiteVisualizer
   │                     style-selection flow — same tab, not a route change)
   ├─ 'value'     → ValuePlanner.tsx
   │                 └─ FreeBuildSection.tsx / SelfFundedSection.tsx
   │                    (branch depends on buildIntent)
   │                 └─ ExitBuybackModule.tsx
   ├─ 'permitting'→ ⚠ in the TypeScript union and in the tab-change guard list,
   │                 but has NO `case 'permitting'` in the render switch and NO
   │                 entry in the `projectTabs` pill array — fully unreachable.
   └─ 'timeline'  → TimelinePage.tsx
```

**⚠ `viewContext` is a dangling/incomplete feature.** `ValuePlanner.tsx` is
handed an `onNavigate` prop that (in `DesignStudio.tsx`) sets
`viewContext` to `'models'`/`'services'`/`'financing'` — but `DesignStudio.tsx`
imports `ModelsPage`/`ServicesPage`/`FinanceModule` and **never renders them**
anywhere in its JSX (confirmed: no render branch keys off `viewContext` besides
toggling what `GlobalHeader` displays as the nav strip). In practice, setting
`viewContext` away from `'project'` changes the header's nav look but the main
content area doesn't change. Worth knowing before building on top of it —
either finish wiring this, or treat it as legacy and remove the dead branch.

---

## 4. Authenticated · Admin branch — `AdminView.tsx`

```
AdminView
├─ tab: 'submissions' | 'parcels'
│    └─ subView: 'list' | 'map'      (submissions tab only)
```

No further nesting — a flat 2-tab admin dashboard, no wizard, no deep linking.

---

## 5. Known gaps (declared-but-unreachable states)

| Location | State | Status |
|---|---|---|
| `StartPage.tsx` `PageState` | `'ineligible'` | Type + 2 render guards exist, never `setState`'d |
| `DesignStudio.tsx` `activeTab` type | `'permitting'` | Type + guard-list exist, no render case, no pill |
| `DesignStudio.tsx` `viewContext` | `'models'` \| `'services'` \| `'financing'` | State is set by `ValuePlanner`'s `onNavigate`, but nothing renders differently based on it |

These aren't necessarily bugs to fix — they may be intentional scaffolding for
features still in progress (confirmed during an earlier cleanup pass that this
codebase does have deliberately-unwired-yet code, not just cruft). Flagged here
so anyone extending navigation knows these exist and are currently inert.

---

## 6. Persistence note (affects "return to same screen" behavior)

Navigation state itself is never persisted (a hard refresh always returns to
`currentRoute='home'`, `isAuthenticated=false`). What *does* persist across
refresh, via `localStorage`, are the underlying data payloads a returning user
would need to re-enter the same screen manually:

- `xhomes.lookup` / `xhomes.lookup:<lookupId>` — last address lookup result
- `xhomes.aduPlacement:<lookupId>` — ADU position/rotation/add-ons per lot
- `xhomes.lang` — language preference

See `程序说明.md` for the full localStorage key reference.
