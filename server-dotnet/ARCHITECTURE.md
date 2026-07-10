# XBuildApi — Backend Architecture

## Overview

XBuildApi is an ASP.NET Core Web API that answers one question: *can an ADU be built at this address, and if so, where?*

Given a single-line address, the API fetches parcel and building data from official government sources, runs geometry computations in a street-aligned local coordinate system (feet), and returns structured GeoJSON results the frontend can render directly.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                               │
│                  (Vite + React, figma/)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │  POST /api/lookup { address }
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       XBuildApi (.NET)                          │
│                                                                 │
│  LookupController                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. SiteRegionResolver  →  pick adapter (WA/NY/NJ)       │  │
│  │  2. adapter.FetchSubjectAsync  →  parcel + buildings      │  │
│  │  3. adapter.FetchNearbyAsync   →  roads + nearby bldgs   │  │
│  │  4. PlanBuilder.BuildAsync     →  geometry engine         │  │
│  │  5. ComputeComputed            →  assemble response       │  │
│  │  6. AI enrichment (optional)   →  zoning / parcel info   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  NetTopologySuite (in-process)                                  │
│  └─ polygon buffer / difference / union / A* pathfinding        │
└──────┬──────────────────┬─────────────────────┬────────────────┘
       │                  │                     │
       ▼                  ▼                     ▼
 State ArcGIS        OSM Overpass          LLM API
 REST APIs           API                  (optional)
 (WA/NY/NJ           (buildings           OpenAI-compatible
  parcel data)        + roads)            zoning enrichment
```

---

## Request Pipeline

```
POST /api/lookup
      │
      ▼
 Resolve region ──── address contains "WA" ──► SeattleRegionAdapter
 (by state suffix)── address contains "NY" ──► NewYorkRegionAdapter
                  └── address contains "NJ" ──► NewJerseyRegionAdapter
      │
      ▼
 FetchSubject ──────────────────────────────► Official parcel API
      │                                        (ArcGIS REST, per state)
      │  parcel GeoJSON + buildings GeoJSON
      ▼
 FetchNearby ───┬──────────────────────────► ArcGIS bbox query
 (padded bbox)  │                             (nearby parcels)
                ├──────────────────────────► OSM Overpass
                │                             (nearby buildings, 12s timeout)
                └──────────────────────────► OSM Overpass
                                              (nearby roads, 12s timeout)
      │
      │  filter + deduplicate buildings
      ▼
 PlanBuilder ──────────────────────────────► (in-process geometry)
      │   lon/lat → WebMercator → rotate to street → local ft coords
      │   classify house / garage
      │   apply setbacks → subtract obstacles → A* driveway corridor
      │   output: buildable polygon, cutouts, ADU fits
      ▼
 ComputeRotation ──────────────────────────► (from nearbyRoads geometry)
      │   find closest road segment to parcel
      │   derive map rotation so street is horizontal at top
      ▼
 ComputeComputed
      │   assemble SiteComputed from plan outputs
      │   ft-polygon → GeoJSON lon/lat (inverse transform)
      │   ADU placement inset (circumscribed-circle buffer)
      ▼
 AI Enrichment (if Ai:Enabled) ────────────► ArcGIS zoning endpoints (per state)
      │   fetch + clean external zoning data       │
      │   call LLM with parcel props + zoning ◄────┘
      │   parse bilingual (zh/en) output
      │   merge with plan-derived fallback values
      ▼
 SiteLookupResponse  ──────────────────────► Frontend
```

---

## External Dependencies

```
XBuildApi
    │
    ├── NetTopologySuite  ──────────────────────── (in-process NuGet)
    │       All polygon math: buffer, intersection,
    │       difference, union, validity repair,
    │       distance operations
    │
    ├── State ArcGIS REST APIs  ──────────────────  (HTTPS, httpClient "arcgis")
    │   ├── KingCounty (WA)
    │   │     gisdata.kingcounty.gov          → subject parcel
    │   │     gisdata.seattle.gov             → zoning attributes
    │   │     blue.kingcounty.com/Assessor    → parcel details (AI input)
    │   ├── New York (NY)
    │   │     gisservices.its.ny.gov          → subject + nearby parcels
    │   └── New Jersey (NJ)
    │         maps.nj.gov/arcgis/Cadastral    → subject + nearby parcels
    │
    ├── OSM Overpass API  ───────────────────────  (HTTPS, httpClient "overpass")
    │       overpass-api.de  (or mirror)
    │       Queries: buildings within bbox (way[building])
    │                roads within bbox (highway filter)
    │       Timeout: 12s per query; "overpass-fast" client has 4s hard limit
    │
    └── LLM API  ────────────────────────────────  (HTTPS, httpClient "ai", optional)
            Any OpenAI-compatible endpoint
            Configured via appsettings: AI:Upstreams[].Provider/BaseUrl/Model/ApiKey
            Input:  address hint + parcel properties + external zoning data
            Output: bilingual (zh/en) zoning, lotArea, lotDimensions,
                    heightLimit, existingUnits, utilityAccess, setbacks
