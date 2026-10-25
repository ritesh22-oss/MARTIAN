---
name: Ares Telemetry
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#e1bfb5'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#a88a81'
  outline-variant: '#59413a'
  surface-tint: '#ffb59d'
  primary: '#ffb59d'
  on-primary: '#5d1800'
  primary-container: '#f06536'
  on-primary-container: '#521400'
  inverse-primary: '#ab3504'
  secondary: '#ffb955'
  on-secondary: '#452b00'
  secondary-container: '#dc9100'
  on-secondary-container: '#4f3100'
  tertiary: '#00daf3'
  on-tertiary: '#00363d'
  tertiary-container: '#009fb2'
  on-tertiary-container: '#002f35'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59d'
  on-primary-fixed: '#390b00'
  on-primary-fixed-variant: '#842500'
  secondary-fixed: '#ffddb4'
  secondary-fixed-dim: '#ffb955'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#633f00'
  tertiary-fixed: '#9cf0ff'
  tertiary-fixed-dim: '#00daf3'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004f58'
  background: '#10131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  title-md:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 9px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.12em
spacing:
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system serves deep-space exploration operators, orbital analysts, and planetary scientists commanding robotic assets on Mars. The visual personality balances extreme instrumental precision, mission-critical clarity, and utilitarian restraint. The emotional tone must evoke absolute reliability under high-stakes conditions: calm, vigilant, scientific, and uncompromised.

The aesthetic fuses deep tactical glassmorphism with high-density scientific instrumentation:
- **Atmospheric Void:** Deep obsidian and cold deep-space navy canvases preserve operator dark adaptation during low-light mission control cycles.
- **Glassmorphic Sensor Planes:** Layered translucent telemetry visors feature ultra-subtle frosted refraction, retaining spatial awareness across multi-tiered telemetry feeds without clutter.
- **Instrumental Accents:** Mars regolith rust-orange serves as primary mission alert, targeted acquisition, and waypoint focus, while telemetry amber handles real-time delta updates, power allocations, and atmospheric sensor readouts.
- **Aerospace Heads-Up Display (HUD):** Precision reticles, crosshairs, tick marks, and coordinate brackets anchor dense scientific graphs, spectral sweeps, and orbital trajectory paths.

## Colors

The chromatic structure prioritizes immediate signal discrimination against an unforgiving deep-space background. 

- **Primary (`#E05A2B` - Martian Regolith Rust):** Used for target lock, critical trajectory paths, rover drive commands, and primary focus boundaries. It commands visual priority across dark field monitors.
- **Secondary (`#F5A623` - Telemetry Amber):** Indicates dynamic stream states, sensor warnings, solar array efficiencies, thermal warnings, and real-time numerical streams.
- **Tertiary (`#00E5FF` - Ion Radiance Cyan):** Dedicated to uplink/downlink communication vectors, LIDAR distance vectors, optical depth readouts, and active orbital lines.
- **Neutral (`#0B0E14` - Obsidian Void):** Base ground layer, with steps up through deep navy tiers (`#101622`, `#161F30`, `#1E2A40`) for glassmorphic visual tiering.

Semantic states strictly use pure optical frequencies:
- **Nominal / Nominal Track:** `#10B981` (Phosphor Emerald)
- **Anomaly / Thermal Override:** `#EF4444` (Critical Alert Red)
- **Signal Standby / Parity Check:** `#8B949E` (Starlight Muted)

## Typography

Typography functions as an analytical instrument. Space Grotesk provides geometric, structural authority for high-level sector titles, module banners, and Sol day counters. JetBrains Mono enforces columnar alignment across streaming metrics, telemetry loggers, spectral readings, and coordinates.

- All numerical telemetry streams, coordinates, and timestamp logs must render with tabular figures (`tnum`) and slashed zeros where supported.
- Micro-labels, system statuses, and reticle coordinate markers utilize uppercase styling with expanded letter-spacing (`0.08em` to `0.12em`) to ensure legibility on low-lit or dense displays.
- Heading scales on mobile are strictly clamped to prevent line wrapping of contiguous telemetry code strings and sol indicators.

## Layout & Spacing

This design system uses a high-density, multi-panel fluid grid that adapts dynamically across ultrawide mission operations consoles, field tablets, and secondary tactical screens.

- **Grid Architecture:** Desktop views operate on a 12- or 24-column modular dynamic grid with tight `0.75rem` or `1rem` gutters, maximizing spatial density without occlusion. Side rails hold fixed-width command queues (`320px` to `400px`), while spatial visualization maps and live sensor streams expand fluidly into the primary canvas.
- **Responsive Adaptations:**
  - **Desktop (1440px+):** Persistent multi-pane arrangement. HUD reticles anchor the primary viewport; satellite downlinks, telemetry timelines, and thermal readings occupy dedicated split tiles.
  - **Tablet / Tactical Displays (768px - 1439px):** Secondary telemetry banks collapse into docked bottom drawers and side-collapsible trays. Margin drops to `1rem`.
  - **Mobile / Field Communicator (<768px):** Single-column stack. Heavy sensor matrices convert to tabbed swappable readouts. Spatial feeds prioritize target crosshairs and critical rover subsystem alerts.

