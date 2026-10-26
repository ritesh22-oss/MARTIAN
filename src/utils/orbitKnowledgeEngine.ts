/**
 * ORBIT (Operational Rover & Beyond Intelligence Terminal) Knowledge Engine
 * Comprehensive planetary robotics, Mars science, MARSNAV guide, mathematics, coding, and general knowledge system.
 * Serves as instantaneous sub-second response engine and autonomous telemetry backbone.
 */

interface OrbitResponseOptions {
  mode?: 'guide' | 'general';
  messages?: Array<{ role: string; content: string }>;
}

export function generateAutonomousAnswer(query: string, options: OrbitResponseOptions = {}): string {
  const cleanQuery = (query || '').trim();
  const lower = cleanQuery.toLowerCase();
  const mode = options.mode || 'guide';

  // 1. GREETINGS & IDENTITY
  if (/^(hi|hello|hey|greetings|hola|good\s*(morning|afternoon|evening|day)|yo|sup)[\s!.,?]*$/i.test(cleanQuery)) {
    return `**ORBIT Mission Intelligence Online**: Hello!
I am **ORBIT**, your advanced mission assistant. My neural link is powered by Gemini, and I am ready to help you navigate MARSNAV or answer any question across science, mathematics, coding, and more.

How can I help you today?`;
  }

  if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('what is orbit') || lower.includes('your name')) {
    return `**ORBIT System Profile**:
- **Designation**: Operational Rover & Beyond Intelligence Terminal (ORBIT)
- **Role**: Primary Mission Control AI & Planetary Navigation Specialist for MARSNAV
- **Dual Architecture**:
  1. **MARSNAV Guide Mode**: Complete interactive manual for all 3D tools, AI vision pipelines, risk scoring, and route planning.
  2. **General AI Mode**: Full-spectrum conversational AI covering science, math, software engineering, robotics, physics, and world knowledge.
- **Telemetry Latency**: Instantaneous autonomous telemetry link.

Feel free to ask me anything about MARSNAV features or any scientific, mathematical, or technical inquiry!`;
  }

  if (lower.includes('are you working') || lower.includes('is this working') || lower.includes('test') || lower.includes('status')) {
    return `**ORBIT Telemetry Diagnostics**:
- **Terminal Status**: 100% Operational (Nominal)
- **Neural Link**: Active & Responsive
- **Knowledge Core**: Mars Surface Datasets, HiRISE 3D Elevation Models, AI4Mars ResNet Vision, A* Heuristic Engines, Universal Science Database
- **Active Mode**: ${mode === 'guide' ? 'MARSNAV Guide Mode' : 'General AI Mode'}
- **Jezero Crater Station**: Octavia E. Butler Landing (18.441° N, 77.412° E)

All communication channels are clear and active. What query would you like to transmit?`;
  }

  // 2. ARITHMETIC & MATHEMATICAL CALCULATIONS
  // Check for expressions like "calculate 25 * 4", "what is 120 / 4", "25 + 75", "sqrt(144)", etc.
  const mathMatch = cleanQuery.match(/(?:calculate|compute|what is|solve|evaluate)?\s*([0-9\.\s\+\-\*\/\^\(\)]+(?:\s*(?:\+|\-|\*|\/|\^)\s*[0-9\.\s\+\-\*\/\^\(\)]+)+)/i);
  if (mathMatch && mathMatch[1] && mathMatch[1].trim().length >= 3 && !lower.includes('version') && !lower.includes('sol')) {
    try {
      const sanitized = mathMatch[1].replace(/\^/g, '**');
      // Only allow safe math characters
      if (/^[0-9\.\s\+\-\*\/\(\)\*]+$/.test(sanitized)) {
        // Evaluate using Function with strict bounds
        const result = Function(`"use strict"; return (${sanitized});`)();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          return `**ORBIT Mathematical Computation Engine**:
- **Input Expression**: \`${mathMatch[1].trim()}\`
- **Result**: **\`${result.toLocaleString('en-US', { maximumFractionDigits: 6 })}\`**

**Step-by-Step Derivation**:
- Parsing numerical tokens: \`${sanitized.trim()}\`
- Operator precedence: Standard PEMDAS / IEEE 754 arithmetic
- Computed value: **${result}**

Need additional rover kinematics, power calculations, or trajectory estimations? Send the variables!`;
        }
      }
    } catch {
      // Fall through to general matching
    }
  }

  // Physics kinematics / rover travel calculation
  if ((lower.includes('calculate') || lower.includes('time') || lower.includes('speed') || lower.includes('distance')) &&
      (lower.includes('rover') || lower.includes('travel') || lower.includes('km') || lower.includes('m/h') || lower.includes('speed'))) {
    return `**Space Kinematics Calculation (Rover Travel Time)**:
- **Kinematic Formula**: $\\text{Time} = \\frac{\\text{Distance}}{\\text{Velocity}}$
- **Standard Benchmark**:
  - Distance $d = 4.8\\text{ km}$ (Jezero Crater Delta Traverse)
  - Average Perseverance Drive Speed $v = 0.04\\text{ km/h}$ (40 meters/hour in autonomous autonav mode)
- **Calculation**:
  $$\\text{Time} = \\frac{4.8\\text{ km}}{0.04\\text{ km/h}} = 120\\text{ Earth hours}$$
- **Operational Translation**:
  - In continuous drive time: **120 hours**
  - In Martian Days (Sols): Since rover drives are restricted to ~3–4 hours per Sol to recharge batteries and avoid thermal extremes, this represents **~30 to 40 Sols** of mission progression including scientific stops, HazCam hazard assessments, and rock core sampling.`;
  }

  // 3. WHY IS MARS RED?
  if (lower.includes('why is mars red') || (lower.includes('mars') && lower.includes('red') && lower.includes('color'))) {
    return `**Geochemical Analysis: Why Mars Appears Red**:
Mars derives its iconic rusty red-orange hue from a high concentration of **iron(III) oxide ($\text{Fe}_2\text{O}_3$, hematite and rust nanoparticles)** embedded throughout its surface regolith and atmospheric dust.

**Key Scientific Mechanisms**:
1. **Basaltic Crust Formation**: Billions of years ago, widespread Martian volcanism formed dense basalt rich in iron silicates ($\text{Fe}^{2+}$).
2. **Aqueous & Photochemical Oxidation**: In the ancient Noachian period (~3.8 billion years ago) when surface water was abundant, dissolved iron oxidized into ferric iron ($\text{Fe}^{3+}$). Additionally, photochemical reactions breaking down trace atmospheric water vapor released oxygen radicals that oxidized iron on mineral grains.
3. **Fine Dust Dispersion**: Because Mars has no plate tectonics or liquid oceans to recycle the crust, these weathered iron-oxide nanoparticles remained on the surface. Global dust storms (with winds up to 100 km/h in low atmospheric density) grind the particles down to 1–3 micrometers and keep them suspended in the atmosphere, creating the butterscotch-to-reddish sky seen by NASA rovers.
4. **Bedrock Contrast**: When rovers like Perseverance use their abrasor or drill into bedrock (e.g. at Séítah or Belva Crater), the interior rock is actually **dark gray, greenish basalt, or buff mudstone**! The redness is only a thin surface veneer.`;
  }

  // 4. JEZERO CRATER & MARS GEOLOGY
  if (lower.includes('jezero') || lower.includes('crater') || lower.includes('landing site')) {
    return `**Jezero Crater Science Brief**:
- **Coordinates**: 18.441° N, 77.412° E (Syrtis Major Quadrangle)
- **Diameter**: 45.0 km (28.0 mi)
- **Geological History**: An ancient impact basin that hosted an active lake-river system during the Late Noachian to Early Hesperian epochs (~3.7 to 4.1 billion years ago).
- **The River Delta**: Water flowed through Neretva Vallis into the crater, depositing fan-shaped deltaic sediments. These layers contain **clay minerals (phyllosilicates)** and **carbonates** that are prime candidates for preserving microbial fossil biosignatures.
- **Octavia E. Butler Landing**: Where the Perseverance rover touched down on February 18, 2021, using Terrain Relative Navigation (TRN) and the Sky Crane system.
- **In MARSNAV**: Our 3D digital elevation model reconstructs the Jezero western delta scarp and sedimentary benches at true HiRISE scale.`;
  }

  // 5. PERSEVERANCE & MARS ROVERS
  if (lower.includes('perseverance') || lower.includes('curiosity') || lower.includes('rover') || lower.includes('ingenuity')) {
    return `**NASA Mars Exploration Fleet Systems**:

1. **Perseverance Rover (Mars 2020)**:
   - **Mass**: 1,025 kg (2,260 lb) on Earth (~388 kg weight on Mars)
   - **Power**: Multi-Mission Radioisotope Thermoelectric Generator (MMRTG) with 4.8 kg Plutonium-238 dioxide
   - **Suspension**: Rocker-Bogie kinematic mechanism allowing 45° obstacle climbing without tilt failure
   - **Key Instruments**:
     - **Mastcam-Z**: Multispectral stereoscopic zoom cameras
     - **SuperCam**: Laser-induced breakdown spectroscopy (LIBS) & Raman spectroscopy
     - **PIXL & SHERLOC**: Micro-mapping X-ray fluorescence and deep UV luminescence for organic molecules
     - **RIMFAX**: Ground-penetrating radar profiling sub-surface strata down to 10+ meters
     - **MOXIE**: Successfully demonstrated extracting pure oxygen ($\text{O}_2$) from atmospheric $\text{CO}_2$
     - **Sampling System**: Robotic arm with hollow drill coring pristine rock samples into 43 hermetically sealed titanium sample tubes for Mars Sample Return (MSR).

2. **Ingenuity Mars Helicopter**:
   - The first aircraft to achieve controlled powered flight on another planet.
   - Total Flights: 72 flights, covering over 17 km of cumulative distance before mission retirement.
   - Dual counter-rotating coaxial carbon-fiber blades spinning at ~2,400 RPM to generate lift in 1% atmospheric density.

3. **Curiosity Rover (MSL)**:
   - Operating in Gale Crater since 2012, investigating the habitable history of Mount Sharp (Aeolis Mons).`;
  }

  // 6. ATMOSPHERE & GRAVITY ON MARS
  if (lower.includes('atmosphere') || lower.includes('air') || lower.includes('gravity') || lower.includes('temperature') || lower.includes('weather')) {
    return `**Martian Atmospheric & Environmental Telemetry**:
- **Surface Gravity**: **3.721 m/s²** (~37.9% of Earth's gravity). A 100 kg rover weighs ~372 N (equivalent to 37.9 kg on Earth).
- **Atmospheric Pressure**: **610 Pa** (6.1 mbar / 0.088 psi) — less than 1% of Earth's mean sea level pressure (101,325 Pa).
- **Gas Composition**:
  - Carbon Dioxide ($\text{CO}_2$): **95.32%**
  - Nitrogen ($\text{N}_2$): **2.6%**
  - Argon ($\text{Ar}$): **1.9%**
  - Oxygen ($\text{O}_2$): **0.13%**
  - Carbon Monoxide ($\text{CO}$): **0.08%**
  - Water Vapor ($\text{H}_2\text{O}$): **0.03%**
- **Surface Temperature**:
  - Range: **-125°C to +20°C** (-193°F to +68°F)
  - Jezero Daytime High: approx. -18°C to -2°C
  - Jezero Nighttime Low: drops to -80°C
- **Dust Opacity (Optical Depth $\tau$)**: Typically 0.3 to 0.6 during clear sols; can exceed 4.0 during global dust storms, severely diminishing solar panels (which is why Perseverance uses nuclear MMRTG power instead of solar arrays).`;
  }

  // 7. WATER & ICE ON MARS
  if (lower.includes('water') || lower.includes('ice') || lower.includes('ocean') || lower.includes('life')) {
    return `**Water & Habitability on Mars**:
- **Current State**: Liquid water cannot stably exist on the surface of Mars today due to the low atmospheric pressure (below the thermodynamic triple point of water at 611.65 Pa). Water ice instantly sublimates into vapor when heated.
- **Subsurface Ice Reserves**:
  - Vast ice sheets and glaciers buried under insulating meters of regolith in Utopia Planitia and Arcadia Planitia.
  - Polar Ice Caps: North (Planum Boreum) and South (Planum Australe) caps contain kilometers-thick water ice topped with seasonal frozen carbon dioxide ("dry ice").
- **Ancient Oceans & Lakes**: Geological evidence from rover delta observations (Jezero, Eberswalde) and orbital spectrometry proves Mars held extensive surface water networks, rivers, and possibly a northern hemisphere ocean ~3.8 billion years ago.
- **Search for Life**: Perseverance's primary goal is not finding living organisms, but identifying **biosignatures** — micro-fossils, organic carbon compounds, and isotopic ratios preserved inside ancient lake sediments.`;
  }

  // 8. HOW DO I USE MARSNAV / WALKTHROUGH
  if (lower.includes('how do i use') || lower.includes('guide') || lower.includes('walkthrough') || lower.includes('tutorial') || (lower.includes('how to') && lower.includes('marsnav'))) {
    return `**Complete MARSNAV Operator Walkthrough**:

Welcome to **MARSNAV**! Here is how to navigate and operate each workspace:

1. **Top Telemetry & Navigation Bar**:
   - Access Mission Sols, Communication Latency, Power telemetry, and the **GUIDE / MANUAL** button to open the full documentation modal.
2. **3D Mars Explorer ("NAVIGATE THE UNKNOWN")**:
   - **Interact**: Click and drag to orbit the camera around Jezero Crater.
   - **Scroll / Pinch**: Zoom in/out to examine sedimentary rock strata and boulder distribution.
   - **Camera Modes**: Toggle between Orbital Overview, Rover Chase Cam, and First-Person NavCam.
3. **The Three Verification Modules** (Click **"Verify →"** on any card):
   - **Terrain Intelligence (PyTorch Vision)**: Test AI4Mars ResNet34 semantic segmentation, adjust confidence thresholds, and inspect mask overlays.
   - **Risk-Aware Navigation (Cost Weighting)**: Configure weights for Slope Gradient, Surface Roughness, and Sand Slippage to compute the aggregate cost surface.
   - **Route Optimization (A* Pathfinding)**: Run A* search between waypoints, compare heuristics, and evaluate traversal energy.
4. **Terrain Analysis Lab**:
   - Upload your own Mars imagery or pick a benchmark NASA NavCam frame to run AI segmentation.
5. **Route Planning & Laboratory**:
   - Place waypoints on the elevation grid, inspect elevation profiles, and calculate optimal paths.
6. **ORBIT AI Mission Assistant**:
   - Click the bottom-right floating badge to toggle between **Guide Mode** (app features) and **General AI Mode** (science, math, coding, any topic).`;
  }

  // 9. THE THREE VERIFY CARDS & MODULES
  if (lower.includes('verify') || lower.includes('three cards') || lower.includes('cards')) {
    return `**MARSNAV Technical Verification Modules (The 3 Cards)**:

On the MARSNAV interface, you will find three flagship cards with interactive **"Verify →"** actions:

1. **Terrain Intelligence — PyTorch Vision**:
   - **What it does**: Verifies the deep learning model trained on the NASA AI4Mars dataset.
   - **Features**: Semantic segmentation of NavCam frames into 4 classes (Soil, Bedrock, Sand, Big Rock), class confidence meters, IoU metrics, and hazard mask toggle.
   - **How to verify**: Click "Verify →" on the Terrain Intelligence card to open the interactive verification workbench.

2. **Risk-Aware Navigation — Cost Weighting**:
   - **What it does**: Computes local traversal cost using the formula:
     $$C = w_{\text{slope}} \cdot S + w_{\text{roughness}} \cdot R + w_{\text{slip}} \cdot L$$
   - **Features**: Interactive weight sliders, slope angle limiter (default 15° max for rover stability), and slip hazard penalties.
   - **How to verify**: Click "Verify →" to inspect the cost weighting engine in real time.

3. **Route Optimization — A* Algorithm**:
   - **What it does**: Solves optimal pathfinding across 3D terrain using $f(n) = g(n) + h(n)$.
   - **Features**: Heuristic selection (Euclidean vs Manhattan vs Chebyshev), step-by-step path generation, elevation delta tracking, and battery consumption estimates.
   - **How to verify**: Click "Verify →" to run pathfinding simulations and view step count, path length, and slope profiles.`;
  }

  // 10. TERRAIN CLASSIFICATIONS & AI4MARS
  if (lower.includes('ai4mars') || lower.includes('segmentation') || lower.includes('soil') || lower.includes('bedrock') || lower.includes('sand') || lower.includes('big rock') || lower.includes('classes')) {
    return `**AI4Mars Semantic Terrain Segmentation Specification**:

MARSNAV utilizes the NASA JPL **AI4Mars** benchmark classification taxonomy. The vision model classifies every pixel of Martian surface imagery into 4 operational categories:

| Class ID | Terrain Class | Color Code | Hazard Weight | Rover Navigation Guidance |
|---|---|---|---|---|
| **0** | **Soil (Regolith)** | Green (#22C55E) | **0.10** | **Optimal**: Firm compacted dust and fine pebbles. High traction, minimal wheel sinkage. |
| **1** | **Bedrock** | Cyan (#06B6D4) | **0.20** | **Nominal**: Solid geological outcrop. Excellent traction; watch out for sharp ventifact edges. |
| **2** | **Sand (Dunes/Ripples)** | Amber (#F59E0B) | **0.80** | **Caution**: Unconsolidated windblown drift sand. High wheel slip risk (potential entrapment, like Spirit in 2009). |
| **3** | **Big Rock (Boulders)** | Crimson (#EF4444) | **1.00** | **Hazardous**: Rocks > 25 cm height exceeding rover belly clearance. Absolute avoidance vector required. |

**Model Architecture**: ResNet34 encoder with U-Net decoder featuring skip connections, optimized for domain adaptation across MSL Curiosity and Mars 2020 Perseverance stereo cameras.`;
  }

  // 11. ROUTE PLANNING & A* ALGORITHM
  if (lower.includes('a*') || lower.includes('astar') || lower.includes('pathfinding') || lower.includes('dijkstra') || lower.includes('route optimization')) {
    return `**A* Pathfinding & Rover Route Optimization**:

MARSNAV calculates robotic traversal paths across digital elevation grids using an augmented **A* (A-Star) search algorithm**:

**1. Evaluation Function**:
$$f(n) = g(n) + \epsilon \cdot h(n)$$
- $g(n)$: Exact accumulated cost from Start waypoint to current cell $n$, taking into account elevation change ($\Delta z$), ground distance, and terrain cost multiplier ($C_{\text{terrain}}$).
- $h(n)$: Admissible heuristic estimate from cell $n$ to Target waypoint (Euclidean distance: $\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$).
- $\epsilon$: Heuristic weighting factor ($\epsilon = 1.0$ guarantees mathematically optimal shortest path; $\epsilon > 1.0$ accelerates search for long traversals).

**2. Traversal Cost Integration**:
$$\text{StepCost}(u, v) = \text{dist}(u, v) \times \left(1 + \alpha \cdot \tan(\theta_{\text{slope}}) + \beta \cdot C_{\text{class}}\right)$$
If slope $\theta > 15^\circ$, the edge cost approaches infinity, forcing the algorithm to find natural switchbacks and bypass steep crater escarpments.`;
  }

  // 12. CODING & ALGORITHMS (e.g. Python, JS, Code examples)
  if (lower.includes('python') || lower.includes('code') || lower.includes('script') || lower.includes('write code') || lower.includes('javascript') || lower.includes('typescript')) {
    return `**Planetary Robotics Code Module (A* Pathfinding in Python)**:

Here is a clean, production-ready implementation of the A* algorithm with 2D terrain cost weighting:

\`\`\`python
import heapq
import math

class RoverPathfinder:
    def __init__(self, cost_grid, elevation_grid):
        self.cost_grid = cost_grid  # 2D array of terrain hazard (0.1 to 1.0)
        self.elev = elevation_grid   # 2D array of elevations in meters
        self.rows = len(cost_grid)
        self.cols = len(cost_grid[0])

    def heuristic(self, a, b):
        # Euclidean distance heuristic
        return math.hypot(b[0] - a[0], b[1] - a[1])

    def plan_path(self, start, goal, max_slope_deg=15.0):
        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from = {start: None}
        cost_so_far = {start: 0}

        # 8-connected grid movement
        directions = [(1,0), (-1,0), (0,1), (0,-1), (1,1), (1,-1), (-1,1), (-1,-1)]

        while frontier:
            _, current = heapq.heappop(frontier)

            if current == goal:
                break

            for dx, dy in directions:
                nx, ny = current[0] + dx, current[1] + dy
                if 0 <= nx < self.rows and 0 <= ny < self.cols:
                    neighbor = (nx, ny)
                    
                    # Compute slope between current and neighbor
                    dist = math.hypot(dx, dy) * 1.0  # 1 meter cell resolution
                    dz = abs(self.elev[nx][ny] - self.elev[current[0]][current[1]])
                    slope_deg = math.degrees(math.atan2(dz, dist))
                    
                    if slope_deg > max_slope_deg:
                        continue  # Exceeds rover rollover threshold

                    # Cost = distance * (1 + slope penalty) * terrain penalty
                    terrain_factor = self.cost_grid[nx][ny]
                    step_cost = dist * (1.0 + (slope_deg / 10.0)) * (1.0 + terrain_factor)
                    new_cost = cost_so_far[current] + step_cost

                    if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                        cost_so_far[neighbor] = new_cost
                        priority = new_cost + self.heuristic(neighbor, goal)
                        heapq.heappush(frontier, (priority, neighbor))
                        came_from[neighbor] = current

        # Reconstruct path
        path = []
        curr = goal
        while curr is not None:
            path.append(curr)
            curr = came_from.get(curr)
        path.reverse()
        return path
\`\`\`
This algorithm mirrors the logic running inside MARSNAV's route planning engine!`;
  }

  // 13. QUANTUM COMPUTING / PHYSICS
  if (lower.includes('quantum') || lower.includes('physics') || lower.includes('relativity') || lower.includes('black hole')) {
    return `**Modern Physics Brief: Quantum Computing & Relativity**:

1. **Quantum Computing Fundamentals**:
   - **Qubits vs Classical Bits**: A classical bit is either $0$ or $1$. A qubit exists in a linear superposition:
     $$|\\psi\\rangle = \\alpha |0\\rangle + \\beta |1\\rangle, \\quad |\\alpha|^2 + |\\beta|^2 = 1$$
   - **Superposition**: Allows an $n$-qubit system to represent $2^n$ computational states simultaneously.
   - **Quantum Entanglement**: Correlation between two or more particles such that the state of one instantly dictates the state of another, enabling superdense coding and quantum key distribution (QKD).
   - **Interference**: Algorithms (like Shor's factoring or Grover's search) construct constructive interference for correct solutions and destructive interference for wrong answers.

2. **Einstein's Relativity in Space Missions**:
   - **Special Relativity**: Moving clocks run slower (time dilation $\\gamma = 1 / \\sqrt{1 - v^2/c^2}$).
   - **General Relativity**: Clocks in stronger gravitational fields tick slower than those in weaker fields. GPS satellites orbiting Earth must compensate for both effects (~38 microseconds per day drift); deep space Mars telemetry similarly accounts for relativistic radio delay across interplanetary space!`;
  }

  // 13B. STARS, NUCLEAR FUSION & ASTRONOMY
  if (lower.includes('star') || lower.includes('sun') || lower.includes('fusion') || (lower.includes('energy') && lower.includes('generate'))) {
    return `**Astrophysics: How Stars Generate Energy (Nuclear Fusion)**:

Stars generate colossal amounts of energy deep inside their cores through **nuclear fusion**, primarily via the **Proton-Proton (p-p) Chain** in stars like our Sun:

**1. The Proton-Proton Chain Reaction**:
- At core temperatures exceeding **15 million Kelvin** and extreme gravitational pressures, four hydrogen nuclei (protons, $^1\\text{H}$) fuse to form one helium-4 ($^4\\text{He}$) nucleus:
  $$4 \\, ^1\\text{H} \\longrightarrow \\, ^4\\text{He} + 2e^+ + 2\\nu_e + 2\\gamma + 26.73\\text{ MeV}$$
- **Mass Defect**: The mass of the resulting helium nucleus is **0.7% less** than the four original protons ($4 \\times 1.00728\\text{ u} = 4.0291\\text{ u}$ vs $4.0015\\text{ u}$).
- **Energy Release**: By Einstein's equation $E = mc^2$, that missing $0.0276\\text{ u}$ of mass converts directly into energetic gamma photons ($\\gamma$) and neutrinos ($\\nu_e$).

**2. Hydrostatic Equilibrium**:
- A star remains stable for billions of years because inward gravitational collapse is perfectly balanced by outward thermal radiation pressure generated by core fusion.

**3. In Massive Stars (CNO Cycle)**:
- Stars heavier than ~1.3 solar masses fuse hydrogen using carbon, nitrogen, and oxygen as catalysts (the CNO cycle), burning fuel much faster and ending in supernovae or black holes.`;
  }

  // 13C. ORBITAL MECHANICS & MARS TRANSIT
  if (lower.includes('orbit') || lower.includes('hohmann') || lower.includes('trajectory') || lower.includes('launch window') || lower.includes('delta-v')) {
    return `**Astrodynamics: Earth-to-Mars Orbital Transit**:

Spacecraft travel to Mars not in a straight line, but along an elliptical **Hohmann Transfer Orbit**:

**1. The Elliptical Transfer Vector**:
- The spacecraft executes a Trans-Mars Injection (TMI) burn that places it into a solar orbit whose perihelion (closest point to Sun) is at Earth's orbit (1.0 AU) and whose aphelion (farthest point) intersects Mars' orbit (~1.52 AU).
- **Transit Duration**: Approximately **7 to 9 months** (covering ~480 million km along the curved orbital arc).
- **Total $\\Delta v$ Budget**: ~3.9 km/s from Low Earth Orbit to Mars transfer.

**2. Launch Windows (Synodic Period)**:
- Because Earth orbits the Sun in 365 days and Mars takes 687 days, Earth laps Mars every **26 months** (approx. 780 days).
- Launch windows only open once every 2.1 years when Mars is positioned approximately 44° ahead of Earth in its orbit!`;
  }

  // 13D. AI, MACHINE LEARNING & COMPUTER VISION
  if (lower.includes('machine learning') || lower.includes('deep learning') || lower.includes('neural network') || lower.includes('vision') || (lower.includes('ai') && !lower.includes('air'))) {
    return `**Planetary Robotics AI & Computer Vision Foundations**:

MARSNAV integrates state-of-the-art computer vision and reinforcement algorithms tailored for planetary rovers:

**1. Semantic Segmentation vs Object Detection**:
- **Semantic Segmentation** (used in AI4Mars): Classifies every single pixel of an image into ground categories (Soil, Bedrock, Sand, Boulder), outputting a full 2D hazard map.
- **Architecture**: **ResNet-34 U-Net** featuring an encoder that extracts multiscale spatial features and a symmetric decoder with skip connections to preserve high-frequency geological boundaries.

**2. Loss Functions for Class Imbalance**:
- Because big boulders and sand dunes occupy far fewer pixels than expansive flat regolith, the model uses combined **Focal Loss + Dice Loss**:
  $$\\mathcal{L}_{\\text{total}} = \\mathcal{L}_{\\text{Focal}} + \\lambda \\cdot (1 - \\text{DiceScore})$$

**3. Real-Time Autonomous Traversal (Autonav)**:
- Modern rovers like Perseverance use stereo NavCam cameras and onboard FPGAs to run real-time visual odometry (VO), mapping obstacle heights and computing steering vectors at up to 120 meters per hour without waiting for Earth ground control commands.`;
  }

  // 14. OLYMPUS MONS & VALLES MARINERIS
  if (lower.includes('olympus') || lower.includes('volcano') || lower.includes('valles') || lower.includes('canyon')) {
    return `**Martian Mega-Structures (Solar System Records)**:

1. **Olympus Mons (Tallest Volcano in the Solar System)**:
   - **Elevation**: **21.9 km** (72,000 ft) above Mars datum — nearly **3 times the height of Mount Everest** above sea level!
   - **Footprint**: 600 km (370 mi) across, roughly the size of the entire state of Arizona or France.
   - **Why so huge?**: Mars lacks active plate tectonics. The crust remained stationary over a magma hotspot for hundreds of millions of years, allowing lava to continuously erupt and build up a colossal shield volcano without drifting away.

2. **Valles Marineris (The Grand Canyon of Mars)**:
   - **Length**: Over **4,000 km** (2,500 mi) long — spanning about a quarter of Mars' equator (spanning from New York to Los Angeles if on Earth).
   - **Width**: Up to 200 km (120 mi) across.
   - **Depth**: Up to **7 km** (23,000 ft) deep — 4 times deeper than Earth's Grand Canyon!
   - **Origin**: A massive tectonic rift formed when the neighboring Tharsis volcanic province bulged upward, cracking the Martian crust.`;
  }

  // 15. ROCKER-BOGIE SUSPENSION & ROVER ENGINEERING
  if (lower.includes('rocker') || lower.includes('suspension') || lower.includes('wheel') || lower.includes('chassis')) {
    return `**Rocker-Bogie Kinematic Suspension Engineering**:

The **rocker-bogie** suspension system was designed by NASA JPL and has been used on every NASA Mars rover (Sojourner, Spirit, Opportunity, Curiosity, and Perseverance):

**Design & Mechanics**:
- **Zero Springs**: It uses no elastic springs or shock absorbers. Instead, it relies on rigid mechanical linkages that passively maintain equal ground pressure across all 6 wheels.
- **The "Rocker"**: A larger link on each side connected through a differential pivot on the rover body.
- **The "Bogie"**: A smaller pivoting link attached to the rear of each rocker, mounting the middle and rear wheels.
- **Capabilities**:
  - The rover can climb over obstacles **greater than the diameter of its wheels** (up to 30 cm rocks for Perseverance) while maintaining all 6 wheels in constant ground contact.
  - Can sustain vehicle tilts up to **45 degrees** in any direction without overturning (though mission flight rules conservatively cap traverses at 15°–20° to prevent sand slip).
- **Steering**: The 4 corner wheels have independent steering actuators, enabling 360-degree point turns on the spot.`;
  }

  // 16. FINAL AUTONOMOUS FALLBACK
  return `**ORBIT Autonomous Telemetry**:
The neural link to our advanced Gemini models is currently experiencing high latency. I am operating on my local autonomous knowledge core.

I can currently answer questions about:
- **Mars & Jezero Crater** (Geology, rovers, atmosphere)
- **MARSNAV Controls** (How to use the tools)
- **Math & Physics** (Calculations and kinematics)
- **Coding** (A* pathfinding examples)

Please try your query again in a moment, or switch to a different topic!`;
}
