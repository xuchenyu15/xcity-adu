# XBuild Frontend Architecture

## Overview

The XBuild frontend is a **Vite + React 18 + TypeScript** single-page application located in the `figma/` directory. It serves two distinct audiences through a single codebase: marketing visitors discovering the platform, and authenticated homeowners using the Design Studio tool. The application is fully bilingual (English / Chinese) and uses state-based navigation rather than a URL router.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Build tool | Vite 6 |
| UI framework | React 18 + TypeScript 5 |
| Styling | Tailwind CSS 4 (utility-first) |
| Component library | shadcn/ui (Radix UI primitives) |
| Animation | Motion (Framer Motion v11 successor) |
| HTTP client | Axios 1.x with interceptors |
| 3D rendering | Three.js r180 |
| Charts | Recharts 2 |
| Icons | Lucide React |
| i18n | Custom context (zh / en) |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                             │
│                   (root state machine)                      │
│                                                             │
│   currentRoute ──────────────────────────────────────┐      │
│   buildIntent  (freeBuild | buyout)                  │      │
│   isAuthenticated                                    │      │
│   isAdmin                                            │      │
└──────────────────────────────────────────────────────┼──────┘
                                                       │
              ┌────────────────────────────────────────┤
              │                                        │
    ┌─────────▼──────────┐               ┌────────────▼────────────┐
    │  Marketing Mode     │               │   Authenticated Mode     │
    │  (unauthenticated)  │               │                          │
    │                     │               │  DesignStudio (owner)    │
    │  StartPage          │               │  AdminView  (admin)      │
    │  BrandFeatures      │               └──────────────────────────┘
    │  ModelsPage         │
    │  ServicesPage       │
    │  FinanceModule      │
    │  AboutXBuild        │
    └─────────────────────┘
```

---

## State-Based Routing

There is **no React Router or URL-based navigation**. All navigation is controlled by `useState` in `App.tsx`:

```
currentRoute: 'start' | 'brand' | 'models' | 'services' | 'finance' | 'about'
              | 'studio' | 'admin'
```

- A sign-in gate sits between marketing and the studio.
- `buildIntent` (`'freeBuild'` | `'buyout'`) is set during onboarding and passed down to the `DesignStudio`.
- The authenticated `DesignStudio` has its own internal routing with two layers:
  - `viewContext`: `'project'` | `'models'` | `'services'` | `'financing'`
  - `activeTab`: `'overview'` | `'site'` | `'design'` | `'value'` | `'timeline'`

---

## Component Hierarchy

```
App
├── I18nProvider (wraps everything)
│
├── [Marketing]
│   ├── StartPage          — address entry, eligibility check, onboarding wizard
│   ├── BrandFeatures      — system sections / brand narrative
│   ├── ModelsPage         — ADU model catalogue
│   ├── ServicesPage       — how-it-works
│   ├── FinanceModule      — investment / earn explanation
│   └── AboutXBuild        — company & case studies
│
└── [Authenticated]
    ├── DesignStudio        — main product shell
    │   ├── GlobalHeader    — navigation, language toggle, sign-out
    │   ├── OverviewDashboard
    │   ├── SiteFeasibility — 2D/3D site visualization + feasibility panel
    │   ├── SiteVisualizer  — Three.js 3D massing view (also used inside Design tab)
    │   ├── InteriorStudio  — interior finish configuration
    │   ├── ValuePlanner    — financial terms & ROI
    │   ├── TimelinePage    — project execution timeline
    │   ├── ModelsPage      — (shared with marketing)
    │   ├── ServicesPage    — (shared with marketing)
    │   └── FinanceModule   — (shared with marketing)
    └── AdminView           — admin dashboard
```

---

## Data Flow

### Address Lookup (Entry Point)

```
StartPage
  │  user types address
  ▼
suggestAddress() ─────────────► GET /api/address/suggest?q=...
  │  show autocomplete
  ▼
lookupAddress()  ─────────────► POST /api/lookup  { address, lat, lon }
  │  full pipeline response (SiteLookupResponse)
  ▼
localStorage.setItem('xhomes.lookup', JSON.stringify(result))
  │  persisted for current session
  ▼
DesignStudio reads localStorage on mount
  │  passes `lookup` prop to SiteFeasibility and ValuePlanner
```

### API Client (`figma/src/api/`)

```typescript
// request.ts — axios instance
baseURL: import.meta.env.VITE_API_BASE_URL
timeout: 600_000ms (10 min)