## Elevation & Depth

Visual hierarchy does not rely on traditional fuzzy dropshadows; deep space renders shadows invisible. Instead, separation is achieved through glassmorphism, surface luminosity, and razor-sharp spectral outlines.

- **Base Void (Level 0):** `#0B0E14` solid background representing the unlit expanse.
- **Glass Panel Surface (Level 1):** `rgba(16, 22, 34, 0.65)` with `backdrop-filter: blur(12px)`. Outlined with a fine, low-opacity technical stroke: `1px solid rgba(255, 255, 255, 0.08)`.
- **Active Telemetry Module (Level 2):** `rgba(22, 31, 48, 0.75)` with `backdrop-filter: blur(16px)`. Border uses a dual-tone edge: top and left bordered with `rgba(224, 90, 43, 0.35)` to simulate an angled directional light source from solar panels or local HUD projection.
- **Critical Acquisition / Modal Overlay (Level 3):** `rgba(11, 14, 20, 0.90)` with `backdrop-filter: blur(24px)`. Encased in an active reticle bracket with corner ticks (`#E05A2B` or `#00E5FF`).
- **Glow Accents:** Focused interactive points (such as sensor anomalies, target lock nodes, and telemetry spikes) emit a localized outer glow: `box-shadow: 0 0 16px -2px rgba(224, 90, 43, 0.45)`.

## Shapes

The interface embraces a stark, militaristic, and scientific industrial aesthetic:
- **Sharp Geometry (`roundedness: 0`):** All containers, diagnostic panels, buttons, tabs, and data tables feature strictly unrounded 90-degree corners.
- **Chamfered Notches:** High-priority cards, modal headers, and HUD viewfinders feature `4px` to `8px` angled chamfers (clipped corners via CSS `clip-path`) on opposite diagonals (top-right and bottom-left) to echo avionics chassis and spaceflight telemetry modules.
- **Reticle Line Accents:** Panels incorporate technical corner brackets, calibration tick-marks, and horizontal micro-rulers along borders to reinforce instrumentation authenticity.

## Components

### Buttons & Command Triggers
- **Primary Execution (Fire/Uplink):** Background `#E05A2B`, text `#0B0E14`, font JetBrains Mono bold uppercase. 1px border `#F5A623`. On hover: saturated orange fill with `0 0 14px rgba(224, 90, 43, 0.6)` radiance.
- **Secondary / Abort / Subsystem:** Background `rgba(16, 22, 34, 0.8)`, text `#F5A623`, border `1px solid rgba(245, 166, 35, 0.4)`. Sharp 90-degree edges with uppercase tracking.
- **HUD Reticle Buttons:** Transparent fill, corner bracket borders (`3px` tick lines at corners), text `#00E5FF`.

### Chips & Status Indicators
- Sharp rectilinear badges (`padding: 2px 6px`).
- Inactive: Background `rgba(255, 255, 255, 0.05)`, text `#8B949E`, border `1px solid rgba(255, 255, 255, 0.1)`.
- Active Nominal: Background `rgba(16, 185, 129, 0.15)`, text `#10B981`, border `1px solid #10B981`.
- Uplink Active: Background `rgba(0, 229, 255, 0.15)`, text `#00E5FF`, border `1px solid #00E5FF`.

### Lists & Telemetry Logs
- Alternating subtle rows using `rgba(255, 255, 255, 0.015)` and `transparent`.
- Monospace-aligned metadata columns: Timestamp (`UTC` / `Sol`), Subsystem Code, Hex Memory Address, Parameter Value.
- Alert lines highlight the left border with a solid `2px` strip of `#E05A2B` or `#EF4444`.

### Checkboxes & Toggle Switches
- Checkboxes are square, zero-radius inputs (`14px x 14px`) with `1px solid rgba(255, 255, 255, 0.3)`. Checked state displays a solid inner amber diamond or `#E05A2B` center block with no smooth morphing.
- Toggles utilize segmented dual-state buttons (`ENGAGED` / `DISENGAGED`) rather than standard consumer sliding pills.

### Input Fields & Vector Controls
- Rectangular input chassis with obsidian fill (`rgba(11, 14, 20, 0.95)`), `1px solid rgba(255, 255, 255, 0.15)`.
- Focused state transitions border to `#00E5FF` with an immediate zero-transition inner tint.
- Units (e.g., `rad/s`, `AU`, `dBm`, `Kelvin`) sit statically docked on the right side in muted amber JetBrains Mono.

### Cards & Telemetry Visors
- Frosted glass bodies with corner tick marks (`L`-shaped line segments on container perimeters).
- Header bar includes a technical ID index (`MOD-702 // SPECTRAL_ANALYSIS`) in `label-sm` font followed by a `1px` horizontal separator rule across the panel.

### Specialized Aerospace Modules
- **HUD Target Reticles:** Concentric optical rings with 4-axis crosshairs, rotating degree compass notches, and real-time Martian target coordinate lockouts.
- **Spectrum Sweeper / Telemetry Gauges:** Stepped segmented bars instead of continuous smooth gradients, visualizing solar arrays, radiation flux, and atmospheric methane ppm.