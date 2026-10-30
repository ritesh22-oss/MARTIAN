# 🚀 MarsNav
### AI-Powered Martian Terrain Analysis & Rover Navigation

**MarsNav** is an interactive planetary exploration and rover navigation platform designed to support the analysis of Martian terrain, mission planning, hazard identification, and autonomous route exploration.

The project aims to bring together NASA planetary datasets, terrain visualization, image analysis, route planning algorithms, and mission-level reporting in one unified workspace.

Built with the vision of helping researchers and space enthusiasts explore Martian landscapes and understand the challenges of navigating a rover across the Red Planet.

---

## 🌌 Project Overview

Exploring Mars is not simply about reaching a destination. A rover must navigate unpredictable terrain, avoid obstacles, identify scientifically interesting locations, and operate within strict mission constraints.

MarsNav addresses these challenges through an integrated exploration environment where users can:

- Explore Martian regions and available planetary datasets.
- Upload their own terrain images for analysis.
- Inspect terrain features and identify potential hazards.
- Plan rover routes across selected terrain.
- Compare alternative navigation paths.
- Evaluate route feasibility and terrain-related risks.
- Maintain mission records and export technical reports.

Our goal is to develop a practical, data-driven environment for Martian terrain exploration rather than a static Mars visualization website.

---

## ✨ Key Features

### 1. 🪐 Martian Region Exploration
Explore important Martian geographical locations, including:

- Jezero Crater
- Gale Crater
- Arcadia Planitia
- Utopia Planitia
- Amazonis Planitia
- Elysium Planitia
- Hellas Planitia
- Valles Marineris

The platform is designed to connect regional exploration with actual planetary observations and relevant mission datasets.

### 2. 🛰️ NASA & Planetary Dataset Catalogue

A centralized catalogue for discovering and inspecting planetary datasets.

Potential data sources include:

- NASA Image and Video Library
- NASA Planetary Data System (PDS)
- Mars Reconnaissance Orbiter (MRO)
- High Resolution Imaging Science Experiment (HiRISE)
- Mars Orbiter Laser Altimeter (MOLA)
- High Resolution Stereo Camera (HRSC)

Dataset compatibility should be evaluated using actual metadata, spatial coverage, coordinate systems, resolution, file formats, and available data products.

### 3. 🖼️ Terrain Image Analysis

Users can upload Martian terrain images and use the analysis workspace to inspect them.

Planned analysis capabilities include:

- Original terrain image visualization
- Terrain segmentation
- Rock and obstacle identification
- Terrain feature analysis
- Hazard identification
- Annotated terrain visualization
- Image-based measurements

**Important:** Model predictions and physical measurements must only be presented when supported by an actual connected model, appropriate calibration, and available input data.

### 4. 🧠 Terrain Intelligence

The Terrain Intelligence module is designed to help interpret terrain observations and support rover navigation decisions.

It aims to combine:

- Terrain characteristics
- Obstacle information
- Surface conditions
- Slope information when reliable elevation data is available
- Potential navigation hazards
- Scientific points of interest

### 5. 🗺️ Rover Route Planning

MarsNav includes a route-planning environment for exploring possible rover paths.

Navigation capabilities include:

- Start and destination selection
- Obstacle placement
- Route visualization
- Path comparison
- Waypoint analysis
- Route distance calculations
- Terrain-based traversal costs
- Restricted-zone avoidance

The route-planning system is designed to support algorithmic approaches such as A* pathfinding.

Route calculations based on simulated grids must be distinguished from real-world rover navigation predictions.

### 6. ⚠️ Hazard Analysis & Risk Assessment

The platform aims to identify and evaluate potential navigation hazards.

Examples include:

- Steep terrain
- Large rocks and obstacles
- Restricted regions
- Potentially difficult traversal areas
- Unsafe route segments

Risk assessments should clearly identify whether a result comes from actual elevation data, image analysis, manual annotations, or simulation.

### 7. 🧪 Validation & Model Evaluation

MarsNav includes dedicated validation and evaluation modules intended to assess:

- Dataset compatibility
- Model performance
- Route feasibility
- Navigation constraints
- Validation test results
- Operational limitations

The system should report actual test results rather than displaying predetermined compatibility scores or fabricated validation certificates.