```

---

## PlanBuilder Geometry Pipeline

```
Input: parcel GeoJSON (lon/lat)  +  buildings GeoJSON  +  setback params
           │
           ▼
   lon/lat  →  WebMercator (meters)
           │
           ▼
   Query nearest road segment (OSM Overpass)
     ├── found  →  use road tangent direction as alignment angle
     └── not found  →  use longest parcel edge direction
           │
           ▼
   Rotate parcel + buildings by alignmentAngle
   (street runs horizontally; front of lot at top)
           │
           ▼
   Convert to local ft coords
   (origin = top-left of parcel bbox, Y increases downward)
           │
           ▼
   Orientation check:
     ├── road below parcel center → flip 180°
     └── no road: house below center → flip 180°
           │
           ▼
   Classify buildings:
     centroid inside lot AND ≥80% area overlap → on-parcel
     OSM/city tags → role hint (house / garage)
     largest non-garage → house;  candidate behind house → garage
           │
           ▼
   Compute initial buildable rectangle:
     [sideSetback … width-sideSetback] × [frontSetback … height-rearSetback]
     Override bounds if existing structures extend beyond setback lines
           │
           ▼
   Driveway corridor (if garage identified):
     1. Erode free space by 5 ft  (ensures 10 ft clearance)
     2. A* on 1 ft grid from garage exit to front-yard band
     3. Buffer path → 5 ft corridor polygon + garage apron + front strip
           │
           ▼
   Subtract obstacles from lot polygon (NTS Difference):
     house polygon, garage polygon, driveway corridor, other structures
           │
           ▼
   Remove narrow fragments  →  BuildablePolygon (may be MultiPolygon)
   Record each subtracted zone as a LookupCutoutArea with reason label
           │
           ▼
   ADU fit check: test each configured module size (w×h) against buildable bbox
   ADU placement inset: buffer buildable by -circumscribedRadius → placement area
           │
           ▼
   Store LookupPlanTransform (centerMercX/Y, minRotX, maxRotY, angleRad)
   Used later to convert ft polygons back to lon/lat GeoJSON
           │
           ▼
Output: LookupPlan  (local ft polygons + transform + canFitAdu + cutouts)
```

---

## Entry Point & Startup

**`Program.cs`** configures and wires the entire service:

- Named `HttpClient` instances are registered for each upstream category:
  - `overpass` / `overpass-fast` — OpenStreetMap Overpass API (buildings, roads)
  - `arcgis` — Government ArcGIS REST endpoints (parcel data), with optional proxy support via `HTTPS_PROXY` / `HTTP_PROXY` env vars
  - `tiles` — OSM tile proxy
  - `ai` — LLM upstream for parcel info enrichment
- All region adapters (`ISiteRegionAdapter`) are registered as singletons and discovered by `SiteRegionResolver`
- A custom `SimpleFileLoggerProvider` writes daily log files to `logs/xbuildapi-YYYYMMDD.log` alongside console output
- CORS is fully open (`AllowAnyOrigin`) to support local dev and hosted frontends
- Static files (including `.glb` models) are served from `wwwroot/`

---

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/lookup` | Main entry point — address → full site analysis |
| `GET` | `/api/geocode` | Address → lat/lon (for frontend input UX) |
| `GET` | `/api/suggest` | Address autocomplete suggestions |
| `GET` | `/api/tiles/osm/{z}/{x}/{y}.png` | OSM tile proxy (CORS + caching) |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/incentives` | ADU incentive research (AI-assisted) |
| `POST` | `/api/submissions` | Submission storage |

### `/api/lookup` request/response

**Request:**
```json
{ "address": "1234 Main St, Seattle, WA", "lang": "en" }
```

**Response** (`SiteLookupResponse`):
```
{
  request        — echoes address + lang
  region         — provider, city, state, lat/lon, streetName
  subjectParcel  — GeoJSON Feature (the target parcel polygon)
  subjectBuildings — GeoJSON FeatureCollection (buildings on the parcel)
  nearbyParcels  — GeoJSON FeatureCollection
  nearbyBuildings — GeoJSON FeatureCollection
  nearbyRoads    — GeoJSON FeatureCollection (LineStrings)
  computed       — all geometry results (see below)
  parcelInfo     — lotAreaSqft
  aiParcelInfo   — zoning, lotArea, lotDimensions, heightLimit, existingUnits, utilityAccess, setbacks (bilingual zh/en)
}
```

**`computed` fields** (`SiteComputed`):
| Field | Description |
|-------|-------------|
| `rotationDeg` | Degrees to rotate the map layer so the front street is horizontal and at the top |
| `setbacksFt` | Front / rear / sideLeft / sideRight / houseSep distances in feet |
| `subjectStructures` | On-parcel buildings with role (`house`/`garage`) and polygon in ft |
| `nearbyStructures` | Off-parcel context buildings in ft |
| `drivewayCorridorFt` | Polygon of the computed driveway corridor in ft (may be null) |
| `buildablePolygonFt` | Buildable area polygon in local ft coordinates (with optional holes) |
| `buildableArea` | Same shape as GeoJSON lon/lat Feature |
| `aduPlacementArea` | Inset of `buildableArea` — valid center-point range for ADU placement |
| `cutouts` | GeoJSON FeatureCollection of excluded zones (debug/visualization) |
| `aduFits` | Array of `{w, h, canFit}` for each configured module size |
| `rulerLinesFt` | Suggested ruler lines (kind, A, B, distanceFt) |

---

## Pipeline: `LookupController.RunPipelineAsync`

The entire lookup is a sequential 5-step pipeline:

```
Address
  │
  ▼