// Interceptors
request:  attach JWT from localStorage['xhomes.auth.token']
response: on 401 → clear token, redirect to sign-in
```

Three API functions in `address.ts`:
| Function | Method | Endpoint |
|---|---|---|
| `geocodeAddress(address)` | GET | `/api/address/geocode?address=` |
| `suggestAddress(q)` | GET | `/api/address/suggest?q=` |
| `lookupAddress(req)` | POST | `/api/lookup` |

---

## SiteFeasibility Component

The most complex component in the app. Renders a split-panel view:

- **Left**: 2D SVG canvas or 3D Three.js massing view (toggled by `ViewToggle`)
- **Right**: structured feasibility data panel showing lot info, setbacks, ADU fit, structures on site

Key internals:
- Uses the `lookup` data from `localStorage` — no additional API calls
- 2D mode: custom SVG rendering with rotation math and Separating Axis Theorem (SAT) for collision detection between placed ADU rectangle and existing structures
- 3D mode: delegates to `SiteVisualizer`
- Allows the user to drag/reposition the ADU on the 2D canvas and see buildable area constraints in real time

---

## SiteVisualizer (3D Rendering)

Uses **Three.js** directly (no React-Three-Fiber abstraction):

- Renders the lot boundary, existing buildings, setback zones, and the selected ADU model as 3D extruded geometry
- Accepts a `mode` prop: `'site'` (neutral view) or `'design'` (shows selected expression + exterior material)
- Accepts a `selectedModel` string to swap the ADU mesh (induspod / aura / classic)
- Accepts an `exteriorMaterial` string to swap material color/texture
- When `lookup` data is present, parses `SitePolygonFt` coordinates for real lot/building geometry
- Falls back to a placeholder scene when no lookup data is available

---

## Design Studio Tab Flow

The studio enforces a **linear progression** tracked by `completedTabs: Set<string>`:

```
Site & Feasibility → Design → Financial Terms → Project Execution
        ↑                          ↑
  (always active)         (unlocked after Design)
```

- Completing each tab adds it to `completedTabs` and enables the next
- The `GlobalHeader` renders tabs as chips with visual state: completed / active / disabled

### Design Tab State

The Design tab manages:
- `selectedExpression`: which of the 3 architectural styles is chosen (IndusPod / Aura / Classic)
- `config.layout`: `'1B1B'` | `'2B1B'` | `'2B2B'`
- `config.balconies`: `('left' | 'right')[]`
- `config.finish`: exterior material string
- `designView`: `'exterior'` | `'interior'` — switches between expression selection and `InteriorStudio`

An expression detail overlay (`ExpressionDetailView`) uses a **local draft state** to prevent parent re-renders while the user browses details, only committing to the parent `config` on confirm.

---

## Internationalization (i18n)

- Custom `React.createContext` solution in `figma/src/i18n.tsx`
- Supports `'en'` and `'zh'` (Simplified Chinese)
- Language persisted to `localStorage['xhomes.lang']`; also sets `document.documentElement.lang`
- All ~300 string keys live in a single `messages` object in `i18n.tsx`
- Consumed via `useI18n()` hook that returns `{ language, setLanguage, t }`
- The `t(key)` function falls back: `messages[lang][key] ?? messages.en[key] ?? key`

---

## Local Storage Keys

| Key | Contents |
|---|---|
| `xhomes.lookup` | Last `SiteLookupResponse` JSON from `/api/lookup` |
| `xhomes.auth.token` | JWT bearer token |
| `xhomes.lang` | `'en'` or `'zh'` |

---

## File Map

```
figma/
├── src/
│   ├── App.tsx                     # Root: auth state, global routing
│   ├── i18n.tsx                    # i18n context, all en/zh strings
│   ├── api/
│   │   ├── request.ts              # Axios instance, JWT interceptors
│   │   └── address.ts              # geocode / suggest / lookup API calls
│   ├── components/
│   │   ├── landing/                # Marketing pages
│   │   │   ├── StartPage.tsx       # Address entry, eligibility wizard
│   │   │   ├── BrandFeatures.tsx
│   │   │   ├── AboutXBuild.tsx
│   │   │   └── ...
│   │   ├── studio/                 # Product / tool pages
│   │   │   ├── DesignStudio.tsx    # Main product shell & tab controller
│   │   │   ├── SiteFeasibility.tsx # 2D/3D site view + data panel
│   │   │   ├── SiteVisualizer.tsx  # Three.js 3D rendering
│   │   │   ├── OverviewDashboard.tsx
│   │   │   ├── InteriorStudio.tsx
│   │   │   ├── ValuePlanner.tsx
│   │   │   ├── TimelinePage.tsx
│   │   │   ├── ModelsPage.tsx
│   │   │   ├── ServicesPage.tsx
│   │   │   ├── FinanceModule.tsx
│   │   │   ├── Typography.tsx      # Shared text component primitives
│   │   │   └── ...
│   │   ├── shared/
│   │   │   ├── GlobalHeader.tsx    # Top nav bar (both modes)
│   │   │   └── EarnModal.tsx
│   │   ├── ui/                     # shadcn/ui primitives (~40 components)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   └── figma/
│   │       └── ImageWithFallback.tsx
│   └── imports/                    # Figma-exported TSX assets
├── package.json
└── vite.config.ts
```

---

## Key Architectural Observations

1. **No global state manager** — state flows through prop drilling from `App.tsx` and `DesignStudio.tsx`. This works at current scale but will become painful as the studio grows.

2. **`localStorage` as the data bus** — the lookup result is written by `StartPage`, then read independently by `DesignStudio`, `SiteFeasibility`, and `ValuePlanner`. There is no cache invalidation logic.

3. **Three.js imperative** — `SiteVisualizer` uses raw Three.js with `useRef` and `useEffect`. This gives full control but makes it harder to keep the 3D scene in sync with React state changes.

4. **Shared components between marketing and studio** — `ModelsPage`, `ServicesPage`, and `FinanceModule` are rendered in both contexts. This is good reuse, but the components must remain context-agnostic.

5. **`figma/` naming** — the directory is named `figma/` because the project was originally scaffolded from a Figma design import tool. The `src/imports/` and `figma:asset/...` references are artifacts of that workflow.