### 8. 📄 Mission Audit & PDF Report Generation

The Mission Audit module is designed to create a consolidated technical dossier for each exploration mission.

The intended report includes:

- Mission name and identification
- Mission configuration
- Original uploaded terrain image
- Selected NASA observation and dataset metadata
- Processed and segmented terrain images, when available
- Terrain analysis results
- Model configuration and evaluation metrics
- Route selected by the user
- Route comparison results
- Distance and traversal metrics
- Hazard and risk assessment
- Scientific points of interest
- Field notes and annotations
- Validation results
- Data sources and provenance
- Known limitations and timestamps

The objective is to preserve the actual mission workspace data in a downloadable PDF, rather than generating an empty report containing only metadata.

---

## 🛠️ Technology & Data Sources

MarsNav is designed around modern web technologies and planetary science data services.

| Technology / Source | Purpose |
|---|---|
| React | User interface |
| JavaScript | Application logic |
| CSS | Interface styling |
| Google AI Studio | AI-assisted application development |
| NASA Image and Video Library API | NASA imagery discovery |
| NASA Planetary Data System | Planetary science datasets |
| HiRISE | High-resolution Martian surface imagery |
| MOLA | Martian topographic data |
| A* Pathfinding | Rover route planning |

*The exact implementation and availability of individual integrations may vary across application versions.*

---

## 🛰️ NASA Data Resources

MarsNav is intended to use authentic planetary science data wherever available.

Useful official resources:

- [NASA Open APIs](https://api.nasa.gov/)
- [NASA Image and Video Library](https://images.nasa.gov/)
- [NASA Images API Documentation](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf)
- [NASA Planetary Data System](https://pds.nasa.gov/)
- [NASA PDS Geosciences Node](https://pds-geosciences.wustl.edu/)
- [HiRISE Official Website](https://www.uahirise.org/)
- [NASA Mars Exploration Program](https://science.nasa.gov/mars/)

**Data integrity matters:** A search result mentioning a Martian region does not automatically prove that the image was captured at that location. Geographic verification should use appropriate observation metadata and spatial coverage information.

---

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- A modern web browser
- Internet connection for external data services

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/MarsNav.git
```

Navigate into the project:

```bash
cd MarsNav
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

*Note: These commands assume the repository uses a standard npm-based development setup. Check `package.json` for the actual scripts.*

---

## 🔐 Environment Variables & API Keys

If an external service requires an API key, configure it through the appropriate environment-variable or secret-management mechanism.

Never commit:

- NASA API keys
- Private credentials
- Authentication tokens
- Secret configuration files

For a Vite-based application, public environment variables prefixed with `VITE_` are exposed to the browser. Do not place private secrets in them.

---

## 🧭 Project Vision

MarsNav aims to evolve into a unified planetary exploration and rover navigation environment.

Future development directions include:

- Improved terrain segmentation models
- Integration of additional NASA planetary datasets
- DEM-based terrain analysis
- More accurate slope and elevation calculations
- Advanced obstacle detection
- Multi-route optimization
- Mission reproducibility and evidence tracking
- Comprehensive PDF mission dossiers
- Better integration between analysis, navigation, validation, and mission audit modules

---

## ⚠️ Scientific Integrity

MarsNav distinguishes between:

- **NASA observations:** Data retrieved from documented planetary archives.
- **User uploads:** Images supplied by the user.
- **Model predictions:** Outputs generated by an actual connected model.
- **Manual annotations:** User-created markers, notes, and restricted zones.
- **Calculated results:** Metrics derived from available input data.
- **Simulations:** Results generated using simulated terrain or navigation environments.

The application must not represent simulated values as actual NASA measurements or claim that an AI model is connected when it is not.

---

## 🏆 Hackathon Project

**Project:** MarsNav – AI-Powered Terrain Analysis and Rover Navigation

**Challenge:** Interplanetary Survival Guide: Martian Map

**Team:** Relic Rangers

**Objective:** Develop a planetary exploration and navigation platform that combines Martian terrain intelligence, scientific datasets, hazard assessment, and rover route planning.

---

## 📜 License

Choose and add an appropriate open-source license before distributing the project publicly.

---

**Exploring Mars, one terrain observation at a time.** 🔴