1. SiteRegionResolver.Resolve(address)
     └─ Matches state suffix (WA / NY / NJ) → picks adapter
  │
  ▼
2. adapter.FetchSubjectAsync(address)
     └─ Calls region-specific LookupProvider (official parcel API)
     └─ Returns: parcel GeoJSON, buildings GeoJSON, lat/lon, streetName
     └─ Filters subject buildings to those inside the parcel (centroid test)
  │
  ▼
3. adapter.FetchNearbyAsync(subject)
     └─ Pads parcel bbox by ~130m (0.0012°)
     └─ Parallel fetches:
         - Nearby parcels (ArcGIS bbox query, region-specific endpoint)
         - Nearby buildings (OSM Overpass, 12s timeout)
         - Nearby roads (OSM Overpass, 12s timeout)
     └─ Filters out buildings whose centroid is inside the subject parcel
     └─ Deduplicates buildings across subject/nearby by geometry key
  │
  ▼
4. adapter.BuildPlanAsync(subject) → PlanBuilder.BuildAsync(...)
     └─ Core geometry pipeline (see below)
  │
  ▼
5. ComputeRotationDegFromNearbyRoads(...)
   ComputeComputed(subject, plan, policy, rotationDeg)
     └─ Assembles SiteComputed from plan outputs
  │
  ▼
6. (optional) LookupAiParcelInfoHelper.TryGetAsync(...)
     └─ Fetches external ArcGIS zoning endpoints for the state
     └─ Calls configured LLM with parcel properties + external sources
     └─ Falls back to plan-derived values if AI is disabled or fails
  │
  ▼
SiteLookupResponse
```

---

## Region Adapter Pattern

`ISiteRegionAdapter` is the abstraction that allows adding new regions without touching the pipeline:

```
ISiteRegionAdapter
  ├─ Name: string
  ├─ Policy: RegionPolicy          ← setback defaults, ADU module sizes, bbox pad
  ├─ CanHandle(address): bool      ← matches state abbreviation
  ├─ FetchSubjectAsync(...)        ← parcel + buildings for the target address
  ├─ FetchNearbyAsync(...)         ← nearby parcels/buildings/roads
  └─ BuildPlanAsync(...)           ← calls shared PlanBuilder with Policy values
```

**Registered adapters:**

| Adapter | State | Parcel source | Nearby parcels source |
|---------|-------|---------------|----------------------|
| `SeattleRegionAdapter` | WA | Seattle Official API | KingCounty ArcGIS FeatureServer |
| `NewYorkRegionAdapter` | NY | NY Official API | NYS Tax Parcels ArcGIS |
| `NewJerseyRegionAdapter` | NJ | NJ Official API | NJ Cadastral ArcGIS |

**`RegionPolicy` defaults** (same across all current regions):
- Front setback: 20 ft, Rear setback: 20 ft, Side setback: 5 ft, House separation: 5 ft
- ADU module sizes: 16×37.5, 32×37.5, 16×45, 16×52.5 ft
- Nearby bbox pad: 0.0012° (~130 m)

---

## PlanBuilder — Geometry Engine

`PlanBuilder.BuildAsync` is the core computation. It operates entirely in a **local feet coordinate system** derived from the parcel.

### Coordinate system construction

1. **lon/lat → WebMercator (meters):** standard spherical Mercator projection
2. **Street alignment:** query OSM Overpass for the nearest road segment matching `streetName`. Compute the tangent direction of the closest segment to the parcel center. Use that as the alignment angle (`angleRad`).  
   - Fallback: if no road found, use the longest parcel edge direction.
3. **Rotation:** rotate all coordinates by `angleRad` so the street runs horizontally
4. **Normalize to ft:** subtract bbox min, convert m→ft. The result is a local coordinate system where:
   - `x=0, y=0` is the top-left corner of the parcel bounding box
   - `y` increases downward (street side is at `y ≈ 0`)
5. **Orientation check:** if the nearest road point or house centroid ends up in the lower half after rotation, flip 180° so the front (street) is always at top

### Building classification

For each building in `subjectBuildings`:
- Transform to local ft
- Classify as **on-parcel** if building centroid is inside the lot polygon AND ≥80% of the building area overlaps the lot
- Deduplicate by center proximity and area similarity
- Apply NMS (non-maximum suppression) to remove bounding-box duplicates with ≥75% overlap
- Infer role from OSM/city `building` / `type` / `use` properties: `house` or `garage`
- If no explicit role, the largest non-garage structure becomes `house`; the second-largest structure behind the house (by y-position) becomes `garage`

### Buildable zone computation

Starting from the raw lot rectangle, apply:

1. **Policy setbacks:** clip to `[sideSetbackFt, width-sideSetbackFt] × [frontSetbackFt, height-rearSetbackFt]`
2. **Structure override:** if existing buildings extend beyond the setback lines (e.g., a garage closer to the property line than the rule allows), expand the allowed zone to accommodate them
3. **Driveway corridor:** if a garage is identified, compute a 10 ft-wide corridor from the garage to the front yard using:
   - Erode free space by 5 ft (ensures 10 ft clearance)
   - A* pathfinding on a 1 ft grid through the eroded space
   - Buffer the found path back to 5 ft half-width, union with garage apron and front yard strip
4. **Obstacle subtraction:** subtract house polygon, garage polygon, driveway corridor polygon, and any other on-parcel structures from the lot polygon using NTS `Difference`
5. **Narrow area cleanup:** remove fragments too small to be useful
6. **Output:** `BuildablePolygon` (possibly a MultiPolygon with holes), plus `CutoutsFt` list describing each excluded zone with a `reason` label (setback-front, setback-rear, setback-side-left, setback-side-right, house-separation, driveway)

### ADU placement area

To guarantee an ADU of size `w×h` never extends outside the buildable area regardless of rotation:
- Compute the circumscribed circle radius `r = 0.5 × √(w²+h²)`
- Inset the buildable geometry by `-r` using NTS `BufferOp`
- Convert back to lon/lat GeoJSON

### Rotation for the frontend

After `BuildPlanAsync`, `ComputeRotationDegFromNearbyRoads` re-derives the map rotation angle from `nearbyRoads` (which is the actual data the frontend renders), not from the Overpass query inside PlanBuilder. This prevents a mismatch where PlanBuilder uses one road segment and the frontend renders a slightly different set.

The algorithm:
1. Find the road that best matches `streetName` (normalized: abbreviate directions/suffixes)
2. Pick the road segment closest to the parcel centroid
3. `rotationDeg = -atan2(dy, dx)` in screen coordinates (Y down)
4. Normalize to a "directionless axis" (treat 0° and 180° as the same line direction)
5. Flip +180° if the road is below the parcel center (ensures front-at-top)

---

## AI Enrichment (`LookupAiParcelInfoHelper`)

When `Ai:Enabled = true` in config:

1. Fetch official ArcGIS zoning/parcel attribute endpoints for the state (allowlisted per state)
2. Scrape and clean the JSON responses (extract zoning/land-use relevant fields only)
3. Call the configured LLM (OpenAI-compatible API) with:
   - System prompt instructing bilingual (zh/en) output
   - Parcel properties from the provider
   - Computed lot dimensions from the plan
   - External ArcGIS/assessor content
4. Parse the JSON response; fall back to plan-derived values for any missing fields
5. If AI is disabled or fails, return plan-derived fallback values (lot area from polygon, dimensions from bbox, existing unit count from structure count)

Config keys: `Ai:Enabled`, `AI:DefaultProvider`, `AI:Upstreams[].Provider/BaseUrl/Model/ApiKey`, `Ai:LookupTimeoutSeconds`

---

## Key Data Models

```
SiteLookupResponse
  ├─ SiteRequestInfo        (address, lang)
  ├─ SiteRegionInfo         (provider, city, state, lat, lon, streetName)
  ├─ GeoJsonFeature         subjectParcel
  ├─ GeoJsonFeatureCollection subjectBuildings
  ├─ GeoJsonFeatureCollection nearbyParcels / nearbyBuildings / nearbyRoads
  ├─ SiteComputed
  │    ├─ double            rotationDeg
  │    ├─ SiteSetbacks      setbacksFt  (front/rear/sideLeft/sideRight/houseSep)
  │    ├─ List<SiteStructure> subjectStructures / nearbyStructures
  │    ├─ SitePolygonFt     buildablePolygonFt  (points + optional holes)
  │    ├─ GeoJsonFeature?   buildableArea       (lon/lat)
  │    ├─ GeoJsonFeature?   aduPlacementArea    (lon/lat)
  │    ├─ GeoJsonFeatureCollection? cutouts
  │    ├─ SitePolygonFt?    drivewayCorridorFt
  │    ├─ List<SiteAduFit>  aduFits  [{w, h, canFit}]
  │    └─ List<SiteMeasureLineFt> rulerLinesFt
  ├─ SiteParcelInfo         (lotAreaSqft)
  └─ LookupAiParcelInfo     (zoning, lotArea, lotDimensions, heightLimit,
                             existingUnits, utilityAccess, setbacks — all bilingual)
```

Internal plan model (`LookupPlan`, not exposed directly):
```
LookupPlan
  ├─ LookupLot           (widthFt, heightFt, polygon in ft)
  ├─ List<LookupStructure> structures  (role, rectFt, polygonFt, areaSqft)
  ├─ FtRect              buildableZone  (fallback bbox)
  ├─ List<FtPoint>       buildablePolygon  (outer ring)
  ├─ List<List<FtPoint>> buildableRings   (outer + holes)
  ├─ List<List<List<FtPoint>>> buildableMultiRings  (for MultiPolygon)
  ├─ List<LookupCutoutArea>   cutoutsFt
  ├─ LookupModule        module  (default ADU size)
  ├─ bool                canFitAdu
  ├─ double              rotationDeg  (plan's internal angle, not the map rotation)
  └─ LookupPlanTransform (centerMercX/Y, minRotX, maxRotY, angleRad — for ft↔lonlat)
```

---

## External Dependencies

| Dependency | Purpose |
|------------|---------|
| **NetTopologySuite** | All polygon operations: Intersection, Difference, Buffer, Union, validity repair |
| **OSM Overpass API** | Buildings and roads within the parcel bbox |
| **ArcGIS REST APIs** | Official parcel data (region-specific), nearby parcels, zoning attributes |
| **LLM API** (OpenAI-compatible) | Parcel info enrichment (optional) |

---

## File Map

```
server-dotnet/XBuildApi/
  Program.cs                          — startup, DI, HttpClient registration
  Controllers/
    LookupController.cs               — /api/lookup pipeline + ComputeComputed
    GeocodeController.cs              — /api/geocode, /api/suggest
    TilesController.cs                — OSM tile proxy
    StreetViewController.cs           — street view proxy
    HealthController.cs               — /api/health
  IncentivesController.cs             — /api/incentives
  SubmissionsController.cs            — /api/submissions
  Site/
    ISiteRegionAdapter.cs             — region adapter interface + RegionPolicy
    RegionAdapters.cs                 — Seattle / NewYork / NewJersey adapters + SiteRegionResolver
    SiteModels.cs                     — SiteLookupRequest/Response, SiteComputed, GeoJSON types
    OverpassRoadService.cs            — road queries via Overpass
  Lookup/
    PlanBuilder.cs                    — core geometry engine
    LookupModels.cs                   — LookupPlan, LookupStructure, FtPoint, FtRect, …
    LookupUtils.cs                    — address parsing (state extraction)
    GeoJsonUtils.cs                   — GeoJSON helpers (ring extraction, centroid)
    OsmBuildingsService.cs            — building queries via Overpass
    AiAduPlanner.cs                   — AI-based ADU planning suggestions
    Providers/
      ILookupProvider.cs              — provider interface
      SeattleOfficialLookupProvider.cs
      NewYorkOfficialLookupProvider.cs
      NewJerseyOfficialLookupProvider.cs
      RegridLookupProvider.cs         — fallback/alternative parcel data source
  IncentiveResearchService.cs         — incentive research
  SubmissionStore.cs                  — in-memory submission store
```
