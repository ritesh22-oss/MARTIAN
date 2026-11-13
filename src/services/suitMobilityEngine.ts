export type SuitConfigId = 'standard' | 'science-payload' | 'heavy-sample-collection';

export type SuitFieldKey =
  | 'astronautBodyMassKg'
  | 'suitMassKg'
  | 'plssMassKg'
  | 'sampleContainerMassKg'
  | 'scientificPayloadMassKg'
  | 'additionalEquipmentMassKg'
  | 'reportedTotalMassKg'
  | 'maxWalkingSpeedMs'
  | 'maxSlopeDeg'
  | 'lifeSupportCapacityHrs'
  | 'plannedEvaDurationHrs'
  | 'batteryCapacityWh'
  | 'lifeSupportPowerWatts'
  | 'measuredReserveHrs'
  | 'suitPressureKpa'
  | 'metabolicBaseWatts'
  | 'measuredWalkingWatts'
  | 'measuredInclineWatts'
  | 'measuredInclineAngleDeg';

export type FieldSourceType =
  | 'uploaded_file'
  | 'manual_entry'
  | 'reference_constant'
  | 'derived'
  | 'missing';

export type FieldValidationStatus = 'valid' | 'missing' | 'warning' | 'error';

export interface FieldProvenance {
  rawValue: string | number | null;
  normalizedValue: number | null;
  unit: string;
  originalUnit?: string;
  source: string;
  sourceType: FieldSourceType;
  calcMethod?: string;
  status: FieldValidationStatus;
  warningMessage?: string;
  updatedAt?: string;
}

export interface SuitConfigMeta {
  id: SuitConfigId;
  code: string;
  shortLabel: string;
  name: string;
  description: string;
  requiredMassFields: SuitFieldKey[];
  visibleMassFields: SuitFieldKey[];
}

export interface SuitConfigInputRecord {
  id: SuitConfigId;
  code: string;
  name: string;
  description: string;
  fields: Record<SuitFieldKey, FieldProvenance>;
  lastUpdatedByFile: string | null;
  lastUpdatedAt: string | null;
}

export interface FieldDefinition {
  key: SuitFieldKey;
  label: string;
  category: 'mass' | 'mobility' | 'life-support' | 'metabolic';
  canonicalUnit: string;
  step: number;
  min: number;
  allowZero: boolean;
  warnBelow?: number;
  warnAbove?: number;
  hint: string;
}

export interface AmbiguousImportItem {
  id: string;
  configScope: SuitConfigId | 'single_target' | 'environment';
  rawKey: string;
  rawValue: string | number;
  rawUnit?: string;
  reason: string;
  candidateFields: Array<{ key: SuitFieldKey | 'gravityMs2'; label: string; unit?: string }>;
  suggestedField?: SuitFieldKey | 'gravityMs2';
  suggestedUnit?: string;
}

export interface DuplicateConflictItem {
  id: string;
  configScope: SuitConfigId | 'single_target' | 'environment';
  targetKey: SuitFieldKey | 'gravityMs2';
  targetLabel: string;
  entries: Array<{
    rawKey: string;
    rawValue: string | number;
    normalizedValue: number;
    unit: string;
    lineOrPath: string;
  }>;
}

export interface ParsedExtractedEntry {
  configScope: SuitConfigId | 'single_target' | 'environment';
  targetKey: SuitFieldKey | 'gravityMs2';
  label: string;
  rawKey: string;
  rawValue: string | number;
  normalizedValue: number;
  canonicalUnit: string;
  originalUnit: string;
  status: 'valid' | 'warning';
  warningMessage?: string;
  lineOrPath: string;
}

export interface ParsedSuitImportResult {
  fileName: string;
  fileSizeBytes: number;
  detectedFormat: 'JSON' | 'TXT' | 'UNKNOWN';
  parseSuccess: boolean;
  detectedConfigMode: 'multi' | 'single' | 'none';
  detectedConfigs: SuitConfigId[];
  defaultSingleTargetConfig: SuitConfigId;
  entries: ParsedExtractedEntry[];
  ambiguousItems: AmbiguousImportItem[];
  duplicateConflicts: DuplicateConflictItem[];
  errors: string[];
  warnings: string[];
}

export interface SuitMobilityPhysicsResult {
  configId: SuitConfigId;
  mass: {
    astronautBodyMassKg: number | null;
    suitMassKg: number | null;
    plssMassKg: number | null;
    sampleContainerMassKg: number | null;
    scientificPayloadMassKg: number | null;
    additionalEquipmentMassKg: number | null;
    reportedTotalMassKg: number | null;
    componentSumKg: number | null;
    totalMassKg: number | null;
    payloadMassKg: number | null;
    payloadFractionPct: number | null;
    isCompleteMassData: boolean;
    missingRequiredMassFields: string[];
    totalMassBasis: 'component_sum' | 'reported_total_fallback' | 'incomplete';
    massDiscrepancyWarning: string | null;
  };
  gravity: {
    gravityMs2: number | null;
    gravitySource: string;
    gravitySourceType: FieldSourceType;
    marsWeightN: number | null;
    earthEquivalentKgf: number | null;
    earthWeightN: number | null;
  };
  mobility: {
    maxSpeedMs: number | null;
    maxSpeedKmh: number | null;
    maxSlopeDeg: number | null;
    suitPressureKpa: number | null;
    suitPressurePsi: number | null;
    routeDistanceM: number | null;
    estimatedTraversalTimeMins: number | null;
    terrainSlopeDeg: number | null;
    slopeFeasible: boolean | null;
    slopeMarginDeg: number | null;
    slopeStatusLabel: string;
    limitations: string[];
  };
  metabolic: {
    uploadedBaseWatts: number | null;
    uploadedWalkingWatts: number | null;
    uploadedInclineWatts: number | null;
    uploadedInclineAngleDeg: number | null;
    effectiveBaseWatts: number | null;
    effectiveBaseSourceLabel: string;
    isBaseReferenceUsed: boolean;
    modeledFlatWatts: number | null;
    modeledFlatKcalHr: number | null;
    modeledSlope10Watts: number | null;
    modeledSlope15Watts: number | null;
    modeledRouteSlopeWatts: number | null;
    modeledRouteSlopeDeg: number | null;
    estimatedRouteEnergyWh: number | null;
    metabolicModelAvailable: boolean;
    missingModelInputs: string[];
    formulaText: string;
    uncertaintyNote: string;
  };
  lifeSupport: {
    nominalCapacityHrs: number | null;
    remainingReserveHrs: number | null;
    reserveBasis: string;
    reserveStatus: 'nominal' | 'caution' | 'deficit' | 'insufficient_data';
    reservePct: number | null;
    missingReserveInputs: string[];
  };
}

export const MARS_REFERENCE_GRAVITY_MS2 = 3.721;
export const EARTH_STANDARD_GRAVITY_MS2 = 9.80665;
export const NASA_XEMU_RESTING_METABOLIC_WATTS = 210;

export const SUIT_CONFIG_META: Record<SuitConfigId, SuitConfigMeta> = {
  standard: {
    id: 'standard',
    code: 'CONFIG A · STANDARD',
    shortLabel: 'Standard EVA',
    name: 'Standard Exploration Suit (EVA Light)',
    description: 'High-agility recon configuration evaluating astronaut, suit assembly, PLSS, and light instruments.',
    requiredMassFields: ['astronautBodyMassKg', 'suitMassKg', 'plssMassKg', 'scientificPayloadMassKg'],
    visibleMassFields: ['astronautBodyMassKg', 'suitMassKg', 'plssMassKg', 'scientificPayloadMassKg'],
  },
  'science-payload': {
    id: 'science-payload',
    code: 'CONFIG B · SCIENCE',
    shortLabel: 'Science Payload',
    name: 'Spacesuit with Field Instrument Suite',
    description: 'Extended planetary science rig integrating spectrometer/drill payload and auxiliary field equipment.',
    requiredMassFields: [
      'astronautBodyMassKg',
      'suitMassKg',
      'plssMassKg',
      'scientificPayloadMassKg',
      'additionalEquipmentMassKg',
    ],
    visibleMassFields: [
      'astronautBodyMassKg',
      'suitMassKg',
      'plssMassKg',
      'scientificPayloadMassKg',
      'additionalEquipmentMassKg',
    ],
  },
  'heavy-sample-collection': {
    id: 'heavy-sample-collection',
    code: 'CONFIG C · HEAVY',
    shortLabel: 'Heavy Sample',
    name: 'Heavy Equipment & Sample Container Config',
    description: 'Maximum cargo loadout with sealed rock sample containers, scientific instruments, and trenching gear.',
    requiredMassFields: [
      'astronautBodyMassKg',
      'suitMassKg',
      'plssMassKg',
      'sampleContainerMassKg',
      'scientificPayloadMassKg',
      'additionalEquipmentMassKg',
    ],
    visibleMassFields: [
      'astronautBodyMassKg',
      'suitMassKg',
      'plssMassKg',
      'sampleContainerMassKg',
      'scientificPayloadMassKg',
      'additionalEquipmentMassKg',
    ],
  },
};

export const FIELD_DEFINITIONS: Record<SuitFieldKey, FieldDefinition> = {
  astronautBodyMassKg: {
    key: 'astronautBodyMassKg',
    label: 'Astronaut Body Mass',
    category: 'mass',
    canonicalUnit: 'kg',
    step: 0.5,
    min: 1,
    allowZero: false,
    warnBelow: 35,
    warnAbove: 160,
    hint: 'Crew member nude/LCVG body mass (kg)',
  },
  suitMassKg: {
    key: 'suitMassKg',
    label: 'Pressure Suit Assembly Mass',
    category: 'mass',
    canonicalUnit: 'kg',
    step: 0.5,
    min: 0.1,
    allowZero: false,
    warnBelow: 15,
    warnAbove: 220,
    hint: 'HUT, briefs, boots, helmet, and soft-goods pressure garment (kg)',
  },
  plssMassKg: {
    key: 'plssMassKg',
    label: 'PLSS Backpack Mass',
    category: 'mass',
    canonicalUnit: 'kg',
    step: 0.5,
    min: 0.1,
    allowZero: false,
    warnBelow: 5,
    warnAbove: 120,
    hint: 'Primary Life Support System backpack assembly mass (kg)',
  },
  sampleContainerMassKg: {
    key: 'sampleContainerMassKg',
    label: 'Sample Container Mass',
    category: 'mass',
    canonicalUnit: 'kg',
    step: 0.5,
    min: 0,
    allowZero: true,
    warnAbove: 150,
    hint: 'Hermetically sealed geological sample canisters & racks (kg)',
  },
  scientificPayloadMassKg: {
    key: 'scientificPayloadMassKg',
    label: 'Scientific Instrument Payload',
    category: 'mass',
    canonicalUnit: 'kg',
    step: 0.5,
    min: 0,
    allowZero: true,
    warnAbove: 150,
    hint: 'Carried scientific instruments, spectrometers, or drills (kg)',
  },
  additionalEquipmentMassKg: {
    key: 'additionalEquipmentMassKg',
    label: 'Additional Equipment Mass',
    category: 'mass',
    canonicalUnit: 'kg',
    step: 0.5,
    min: 0,
    allowZero: true,
    warnAbove: 150,
    hint: 'Tethers, trenching tools, core bits, and auxiliary gear (kg)',
  },
  reportedTotalMassKg: {
    key: 'reportedTotalMassKg',
    label: 'Reported Total System Mass',
    category: 'mass',
    canonicalUnit: 'kg',
    step: 0.5,
    min: 1,
    allowZero: false,
    warnBelow: 50,
    warnAbove: 600,
    hint: 'Optional pre-summed total mass from dataset (verified against components without double-counting)',
  },
  maxWalkingSpeedMs: {
    key: 'maxWalkingSpeedMs',
    label: 'Max Walking Speed',
    category: 'mobility',
    canonicalUnit: 'm/s',
    step: 0.05,
    min: 0.05,
    allowZero: false,
    warnBelow: 0.15,
    warnAbove: 4.5,
    hint: 'Maximum sustainable suited EVA walking pace (m/s)',
  },
  maxSlopeDeg: {
    key: 'maxSlopeDeg',
    label: 'Max Allowable Slope',
    category: 'mobility',
    canonicalUnit: '°',
    step: 0.5,
    min: 0,
    allowZero: true,
    warnAbove: 45,
    hint: 'Maximum safe suited incline traversal limit (degrees)',
  },
  suitPressureKpa: {
    key: 'suitPressureKpa',
    label: 'Suit Operating Pressure',
    category: 'life-support',
    canonicalUnit: 'kPa',
    step: 0.5,
    min: 1,
    allowZero: false,
    warnBelow: 15,
    warnAbove: 110,
    hint: 'Internal suit bladder operating pressure (kPa)',
  },
  lifeSupportCapacityHrs: {
    key: 'lifeSupportCapacityHrs',
    label: 'Life-Support Consumable Capacity',
    category: 'life-support',
    canonicalUnit: 'hr',
    step: 0.25,
    min: 0.1,
    allowZero: false,
    warnBelow: 1,
    warnAbove: 24,
    hint: 'Nominal PLSS oxygen / CO2 scrubber / cooling endurance (hours)',
  },
  plannedEvaDurationHrs: {
    key: 'plannedEvaDurationHrs',
    label: 'Planned / Elapsed EVA Duration',
    category: 'life-support',
    canonicalUnit: 'hr',
    step: 0.25,
    min: 0,
    allowZero: true,
    warnAbove: 24,
    hint: 'EVA duration or elapsed exposure used to compute remaining reserve (hours)',
  },
  batteryCapacityWh: {
    key: 'batteryCapacityWh',
    label: 'PLSS Battery Capacity',
    category: 'life-support',
    canonicalUnit: 'Wh',
    step: 50,
    min: 1,
    allowZero: false,
    warnAbove: 10000,
    hint: 'Optional battery reserve capacity for power-based endurance calculation (Wh)',
  },
  lifeSupportPowerWatts: {
    key: 'lifeSupportPowerWatts',
    label: 'PLSS Avionics Power Draw',
    category: 'life-support',
    canonicalUnit: 'W',
    step: 5,
    min: 1,
    allowZero: false,
    warnAbove: 2000,
    hint: 'PLSS fan, pump, and avionics electrical consumption rate (W)',
  },
  measuredReserveHrs: {
    key: 'measuredReserveHrs',
    label: 'Measured Remaining Reserve',
    category: 'life-support',
    canonicalUnit: 'hr',
    step: 0.25,
    min: 0,
    allowZero: true,
    warnAbove: 24,
    hint: 'Direct reserve readout from uploaded suit telemetry (hours)',
  },
  metabolicBaseWatts: {
    key: 'metabolicBaseWatts',
    label: 'Base Resting Metabolic Rate',
    category: 'metabolic',
    canonicalUnit: 'W',
    step: 5,
    min: 30,
    allowZero: false,
    warnBelow: 60,
    warnAbove: 600,
    hint: 'Suited resting metabolic heat generation baseline (W)',
  },
  measuredWalkingWatts: {
    key: 'measuredWalkingWatts',
    label: 'Uploaded Flat Walking Power',
    category: 'metabolic',
    canonicalUnit: 'W',
    step: 10,
    min: 50,
    allowZero: false,
    warnAbove: 1800,
    hint: 'Direct measured walking metabolic expenditure from uploaded dataset (W)',
  },
  measuredInclineWatts: {
    key: 'measuredInclineWatts',
    label: 'Uploaded Incline Power',
    category: 'metabolic',
    canonicalUnit: 'W',
    step: 10,
    min: 50,
    allowZero: false,
    warnAbove: 2200,
    hint: 'Direct measured slope metabolic expenditure from uploaded dataset (W)',
  },
  measuredInclineAngleDeg: {
    key: 'measuredInclineAngleDeg',
    label: 'Measured Incline Angle',
    category: 'metabolic',
    canonicalUnit: '°',
    step: 0.5,
    min: 0,
    allowZero: true,
    warnAbove: 45,
    hint: 'Slope angle associated with uploaded incline metabolic measurement (°)',
  },
};

const ALL_FIELD_KEYS = Object.keys(FIELD_DEFINITIONS) as SuitFieldKey[];

export function createMissingField(unit: string): FieldProvenance {
  return {
    rawValue: null,
    normalizedValue: null,
    unit,
    source: 'Not provided',
    sourceType: 'missing',
    status: 'missing',
  };
}

export function createReferenceGravity(gravityMs2 = MARS_REFERENCE_GRAVITY_MS2): FieldProvenance {
  return {
    rawValue: gravityMs2,
    normalizedValue: gravityMs2,
    unit: 'm/s²',
    originalUnit: 'm/s²',
    source: 'NASA Mars Mean Surface Gravity (0.3794 g)',
    sourceType: 'reference_constant',
    calcMethod: 'Reference geophysical constant (overridable by uploaded dataset or manual entry)',
    status: 'valid',
  };
}

export function createEmptySuitConfigs(): Record<SuitConfigId, SuitConfigInputRecord> {
  const buildConfig = (id: SuitConfigId): SuitConfigInputRecord => {
    const meta = SUIT_CONFIG_META[id];
    const fields = {} as Record<SuitFieldKey, FieldProvenance>;
    for (const key of ALL_FIELD_KEYS) {
      fields[key] = createMissingField(FIELD_DEFINITIONS[key].canonicalUnit);
    }
    return {
      id,
      code: meta.code,
      name: meta.name,
      description: meta.description,
      fields,
      lastUpdatedByFile: null,
      lastUpdatedAt: null,
    };
  };

  return {
    standard: buildConfig('standard'),
    'science-payload': buildConfig('science-payload'),
    'heavy-sample-collection': buildConfig('heavy-sample-collection'),
  };
}

export function createNasaReferenceConfigs(): Record<SuitConfigId, SuitConfigInputRecord> {
  const configs = createEmptySuitConfigs();
  const now = new Date().toISOString();

  const populate = (id: SuitConfigId, values: Partial<Record<SuitFieldKey, number>>) => {
    const cfg = configs[id];
    cfg.lastUpdatedByFile = 'NASA xEMU / Artemis EVA Reference Profile';
    cfg.lastUpdatedAt = now;
    (Object.keys(values) as SuitFieldKey[]).forEach((key) => {
      const val = values[key];
      if (val === undefined) return;
      cfg.fields[key] = {
        rawValue: val,
        normalizedValue: val,
        unit: FIELD_DEFINITIONS[key].canonicalUnit,
        originalUnit: FIELD_DEFINITIONS[key].canonicalUnit,
        source: 'NASA EVA Mobility Reference Standard',
        sourceType: 'reference_constant',
        calcMethod: 'Explicitly loaded reference profile',
        status: 'valid',
        updatedAt: now,
      };
    });
  };

  populate('standard', {
    astronautBodyMassKg: 78,
    suitMassKg: 108,
    plssMassKg: 40,
    scientificPayloadMassKg: 6,
    maxWalkingSpeedMs: 1.1,
    maxSlopeDeg: 18,
    suitPressureKpa: 29.6,
    lifeSupportCapacityHrs: 8.5,
    metabolicBaseWatts: 210,
  });

  populate('science-payload', {
    astronautBodyMassKg: 78,
    suitMassKg: 108,
    plssMassKg: 42,
    scientificPayloadMassKg: 18,
    additionalEquipmentMassKg: 7,
    maxWalkingSpeedMs: 0.85,
    maxSlopeDeg: 15,
    suitPressureKpa: 29.6,
    lifeSupportCapacityHrs: 7.5,
    metabolicBaseWatts: 235,
  });

  populate('heavy-sample-collection', {
    astronautBodyMassKg: 78,
    suitMassKg: 112,
    plssMassKg: 45,
    sampleContainerMassKg: 24,
    scientificPayloadMassKg: 16,
    additionalEquipmentMassKg: 10,
    maxWalkingSpeedMs: 0.65,
    maxSlopeDeg: 12,
    suitPressureKpa: 29.6,
    lifeSupportCapacityHrs: 6.5,
    metabolicBaseWatts: 270,
  });

  return configs;
}

/**
 * Normalizes unit strings & converts numeric values to canonical SI / MARSNav units.
 */
export function convertValueToCanonicalUnit(
  targetKey: SuitFieldKey | 'gravityMs2',
  numericValue: number,
  rawUnit?: string
): {
  normalizedValue: number;
  canonicalUnit: string;
  originalUnit: string;
  conversionWarning?: string;
} {
  const unit = (rawUnit || '').trim().toLowerCase().replace(/\s+/g, '');

  if (targetKey === 'gravityMs2') {
    if (!unit || unit === 'm/s2' || unit === 'm/s^2' || unit === 'm/s²' || unit === 'ms-2' || unit === 'ms^-2') {
      return { normalizedValue: numericValue, canonicalUnit: 'm/s²', originalUnit: rawUnit || 'm/s²' };
    }
    if (unit === 'g' || unit === 'g_earth' || unit === 'ge') {
      return { normalizedValue: numericValue * EARTH_STANDARD_GRAVITY_MS2, canonicalUnit: 'm/s²', originalUnit: rawUnit || 'g' };
    }
    if (unit === 'g_mars' || unit === 'marsg') {
      return { normalizedValue: numericValue * MARS_REFERENCE_GRAVITY_MS2, canonicalUnit: 'm/s²', originalUnit: rawUnit || 'g_mars' };
    }
    return {
      normalizedValue: numericValue,
      canonicalUnit: 'm/s²',
      originalUnit: rawUnit || 'm/s²',
      conversionWarning: `Unrecognized gravity unit "${rawUnit}", interpreted as m/s²`,
    };
  }

  const def = FIELD_DEFINITIONS[targetKey];
  const canonical = def.canonicalUnit;

  switch (canonical) {
    case 'kg': {
      if (!unit || unit === 'kg' || unit === 'kgs' || unit === 'kilogram' || unit === 'kilograms') {
        return { normalizedValue: numericValue, canonicalUnit: 'kg', originalUnit: rawUnit || 'kg' };
      }
      if (unit === 'lb' || unit === 'lbs' || unit === 'pound' || unit === 'pounds') {
        return { normalizedValue: numericValue * 0.45359237, canonicalUnit: 'kg', originalUnit: rawUnit || 'lb' };
      }
      if (unit === 'g' || unit === 'gram' || unit === 'grams') {
        return { normalizedValue: numericValue / 1000, canonicalUnit: 'kg', originalUnit: rawUnit || 'g' };
      }
      if (unit === 't' || unit === 'mt' || unit === 'tonne' || unit === 'tonnes') {
        return { normalizedValue: numericValue * 1000, canonicalUnit: 'kg', originalUnit: rawUnit || 't' };
      }
      return {
        normalizedValue: numericValue,
        canonicalUnit: 'kg',
        originalUnit: rawUnit || 'kg',
        conversionWarning: `Unrecognized mass unit "${rawUnit}", interpreted as kg`,
      };
    }

    case 'm/s': {
      if (!unit || unit === 'm/s' || unit === 'mps' || unit === 'ms-1') {
        return { normalizedValue: numericValue, canonicalUnit: 'm/s', originalUnit: rawUnit || 'm/s' };
      }
      if (unit === 'km/h' || unit === 'kph' || unit === 'kmh' || unit === 'km/hr') {
        return { normalizedValue: numericValue / 3.6, canonicalUnit: 'm/s', originalUnit: rawUnit || 'km/h' };
      }
      if (unit === 'mph' || unit === 'mi/h') {
        return { normalizedValue: numericValue * 0.44704, canonicalUnit: 'm/s', originalUnit: rawUnit || 'mph' };
      }
      if (unit === 'ft/s' || unit === 'fps') {
        return { normalizedValue: numericValue * 0.3048, canonicalUnit: 'm/s', originalUnit: rawUnit || 'ft/s' };
      }
      return {
        normalizedValue: numericValue,
        canonicalUnit: 'm/s',
        originalUnit: rawUnit || 'm/s',
        conversionWarning: `Unrecognized speed unit "${rawUnit}", interpreted as m/s`,
      };
    }

    case '°': {
      if (!unit || unit === '°' || unit === 'deg' || unit === 'degs' || unit === 'degree' || unit === 'degrees') {
        return { normalizedValue: numericValue, canonicalUnit: '°', originalUnit: rawUnit || '°' };
      }
      if (unit === 'rad' || unit === 'radian' || unit === 'radians') {
        return { normalizedValue: (numericValue * 180) / Math.PI, canonicalUnit: '°', originalUnit: rawUnit || 'rad' };
      }
      if (unit === '%' || unit === 'pct' || unit === 'percent' || unit === 'grade') {
        return {
          normalizedValue: (Math.atan(numericValue / 100) * 180) / Math.PI,
          canonicalUnit: '°',
          originalUnit: rawUnit || '%',
        };
      }
      return {
        normalizedValue: numericValue,
        canonicalUnit: '°',
        originalUnit: rawUnit || '°',
        conversionWarning: `Unrecognized angle unit "${rawUnit}", interpreted as degrees`,
      };
    }

    case 'hr': {
      if (!unit || unit === 'h' || unit === 'hr' || unit === 'hrs' || unit === 'hour' || unit === 'hours') {
        return { normalizedValue: numericValue, canonicalUnit: 'hr', originalUnit: rawUnit || 'hr' };
      }
      if (unit === 'm' || unit === 'min' || unit === 'mins' || unit === 'minute' || unit === 'minutes') {
        return { normalizedValue: numericValue / 60, canonicalUnit: 'hr', originalUnit: rawUnit || 'min' };
      }
      if (unit === 's' || unit === 'sec' || unit === 'secs' || unit === 'second' || unit === 'seconds') {
        return { normalizedValue: numericValue / 3600, canonicalUnit: 'hr', originalUnit: rawUnit || 's' };
      }
      return {
        normalizedValue: numericValue,
        canonicalUnit: 'hr',
        originalUnit: rawUnit || 'hr',
        conversionWarning: `Unrecognized duration unit "${rawUnit}", interpreted as hours`,
      };
    }

    case 'kPa': {
      if (!unit || unit === 'kpa' || unit === 'kilopascal' || unit === 'kilopascals') {
        return { normalizedValue: numericValue, canonicalUnit: 'kPa', originalUnit: rawUnit || 'kPa' };
      }
      if (unit === 'pa' || unit === 'pascal') {
        return { normalizedValue: numericValue / 1000, canonicalUnit: 'kPa', originalUnit: rawUnit || 'Pa' };
      }
      if (unit === 'psi' || unit === 'psia' || unit === 'psig') {
        return { normalizedValue: numericValue * 6.894757, canonicalUnit: 'kPa', originalUnit: rawUnit || 'psi' };
      }
      if (unit === 'bar') {
        return { normalizedValue: numericValue * 100, canonicalUnit: 'kPa', originalUnit: rawUnit || 'bar' };
      }
      if (unit === 'atm') {
        return { normalizedValue: numericValue * 101.325, canonicalUnit: 'kPa', originalUnit: rawUnit || 'atm' };
      }
      return {
        normalizedValue: numericValue,
        canonicalUnit: 'kPa',
        originalUnit: rawUnit || 'kPa',
        conversionWarning: `Unrecognized pressure unit "${rawUnit}", interpreted as kPa`,
      };
    }

    case 'W': {
      if (!unit || unit === 'w' || unit === 'watt' || unit === 'watts') {
        return { normalizedValue: numericValue, canonicalUnit: 'W', originalUnit: rawUnit || 'W' };
      }
      if (unit === 'kw' || unit === 'kilowatt' || unit === 'kilowatts') {
        return { normalizedValue: numericValue * 1000, canonicalUnit: 'W', originalUnit: rawUnit || 'kW' };
      }
      if (unit === 'kcal/h' || unit === 'kcal/hr') {
        return { normalizedValue: numericValue * 1.162222, canonicalUnit: 'W', originalUnit: rawUnit || 'kcal/hr' };
      }
      return {
        normalizedValue: numericValue,
        canonicalUnit: 'W',
        originalUnit: rawUnit || 'W',
        conversionWarning: `Unrecognized power unit "${rawUnit}", interpreted as Watts`,
      };
    }

    case 'Wh': {
      if (!unit || unit === 'wh' || unit === 'watt-hour' || unit === 'watthour') {
        return { normalizedValue: numericValue, canonicalUnit: 'Wh', originalUnit: rawUnit || 'Wh' };
      }
      if (unit === 'kwh') {
        return { normalizedValue: numericValue * 1000, canonicalUnit: 'Wh', originalUnit: rawUnit || 'kWh' };
      }
      return {
        normalizedValue: numericValue,
        canonicalUnit: 'Wh',
        originalUnit: rawUnit || 'Wh',
        conversionWarning: `Unrecognized energy unit "${rawUnit}", interpreted as Wh`,
      };
    }

    default:
      return { normalizedValue: numericValue, canonicalUnit: canonical, originalUnit: rawUnit || canonical };
  }
}

export function validateFieldEntry(
  targetKey: SuitFieldKey | 'gravityMs2',
  rawInput: string | number | null,
  rawUnit?: string,
  source = 'Manual Entry',
  sourceType: FieldSourceType = 'manual_entry'
): { provenance: FieldProvenance; error?: string } {
  if (rawInput === null || rawInput === undefined || String(rawInput).trim() === '') {
    const unit = targetKey === 'gravityMs2' ? 'm/s²' : FIELD_DEFINITIONS[targetKey].canonicalUnit;
    return { provenance: createMissingField(unit) };
  }

  let numVal: number;
  let extractedUnit = rawUnit;

  if (typeof rawInput === 'number') {
    numVal = rawInput;
  } else {
    const parsed = extractNumberAndUnit(String(rawInput));
    if (parsed.error || parsed.value === null) {
      const unit = targetKey === 'gravityMs2' ? 'm/s²' : FIELD_DEFINITIONS[targetKey].canonicalUnit;
      return {
        provenance: {
          rawValue: rawInput,
          normalizedValue: null,
          unit,
          source,
          sourceType,
          status: 'error',
          warningMessage: parsed.error || `Invalid numeric value "${rawInput}"`,
        },
        error: parsed.error || `Invalid numeric value "${rawInput}"`,
      };
    }
    numVal = parsed.value;
    if (!extractedUnit && parsed.unit) {
      extractedUnit = parsed.unit;
    }
  }

  if (!Number.isFinite(numVal)) {
    const unit = targetKey === 'gravityMs2' ? 'm/s²' : FIELD_DEFINITIONS[targetKey].canonicalUnit;
    return {
      provenance: {
        rawValue: rawInput,
        normalizedValue: null,
        unit,
        source,
        sourceType,
        status: 'error',
        warningMessage: 'Value must be a finite number',
      },
      error: 'Value must be a finite number',
    };
  }

  const converted = convertValueToCanonicalUnit(targetKey, numVal, extractedUnit);
  const val = Number(converted.normalizedValue.toFixed(4));
  const now = new Date().toISOString();

  if (targetKey === 'gravityMs2') {
    if (val <= 0) {
      return {
        provenance: {
          rawValue: rawInput,
          normalizedValue: null,
          unit: 'm/s²',
          source,
          sourceType,
          status: 'error',
          warningMessage: 'Surface gravity must be greater than 0 m/s²',
        },
        error: 'Surface gravity must be greater than 0 m/s²',
      };
    }
    const warning =
      val < 0.5 || val > 25
        ? `Unusual gravity ${val} m/s² (NASA Mars surface mean is 3.721 m/s²)`
        : converted.conversionWarning;
    return {
      provenance: {
        rawValue: rawInput,
        normalizedValue: val,
        unit: 'm/s²',
        originalUnit: converted.originalUnit,
        source,
        sourceType,
        status: warning ? 'warning' : 'valid',
        warningMessage: warning,
        updatedAt: now,
      },
    };
  }

  const def = FIELD_DEFINITIONS[targetKey];
  if (val < 0 || (!def.allowZero && val === 0)) {
    const msg = `${def.label} must be ${def.allowZero ? '≥ 0' : '> 0'} ${def.canonicalUnit}`;
    return {
      provenance: {
        rawValue: rawInput,
        normalizedValue: null,
        unit: def.canonicalUnit,
        originalUnit: converted.originalUnit,
        source,
        sourceType,
        status: 'error',
        warningMessage: msg,
      },
      error: msg,
    };
  }

  let warning = converted.conversionWarning;
  if (!warning && def.warnBelow !== undefined && val < def.warnBelow) {
    warning = `${def.label} (${val} ${def.canonicalUnit}) is below typical range (${def.warnBelow} ${def.canonicalUnit})`;
  }
  if (!warning && def.warnAbove !== undefined && val > def.warnAbove) {
    warning = `${def.label} (${val} ${def.canonicalUnit}) exceeds typical range (${def.warnAbove} ${def.canonicalUnit})`;
  }

  return {
    provenance: {
      rawValue: rawInput,
      normalizedValue: val,
      unit: def.canonicalUnit,
      originalUnit: converted.originalUnit,
      source,
      sourceType,
      status: warning ? 'warning' : 'valid',
      warningMessage: warning,
      updatedAt: now,
    },
  };
}

function extractNumberAndUnit(text: string): { value: number | null; unit?: string; error?: string } {
  const cleaned = text.trim();
  if (!cleaned) return { value: null, error: 'Empty numeric value' };

  // Reject blatantly invalid multi-token non-numeric strings before regex
  const match = cleaned.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if (!match) {
    return { value: null, error: `Invalid numeric value "${cleaned}"` };
  }
  const num = Number(match[1]);
  if (!Number.isFinite(num)) {
    return { value: null, error: `Non-finite number "${cleaned}"` };
  }
  let unit = match[2].trim();
  // Strip trailing annotations like "(approx)" or comments
  unit = unit.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (unit.includes(' ') && !/^(m\/s|km\/h|kcal\/h|lbs?|kg|watts?|hrs?|hours?|mins?|minutes?|deg|degrees?|psi|kpa|bar|atm)$/i.test(unit)) {
    // Keep only leading unit token if followed by prose note
    const firstTok = unit.split(/\s+/)[0];
    if (firstTok) unit = firstTok;
  }
  return { value: num, unit: unit || undefined };
}

function normalizeKeyToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s\-./]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function resolveConfigAlias(rawSection: string): SuitConfigId | null {
  const tok = normalizeKeyToken(rawSection);
  if (
    tok === 'standard' ||
    tok === 'config_a' ||
    tok === 'configuration_a' ||
    tok === 'eva_light' ||
    tok === 'standard_eva' ||
    tok === 'standard_exploration_suit' ||
    tok === 'a' ||
    tok === 'light'
  ) {
    return 'standard';
  }
  if (
    tok === 'science_payload' ||
    tok === 'science' ||
    tok === 'science_rig' ||
    tok === 'config_b' ||
    tok === 'configuration_b' ||
    tok === 'instrument_suite' ||
    tok === 'field_instrument_suite' ||
    tok === 'b'
  ) {
    return 'science-payload';
  }
  if (
    tok === 'heavy_sample_collection' ||
    tok === 'heavy' ||
    tok === 'heavy_sample' ||
    tok === 'heavy_equipment' ||
    tok === 'sample_collection' ||
    tok === 'config_c' ||
    tok === 'configuration_c' ||
    tok === 'c'
  ) {
    return 'heavy-sample-collection';
  }
  return null;
}

type FieldAliasResolution =
  | { kind: 'mapped'; key: SuitFieldKey | 'gravityMs2'; impliedUnit?: string }
  | {
      kind: 'ambiguous';
      reason: string;
      candidates: Array<{ key: SuitFieldKey | 'gravityMs2'; label: string }>;
      suggested?: SuitFieldKey | 'gravityMs2';
    }
  | { kind: 'ignore' };

const KEY_UNIT_SUFFIX_HINTS: Array<{ suffix: RegExp; unit: string }> = [
  { suffix: /_kg$/, unit: 'kg' },
  { suffix: /_lbs?$/, unit: 'lb' },
  { suffix: /_ms2$|_m_s2$/, unit: 'm/s²' },
  { suffix: /_ms$|_m_s$/, unit: 'm/s' },
  { suffix: /_kmh$|_kph$/, unit: 'km/h' },
  { suffix: /_mph$/, unit: 'mph' },
  { suffix: /_deg$|_degrees?$/, unit: '°' },
  { suffix: /_rad$/, unit: 'rad' },
  { suffix: /_hrs?$|_hours?$/, unit: 'hr' },
  { suffix: /_mins?$|_minutes?$/, unit: 'min' },
  { suffix: /_kpa$/, unit: 'kPa' },
  { suffix: /_psi$/, unit: 'psi' },
  { suffix: /_watts?$|_w$/, unit: 'W' },
  { suffix: /_wh$/, unit: 'Wh' },
];

function inferUnitFromKeyName(tok: string): string | undefined {
  for (const h of KEY_UNIT_SUFFIX_HINTS) {
    if (h.suffix.test(tok)) return h.unit;
  }
  return undefined;
}

function resolveFieldAlias(
  rawKey: string,
  contextConfig?: SuitConfigId | 'single_target' | 'environment'
): FieldAliasResolution {
  const tok = normalizeKeyToken(rawKey);
  const impliedUnit = inferUnitFromKeyName(tok);
  const base = tok.replace(
    /(_kg|_lbs?|_ms2|_m_s2|_ms|_m_s|_kmh|_kph|_mph|_deg|_degrees?|_rad|_hrs?|_hours?|_mins?|_minutes?|_kpa|_psi|_watts?|_wh|_w)$/,
    ''
  );

  // Metadata / descriptive keys to ignore gracefully
  if (
    ['id', 'name', 'code', 'description', 'notes', 'note', 'timestamp', 'mission', 'astronaut_name', 'suit_name', 'unit', 'units', 'source'].includes(
      tok
    )
  ) {
    return { kind: 'ignore' };
  }

  // Gravity
  if (
    ['gravity', 'mars_gravity', 'surface_gravity', 'g', 'g_mars', 'gravitational_acceleration'].includes(tok) ||
    ['gravity', 'mars_gravity', 'surface_gravity'].includes(base)
  ) {
    return { kind: 'mapped', key: 'gravityMs2', impliedUnit };
  }

  // Astronaut Body Mass
  if (
    [
      'astronaut_body_mass',
      'astronaut_mass',
      'body_mass',
      'crew_mass',
      'crew_body_mass',
      'astronaut_weight',
      'body_weight',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'astronautBodyMassKg', impliedUnit };
  }

  // Suit Assembly Mass
  if (
    [
      'suit_mass',
      'suit_assembly_mass',
      'pressure_suit_mass',
      'pressure_suit_assembly_mass',
      'spacesuit_mass',
      'garment_mass',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'suitMassKg', impliedUnit };
  }

  // PLSS Backpack Mass
  if (
    [
      'plss_mass',
      'backpack_mass',
      'life_support_mass',
      'life_support_backpack_mass',
      'plss_backpack_mass',
      'primary_life_support_mass',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'plssMassKg', impliedUnit };
  }

  // Sample Container Mass
  if (
    ['sample_container_mass', 'sample_containers_mass', 'container_mass', 'sample_mass', 'sample_rack_mass'].includes(
      base
    )
  ) {
    return { kind: 'mapped', key: 'sampleContainerMassKg', impliedUnit };
  }

  // Scientific Payload Mass
  if (
    [
      'scientific_payload_mass',
      'scientific_instrument_payload',
      'scientific_payload',
      'instrument_payload_mass',
      'instrument_mass',
      'science_payload_mass',
      'science_payload',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'scientificPayloadMassKg', impliedUnit };
  }

  // Generic "payload" or "payload_mass": unambiguous in Standard/Science, ambiguous in Heavy (has sample container + scientific payload)
  if (['payload', 'payload_mass', 'carried_payload'].includes(base)) {
    if (contextConfig === 'heavy-sample-collection') {
      return {
        kind: 'ambiguous',
        reason: `Generic "${rawKey}" inside Heavy Sample configuration could map to Sample Container Mass, Scientific Instrument Payload, or Additional Equipment.`,
        candidates: [
          { key: 'scientificPayloadMassKg', label: 'Scientific Instrument Payload (kg)' },
          { key: 'sampleContainerMassKg', label: 'Sample Container Mass (kg)' },
          { key: 'additionalEquipmentMassKg', label: 'Additional Equipment Mass (kg)' },
        ],
        suggested: 'scientificPayloadMassKg',
      };
    }
    return { kind: 'mapped', key: 'scientificPayloadMassKg', impliedUnit };
  }

  // Additional Equipment Mass
  if (
    [
      'additional_equipment_mass',
      'additional_equipment',
      'equipment_mass',
      'auxiliary_equipment_mass',
      'tools_mass',
      'gear_mass',
      'extra_equipment_mass',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'additionalEquipmentMassKg', impliedUnit };
  }

  // Reported Total Mass
  if (['total_mass', 'reported_total_mass', 'system_total_mass', 'combined_mass', 'total_earth_mass'].includes(base)) {
    return { kind: 'mapped', key: 'reportedTotalMassKg', impliedUnit };
  }

  // Generic ambiguous "mass" / "weight"
  if (['mass', 'weight'].includes(base)) {
    return {
      kind: 'ambiguous',
      reason: `Generic "${rawKey}" does not specify whether it is Astronaut Body Mass, Suit Mass, PLSS Mass, or Total Mass.`,
      candidates: [
        { key: 'astronautBodyMassKg', label: 'Astronaut Body Mass (kg)' },
        { key: 'suitMassKg', label: 'Pressure Suit Assembly Mass (kg)' },
        { key: 'plssMassKg', label: 'PLSS Backpack Mass (kg)' },
        { key: 'reportedTotalMassKg', label: 'Reported Total System Mass (kg)' },
      ],
    };
  }

  // Walking Speed
  if (
    [
      'max_walking_speed',
      'walking_speed',
      'max_speed',
      'walk_speed',
      'eva_speed',
      'traverse_speed',
      'speed',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'maxWalkingSpeedMs', impliedUnit };
  }

  // Slope Limit
  if (
    [
      'max_slope',
      'max_allowable_slope',
      'slope_limit',
      'max_incline',
      'incline_limit',
      'allowable_slope',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'maxSlopeDeg', impliedUnit };
  }

  // Suit Pressure
  if (['suit_pressure', 'operating_pressure', 'suit_operating_pressure', 'pressure'].includes(base)) {
    return { kind: 'mapped', key: 'suitPressureKpa', impliedUnit };
  }

  // Life-Support Capacity & Reserve
  if (
    [
      'life_support_capacity',
      'life_support_hours',
      'life_support_consumable_capacity',
      'consumable_capacity',
      'plss_capacity',
      'plss_endurance',
      'o2_capacity',
      'oxygen_capacity',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'lifeSupportCapacityHrs', impliedUnit };
  }

  if (
    [
      'planned_eva_duration',
      'eva_duration',
      'mission_duration',
      'elapsed_time',
      'planned_duration',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'plannedEvaDurationHrs', impliedUnit };
  }

  if (['battery_capacity', 'plss_battery_capacity', 'battery_energy'].includes(base)) {
    return { kind: 'mapped', key: 'batteryCapacityWh', impliedUnit };
  }

  if (['life_support_power', 'plss_power', 'avionics_power', 'system_power_draw'].includes(base)) {
    return { kind: 'mapped', key: 'lifeSupportPowerWatts', impliedUnit };
  }

  if (
    [
      'life_support_reserve',
      'remaining_reserve',
      'measured_reserve',
      'usable_reserve',
      'consumable_reserve',
      'o2_reserve',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'measuredReserveHrs', impliedUnit };
  }

  // Metabolic Power
  if (
    [
      'metabolic_base',
      'metabolic_base_rate',
      'base_metabolic',
      'base_metabolic_rate',
      'base_metabolic_power',
      'metabolic_base_power',
      'rest_metabolic_rate',
      'resting_metabolic_rate',
      'resting_metabolic_power',
      'metabolic_resting_rate',
      'base_rest_metabolic_rate',
      'bmr',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'metabolicBaseWatts', impliedUnit };
  }

  if (
    [
      'measured_walking_power',
      'walking_metabolic_power',
      'flat_walking_power',
      'walking_power',
      'metabolic_walking',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'measuredWalkingWatts', impliedUnit };
  }

  if (
    [
      'measured_incline_power',
      'incline_metabolic_power',
      'slope_metabolic_power',
      'incline_power',
      'metabolic_incline',
    ].includes(base)
  ) {
    return { kind: 'mapped', key: 'measuredInclineWatts', impliedUnit };
  }

  if (['measured_incline_angle', 'incline_angle', 'metabolic_incline_angle'].includes(base)) {
    return { kind: 'mapped', key: 'measuredInclineAngleDeg', impliedUnit };
  }

  if (['metabolic_power', 'power', 'metabolic'].includes(base)) {
    return {
      kind: 'ambiguous',
      reason: `Generic "${rawKey}" does not specify Resting Base vs Flat Walking vs Incline metabolic power.`,
      candidates: [
        { key: 'metabolicBaseWatts', label: 'Base Resting Metabolic Rate (W)' },
        { key: 'measuredWalkingWatts', label: 'Uploaded Flat Walking Power (W)' },
        { key: 'measuredInclineWatts', label: 'Uploaded Incline Power (W)' },
      ],
      suggested: 'metabolicBaseWatts',
    };
  }

  return { kind: 'ignore' };
}

/**
 * Parses uploaded .json or .txt astronaut & spacesuit datasets.
 */
export function parseSuitDataFile(params: {
  name: string;
  size: number;
  content: string;
  activeConfigId?: SuitConfigId;
}): ParsedSuitImportResult {
  const { name, size, content, activeConfigId = 'standard' } = params;
  const lowerName = name.toLowerCase();
  const isJsonExt = lowerName.endsWith('.json');
  const isTxtExt = lowerName.endsWith('.txt');

  const result: ParsedSuitImportResult = {
    fileName: name,
    fileSizeBytes: size,
    detectedFormat: isJsonExt ? 'JSON' : isTxtExt ? 'TXT' : 'UNKNOWN',
    parseSuccess: false,
    detectedConfigMode: 'none',
    detectedConfigs: [],
    defaultSingleTargetConfig: activeConfigId,
    entries: [],
    ambiguousItems: [],
    duplicateConflicts: [],
    errors: [],
    warnings: [],
  };

  if (!isJsonExt && !isTxtExt) {
    result.errors.push(`Unsupported file extension for "${name}". Please upload a .json or .txt file.`);
    return result;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    result.errors.push(`Uploaded file "${name}" is empty.`);
    return result;
  }

  // Auto-detect JSON vs TXT by content if misnamed, while respecting extension
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  if (isJsonExt || looksLikeJson) {
    result.detectedFormat = 'JSON';
    try {
      const json = JSON.parse(trimmed);
      extractFromJson(json, result, activeConfigId);
    } catch (err: any) {
      result.errors.push(`Malformed JSON syntax: ${err?.message || 'Unable to parse JSON'}`);
      return result;
    }
  } else {
    result.detectedFormat = 'TXT';
    extractFromLabeledTxt(trimmed, result, activeConfigId);
  }

  // Detect duplicate conflicts within the same scope & targetKey
  const seenMap = new Map<string, ParsedExtractedEntry[]>();
  for (const entry of result.entries) {
    const mapKey = `${entry.configScope}::${entry.targetKey}`;
    const arr = seenMap.get(mapKey) || [];
    arr.push(entry);
    seenMap.set(mapKey, arr);
  }

  const deduplicated: ParsedExtractedEntry[] = [];
  seenMap.forEach((arr, mapKey) => {
    if (arr.length === 1) {
      deduplicated.push(arr[0]);
      return;
    }
    const distinctValues = new Set(arr.map((a) => a.normalizedValue));
    if (distinctValues.size === 1) {
      // Exact duplicate value: keep first, add informational warning
      deduplicated.push(arr[0]);
      result.warnings.push(`Duplicate identical field "${arr[0].label}" ignored (${arr[0].normalizedValue} ${arr[0].canonicalUnit}).`);
    } else {
      // Conflicting duplicate values: surface conflict for user choice
      result.duplicateConflicts.push({
        id: `dup_${mapKey}`,
        configScope: arr[0].configScope,
        targetKey: arr[0].targetKey,
        targetLabel: arr[0].label,
        entries: arr.map((a) => ({
          rawKey: a.rawKey,
          rawValue: a.rawValue,
          normalizedValue: a.normalizedValue,
          unit: a.canonicalUnit,
          lineOrPath: a.lineOrPath,
        })),
      });
    }
  });
  result.entries = deduplicated;

  // Determine detected configs cleanly
  const configSet = new Set<SuitConfigId>();
  result.entries.forEach((e) => {
    if (e.configScope !== 'environment' && e.configScope !== 'single_target') {
      configSet.add(e.configScope);
    }
  });
  result.ambiguousItems.forEach((a) => {
    if (a.configScope !== 'environment' && a.configScope !== 'single_target') {
      configSet.add(a.configScope);
    }
  });
  result.detectedConfigs = Array.from(configSet);

  if (result.detectedConfigs.length > 0) {
    result.detectedConfigMode = 'multi';
  } else if (result.entries.length > 0 || result.ambiguousItems.length > 0 || result.duplicateConflicts.length > 0) {
    result.detectedConfigMode = 'single';
  }

  if (
    result.errors.length === 0 &&
    result.entries.length === 0 &&
    result.ambiguousItems.length === 0 &&
    result.duplicateConflicts.length === 0
  ) {
    result.errors.push('No recognized astronaut or spacesuit telemetry parameters were found in the file.');
    return result;
  }

  result.parseSuccess = result.errors.length === 0;
  return result;
}

function recordExtractedCandidate(
  result: ParsedSuitImportResult,
  scope: SuitConfigId | 'single_target' | 'environment',
  rawKey: string,
  rawVal: string | number,
  explicitUnit: string | undefined,
  lineOrPath: string
) {
  if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') return;

  // Check if the key itself specifies target config when scope is generic
  const alias = resolveFieldAlias(rawKey, scope);
  if (alias.kind === 'ignore') return;

  if (alias.kind === 'ambiguous') {
    const parsedNum = typeof rawVal === 'number' ? { value: rawVal, unit: explicitUnit } : extractNumberAndUnit(String(rawVal));
    if (parsedNum.error || parsedNum.value === null) {
      result.errors.push(`${lineOrPath}: ${parsedNum.error || 'Invalid value'} for "${rawKey}"`);
      return;
    }
    result.ambiguousItems.push({
      id: `amb_${scope}_${normalizeKeyToken(rawKey)}_${result.ambiguousItems.length}`,
      configScope: scope,
      rawKey,
      rawValue: rawVal,
      rawUnit: explicitUnit || parsedNum.unit,
      reason: alias.reason,
      candidateFields: alias.candidates,
      suggestedField: alias.suggested,
    });
    return;
  }

  const unitToUse = explicitUnit || alias.impliedUnit;
  const finalScope = alias.key === 'gravityMs2' ? 'environment' : scope;

  // Special ambiguity: unitless speed > 3.5 could be km/h vs m/s
  if (alias.key === 'maxWalkingSpeedMs') {
    const parsed = typeof rawVal === 'number' ? { value: rawVal, unit: unitToUse } : extractNumberAndUnit(String(rawVal));
    const effectiveUnit = parsed.unit || unitToUse;
    if (!effectiveUnit && parsed.value !== null && parsed.value > 2.8) {
      result.ambiguousItems.push({
        id: `amb_speed_${finalScope}_${result.ambiguousItems.length}`,
        configScope: finalScope,
        rawKey,
        rawValue: parsed.value,
        reason: `Walking speed "${parsed.value}" has no unit specified. Values > 2.8 may be km/h instead of m/s.`,
        candidateFields: [
          { key: 'maxWalkingSpeedMs', label: `Use ${parsed.value} m/s (${(parsed.value * 3.6).toFixed(1)} km/h)`, unit: 'm/s' },
          { key: 'maxWalkingSpeedMs', label: `Convert ${parsed.value} km/h → ${(parsed.value / 3.6).toFixed(2)} m/s`, unit: 'km/h' },
        ],
        suggestedField: 'maxWalkingSpeedMs',
        suggestedUnit: 'km/h',
      });
      return;
    }
  }

  const validation = validateFieldEntry(alias.key, rawVal, unitToUse, result.fileName, 'uploaded_file');
  if (validation.error || validation.provenance.normalizedValue === null) {
    result.errors.push(`${lineOrPath}: ${validation.error || `Invalid value for "${rawKey}"`}`);
    return;
  }

  const label = alias.key === 'gravityMs2' ? 'Mars Surface Gravity' : FIELD_DEFINITIONS[alias.key].label;
  if (validation.provenance.status === 'warning' && validation.provenance.warningMessage) {
    result.warnings.push(`${lineOrPath}: ${validation.provenance.warningMessage}`);
  }

  result.entries.push({
    configScope: finalScope,
    targetKey: alias.key,
    label,
    rawKey,
    rawValue: rawVal,
    normalizedValue: validation.provenance.normalizedValue,
    canonicalUnit: validation.provenance.unit,
    originalUnit: validation.provenance.originalUnit || validation.provenance.unit,
    status: validation.provenance.status === 'warning' ? 'warning' : 'valid',
    warningMessage: validation.provenance.warningMessage,
    lineOrPath,
  });
}

function extractFromJson(data: any, result: ParsedSuitImportResult, activeConfigId: SuitConfigId) {
  if (!data || typeof data !== 'object') {
    result.errors.push('JSON root must be an object or array of suit configurations.');
    return;
  }

  const sharedEntries: Array<{ key: string; val: any; path: string }> = [];
  const configObjects: Array<{ configId: SuitConfigId; obj: Record<string, any>; path: string }> = [];

  const scanObject = (obj: Record<string, any>, scope: SuitConfigId | 'single_target' | 'environment', pathPrefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const currentPath = pathPrefix ? `${pathPrefix}.${k}` : k;
      if (v === null || v === undefined) continue;

      if (typeof v === 'object' && !Array.isArray(v)) {
        // Support { value: 80, unit: "kg" } structured field objects
        if ('value' in v && (typeof v.value === 'number' || typeof v.value === 'string')) {
          const explicitUnit = typeof v.unit === 'string' ? v.unit : undefined;
          recordExtractedCandidate(result, scope, k, v.value, explicitUnit, currentPath);
          continue;
        }
        // Check if nested key is a suit configuration section
        const resolvedCfg = resolveConfigAlias(k);
        if (resolvedCfg) {
          configObjects.push({ configId: resolvedCfg, obj: v, path: currentPath });
          continue;
        }
        // Nested group like astronaut: {...}, environment: {...}, life_support: {...}, metabolic: {...}
        const norm = normalizeKeyToken(k);
        if (norm === 'configurations' || norm === 'suit_configurations' || norm === 'configs') {
          scanObject(v, scope, currentPath);
        } else if (norm === 'environment' || norm === 'mars_environment') {
          scanObject(v, 'environment', currentPath);
        } else {
          scanObject(v, scope, currentPath);
        }
        continue;
      }

      if (Array.isArray(v)) {
        v.forEach((item, idx) => {
          if (item && typeof item === 'object') {
            const itemCfg =
              resolveConfigAlias(String(item.id || item.configuration || item.config || item.name || '')) || activeConfigId;
            configObjects.push({ configId: itemCfg, obj: item, path: `${currentPath}[${idx}]` });
          }
        });
        continue;
      }

      // Check if there is an explicit target configuration tag on a flat JSON
      const normK = normalizeKeyToken(k);
      if (['configuration', 'config', 'config_id', 'suit_config', 'target_configuration'].includes(normK) && typeof v === 'string') {
        const resolved = resolveConfigAlias(v);
        if (resolved) {
          result.defaultSingleTargetConfig = resolved;
        }
        continue;
      }

      if (scope === 'single_target') {
        sharedEntries.push({ key: k, val: v, path: currentPath });
      } else {
        recordExtractedCandidate(result, scope, k, v, undefined, currentPath);
      }
    }
  };

  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      if (item && typeof item === 'object') {
        const cfg = resolveConfigAlias(String(item.id || item.configuration || item.config || item.name || '')) || activeConfigId;
        configObjects.push({ configId: cfg, obj: item, path: `[${idx}]` });
      }
    });
  } else {
    scanObject(data, 'single_target', '');
  }

  // If explicit config sections exist, attach shared astronaut/top-level attributes to each explicitly present config;
  // otherwise keep them in single_target so only 1 config is updated.
  if (configObjects.length > 0) {
    const presentIds = Array.from(new Set(configObjects.map((c) => c.configId)));
    for (const s of sharedEntries) {
      const alias = resolveFieldAlias(s.key, 'single_target');
      if (alias.kind === 'mapped' && alias.key === 'gravityMs2') {
        recordExtractedCandidate(result, 'environment', s.key, s.val, undefined, s.path);
      } else {
        for (const pid of presentIds) {
          recordExtractedCandidate(result, pid, s.key, s.val, undefined, s.path);
        }
      }
    }
    for (const cfgObj of configObjects) {
      scanObject(cfgObj.obj, cfgObj.configId, cfgObj.path);
    }
  } else {
    for (const s of sharedEntries) {
      recordExtractedCandidate(result, 'single_target', s.key, s.val, undefined, s.path);
    }
  }
}

function extractFromLabeledTxt(content: string, result: ParsedSuitImportResult, activeConfigId: SuitConfigId) {
  const lines = content.split(/\r?\n/);
  let currentSection: SuitConfigId | 'single_target' = 'single_target';
  const sharedLines: Array<{ key: string; val: string; lineRef: string }> = [];
  const sectionedConfigs = new Set<SuitConfigId>();

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || /^[-=]{3,}$/.test(trimmed)) {
      return;
    }

    // Section headers: [Configuration A], [Standard], === Science Payload ===, Configuration B:
    const bracketMatch = trimmed.match(/^\[(.+?)\]$/) || trimmed.match(/^={2,}\s*(.+?)\s*={2,}$/);
    if (bracketMatch) {
      const resolved = resolveConfigAlias(bracketMatch[1]);
      if (resolved) {
        currentSection = resolved;
        sectionedConfigs.add(resolved);
      }
      return;
    }

    // Inline "Configuration A:" or "Standard Exploration Suit:" header with nothing after colon
    const headerOnlyMatch = trimmed.match(/^([^:=]+):\s*$/);
    if (headerOnlyMatch) {
      const resolved = resolveConfigAlias(headerOnlyMatch[1]);
      if (resolved) {
        currentSection = resolved;
        sectionedConfigs.add(resolved);
      }
      return;
    }

    const kvMatch = trimmed.match(/^([^:=]+?)\s*[:=]\s*(.+)$/);
    if (!kvMatch) {
      return;
    }

    const key = kvMatch[1].trim();
    const val = kvMatch[2].trim();
    const normK = normalizeKeyToken(key);

    if (['configuration', 'config', 'config_id', 'suit_config', 'target_configuration'].includes(normK)) {
      const resolved = resolveConfigAlias(val);
      if (resolved) {
        currentSection = resolved;
        sectionedConfigs.add(resolved);
        result.defaultSingleTargetConfig = resolved;
      }
      return;
    }

    if (currentSection === 'single_target') {
      sharedLines.push({ key, val, lineRef: `Line ${lineNum}` });
    } else {
      recordExtractedCandidate(result, currentSection, key, val, undefined, `Line ${lineNum}`);
    }
  });

  if (sectionedConfigs.size > 0) {
    const presentIds = Array.from(sectionedConfigs);
    for (const s of sharedLines) {
      const alias = resolveFieldAlias(s.key, 'single_target');
      if (alias.kind === 'mapped' && alias.key === 'gravityMs2') {
        recordExtractedCandidate(result, 'environment', s.key, s.val, undefined, s.lineRef);
      } else {
        for (const pid of presentIds) {
          recordExtractedCandidate(result, pid, s.key, s.val, undefined, s.lineRef);
        }
      }
    }
  } else {
    for (const s of sharedLines) {
      recordExtractedCandidate(result, 'single_target', s.key, s.val, undefined, s.lineRef);
    }
  }

  // Keep lint happy if activeConfigId unused when sections explicitly dictate scope
  if (result.defaultSingleTargetConfig === undefined) {
    result.defaultSingleTargetConfig = activeConfigId;
  }
}

export interface ImportApplyOptions {
  singleTargetConfig: SuitConfigId;
  resolvedAmbiguities?: Record<string, { targetField: SuitFieldKey | 'gravityMs2' | 'ignore'; unitOverride?: string }>;
  resolvedConflicts?: Record<string, number>;
}

/**
 * Applies a validated ParsedSuitImportResult onto current SuitConfigs & Gravity without clobbering unrelated configs.
 */
export function applyParsedImport(
  currentConfigs: Record<SuitConfigId, SuitConfigInputRecord>,
  currentGravity: FieldProvenance,
  parsed: ParsedSuitImportResult,
  options: ImportApplyOptions
): {
  nextConfigs: Record<SuitConfigId, SuitConfigInputRecord>;
  nextGravity: FieldProvenance;
  updatedConfigIds: SuitConfigId[];
  appliedCount: number;
} {
  const nextConfigs: Record<SuitConfigId, SuitConfigInputRecord> = {
    standard: {
      ...currentConfigs.standard,
      fields: { ...currentConfigs.standard.fields },
    },
    'science-payload': {
      ...currentConfigs['science-payload'],
      fields: { ...currentConfigs['science-payload'].fields },
    },
    'heavy-sample-collection': {
      ...currentConfigs['heavy-sample-collection'],
      fields: { ...currentConfigs['heavy-sample-collection'].fields },
    },
  };

  let nextGravity = { ...currentGravity };
  const touchedConfigs = new Set<SuitConfigId>();
  let appliedCount = 0;
  const now = new Date().toISOString();

  const applyField = (
    scope: SuitConfigId | 'single_target' | 'environment',
    targetKey: SuitFieldKey | 'gravityMs2',
    rawValue: string | number,
    unit: string | undefined,
    calcMethod?: string
  ) => {
    const validation = validateFieldEntry(targetKey, rawValue, unit, parsed.fileName, 'uploaded_file');
    if (validation.error || validation.provenance.normalizedValue === null) return;
    const prov: FieldProvenance = {
      ...validation.provenance,
      calcMethod:
        calcMethod ||
        (validation.provenance.originalUnit && validation.provenance.originalUnit !== validation.provenance.unit
          ? `Converted from ${validation.provenance.rawValue} (${validation.provenance.originalUnit})`
          : 'Imported directly from uploaded dataset'),
      updatedAt: now,
    };

    if (targetKey === 'gravityMs2' || scope === 'environment') {
      nextGravity = prov;
      appliedCount += 1;
      return;
    }

    const destConfigId: SuitConfigId = scope === 'single_target' ? options.singleTargetConfig : scope;
    nextConfigs[destConfigId].fields[targetKey] = prov;
    nextConfigs[destConfigId].lastUpdatedByFile = parsed.fileName;
    nextConfigs[destConfigId].lastUpdatedAt = now;
    touchedConfigs.add(destConfigId);
    appliedCount += 1;
  };

  for (const entry of parsed.entries) {
    applyField(entry.configScope, entry.targetKey, entry.rawValue, entry.originalUnit);
  }

  for (const amb of parsed.ambiguousItems) {
    const res = options.resolvedAmbiguities?.[amb.id];
    const targetField = res?.targetField || amb.suggestedField;
    if (!targetField || targetField === 'ignore') continue;
    applyField(
      amb.configScope,
      targetField,
      amb.rawValue,
      res?.unitOverride || amb.suggestedUnit || amb.rawUnit,
      `Mapped ambiguous field "${amb.rawKey}"`
    );
  }

  for (const conflict of parsed.duplicateConflicts) {
    const chosenIdx = options.resolvedConflicts?.[conflict.id] ?? 0;
    const chosen = conflict.entries[chosenIdx] || conflict.entries[0];
    if (!chosen) continue;
    applyField(
      conflict.configScope,
      conflict.targetKey,
      chosen.rawValue,
      chosen.unit,
      `Resolved duplicate key "${chosen.rawKey}" (${chosen.lineOrPath})`
    );
  }

  return {
    nextConfigs,
    nextGravity,
    updatedConfigIds: Array.from(touchedConfigs),
    appliedCount,
  };
}

/**
 * Centralized single-source-of-truth physics & mobility engine.
 * Never fabricates zero for missing required values; tracks exact provenance and incomplete states.
 */
export function calculateSuitMobilityPhysics(
  config: SuitConfigInputRecord,
  gravityProv: FieldProvenance,
  options?: {
    routeDistanceM?: number | null;
    terrainSlopeDeg?: number | null;
    useReferenceBaseMetabolic?: boolean;
  }
): SuitMobilityPhysicsResult {
  const f = config.fields;
  const meta = SUIT_CONFIG_META[config.id];

  const getVal = (key: SuitFieldKey): number | null => f[key]?.normalizedValue ?? null;

  const astronautBodyMassKg = getVal('astronautBodyMassKg');
  const suitMassKg = getVal('suitMassKg');
  const plssMassKg = getVal('plssMassKg');
  const sampleContainerMassKg = getVal('sampleContainerMassKg');
  const scientificPayloadMassKg = getVal('scientificPayloadMassKg');
  const additionalEquipmentMassKg = getVal('additionalEquipmentMassKg');
  const reportedTotalMassKg = getVal('reportedTotalMassKg');

  const missingRequiredMassFields = meta.requiredMassFields
    .filter((reqKey) => getVal(reqKey) === null)
    .map((reqKey) => FIELD_DEFINITIONS[reqKey].label);

  const componentValues = [
    astronautBodyMassKg,
    suitMassKg,
    plssMassKg,
    sampleContainerMassKg,
    scientificPayloadMassKg,
    additionalEquipmentMassKg,
  ].filter((v): v is number => v !== null);

  const componentSumKg = componentValues.length > 0 ? Number(componentValues.reduce((a, b) => a + b, 0).toFixed(2)) : null;
  const isCompleteMassData = missingRequiredMassFields.length === 0 && componentSumKg !== null;

  let totalMassKg: number | null = null;
  let totalMassBasis: 'component_sum' | 'reported_total_fallback' | 'incomplete' = 'incomplete';
  let massDiscrepancyWarning: string | null = null;

  if (isCompleteMassData && componentSumKg !== null) {
    totalMassKg = componentSumKg;
    totalMassBasis = 'component_sum';
    if (reportedTotalMassKg !== null && Math.abs(reportedTotalMassKg - componentSumKg) > 0.5) {
      massDiscrepancyWarning = `Uploaded total mass (${reportedTotalMassKg.toFixed(1)} kg) differs from component sum (${componentSumKg.toFixed(1)} kg). Using non-double-counted component sum.`;
    }
  } else if (reportedTotalMassKg !== null) {
    totalMassKg = reportedTotalMassKg;
    totalMassBasis = 'reported_total_fallback';
    if (missingRequiredMassFields.length > 0) {
      massDiscrepancyWarning = `Component breakdown incomplete (missing: ${missingRequiredMassFields.join(', ')}); using uploaded reported total mass without double-counting.`;
    }
  }

  // Payload mass aggregation (requires relevant payload components or at least one present without fabrication)
  const payloadParts = [sampleContainerMassKg, scientificPayloadMassKg, additionalEquipmentMassKg].filter(
    (v): v is number => v !== null
  );
  const payloadRequiredMissing = meta.requiredMassFields
    .filter((k) => k === 'sampleContainerMassKg' || k === 'scientificPayloadMassKg' || k === 'additionalEquipmentMassKg')
    .some((k) => getVal(k) === null);
  const payloadMassKg =
    !payloadRequiredMissing && payloadParts.length > 0
      ? Number(payloadParts.reduce((a, b) => a + b, 0).toFixed(2))
      : payloadParts.length > 0 && !payloadRequiredMissing
      ? 0
      : null;

  const payloadFractionPct =
    payloadMassKg !== null && totalMassKg !== null && totalMassKg > 0
      ? Number(((payloadMassKg / totalMassKg) * 100).toFixed(1))
      : null;

  // B. Mars Gravity Calculations
  const gravityMs2 = gravityProv?.normalizedValue ?? null;
  const marsWeightN =
    totalMassKg !== null && gravityMs2 !== null ? Number((totalMassKg * gravityMs2).toFixed(2)) : null;
  const earthEquivalentKgf =
    marsWeightN !== null ? Number((marsWeightN / EARTH_STANDARD_GRAVITY_MS2).toFixed(2)) : null;
  const earthWeightN = totalMassKg !== null ? Number((totalMassKg * EARTH_STANDARD_GRAVITY_MS2).toFixed(2)) : null;

  // C. Mobility & Route Feasibility
  const maxSpeedMs = getVal('maxWalkingSpeedMs');
  const maxSpeedKmh = maxSpeedMs !== null ? Number((maxSpeedMs * 3.6).toFixed(2)) : null;
  const maxSlopeDeg = getVal('maxSlopeDeg');
  const suitPressureKpa = getVal('suitPressureKpa');
  const suitPressurePsi = suitPressureKpa !== null ? Number((suitPressureKpa / 6.894757).toFixed(2)) : null;

  const routeDistanceM = options?.routeDistanceM ?? null;
  const estimatedTraversalTimeMins =
    routeDistanceM !== null && routeDistanceM > 0 && maxSpeedMs !== null && maxSpeedMs > 0
      ? Number((routeDistanceM / maxSpeedMs / 60).toFixed(1))
      : null;

  const terrainSlopeDeg = options?.terrainSlopeDeg ?? null;
  let slopeFeasible: boolean | null = null;
  let slopeMarginDeg: number | null = null;
  let slopeStatusLabel = 'Missing Slope Data';

  if (maxSlopeDeg !== null && terrainSlopeDeg !== null) {
    slopeMarginDeg = Number((maxSlopeDeg - terrainSlopeDeg).toFixed(1));
    slopeFeasible = terrainSlopeDeg <= maxSlopeDeg;
    if (slopeMarginDeg < 0) {
      slopeStatusLabel = `Exceeds Limit by ${Math.abs(slopeMarginDeg)}°`;
    } else if (slopeMarginDeg < 3) {
      slopeStatusLabel = `Marginal Clearance (${slopeMarginDeg}° margin)`;
    } else {
      slopeStatusLabel = `Feasible (+${slopeMarginDeg}° margin)`;
    }
  } else if (maxSlopeDeg === null) {
    slopeStatusLabel = 'Missing Suit Slope Limit';
  }

  const limitations: string[] = [];
  if (!isCompleteMassData && totalMassKg === null) {
    limitations.push(`Incomplete Mass Data: missing ${missingRequiredMassFields.join(', ')}.`);
  }
  if (payloadFractionPct !== null && payloadFractionPct >= 18) {
    limitations.push(`High cargo burden: payload comprises ${payloadFractionPct}% of total mass.`);
  }
  if (slopeFeasible === false && terrainSlopeDeg !== null && maxSlopeDeg !== null) {
    limitations.push(`Terrain slope (${terrainSlopeDeg.toFixed(1)}°) exceeds suit stability limit (${maxSlopeDeg}°).`);
  }
  if (maxSpeedMs !== null && maxSpeedMs < 0.7) {
    limitations.push(`Reduced traverse pace (${maxSpeedMs} m/s) increases route EVA time and PLSS duty cycle.`);
  }

  // D. Metabolic Expenditure
  const uploadedBaseWatts = getVal('metabolicBaseWatts');
  const uploadedWalkingWatts = getVal('measuredWalkingWatts');
  const uploadedInclineWatts = getVal('measuredInclineWatts');
  const uploadedInclineAngleDeg = getVal('measuredInclineAngleDeg');

  let effectiveBaseWatts: number | null = uploadedBaseWatts;
  let effectiveBaseSourceLabel = uploadedBaseWatts !== null ? f.metabolicBaseWatts.source : 'Missing Data';
  let isBaseReferenceUsed = false;

  if (effectiveBaseWatts === null && options?.useReferenceBaseMetabolic) {
    effectiveBaseWatts = NASA_XEMU_RESTING_METABOLIC_WATTS;
    effectiveBaseSourceLabel = `Reference Baseline (${NASA_XEMU_RESTING_METABOLIC_WATTS} W)`;
    isBaseReferenceUsed = true;
  }

  const missingModelInputs: string[] = [];
  if (totalMassKg === null) missingModelInputs.push('Total System Mass');
  if (maxSpeedMs === null) missingModelInputs.push('Max Walking Speed');
  if (effectiveBaseWatts === null) missingModelInputs.push('Base Resting Metabolic Rate');

  const metabolicModelAvailable = missingModelInputs.length === 0;

  const computeModeledWatts = (slopeDeg: number): number | null => {
    if (!metabolicModelAvailable || totalMassKg === null || maxSpeedMs === null || effectiveBaseWatts === null) {
      return null;
    }
    const rad = (slopeDeg * Math.PI) / 180;
    const p = effectiveBaseWatts + 3.8 * totalMassKg * maxSpeedMs + 12.5 * totalMassKg * maxSpeedMs * Math.sin(rad);
    return Math.round(p);
  };

  const modeledFlatWatts = computeModeledWatts(0);
  const modeledFlatKcalHr = modeledFlatWatts !== null ? Math.round(modeledFlatWatts * 0.859845) : null;
  const modeledSlope10Watts = computeModeledWatts(10);
  const modeledSlope15Watts = computeModeledWatts(15);
  const modeledRouteSlopeDeg = terrainSlopeDeg;
  const modeledRouteSlopeWatts =
    modeledRouteSlopeDeg !== null ? computeModeledWatts(modeledRouteSlopeDeg) : null;

  const referencePowerForRoute = uploadedWalkingWatts ?? modeledRouteSlopeWatts ?? modeledFlatWatts;
  const estimatedRouteEnergyWh =
    referencePowerForRoute !== null && estimatedTraversalTimeMins !== null
      ? Math.round(referencePowerForRoute * (estimatedTraversalTimeMins / 60))
      : null;

  // E. Life-Support Reserve
  const nominalCapacityHrs = getVal('lifeSupportCapacityHrs');
  const plannedEvaDurationHrs = getVal('plannedEvaDurationHrs');
  const batteryCapacityWh = getVal('batteryCapacityWh');
  const lifeSupportPowerWatts = getVal('lifeSupportPowerWatts');
  const measuredReserveHrs = getVal('measuredReserveHrs');

  let remainingReserveHrs: number | null = null;
  let reserveBasis = '';
  let reserveStatus: 'nominal' | 'caution' | 'deficit' | 'insufficient_data' = 'insufficient_data';
  let reservePct: number | null = null;
  const missingReserveInputs: string[] = [];

  if (measuredReserveHrs !== null) {
    remainingReserveHrs = measuredReserveHrs;
    reserveBasis = `Uploaded / manual remaining reserve (${f.measuredReserveHrs.source})`;
  } else if (nominalCapacityHrs !== null && plannedEvaDurationHrs !== null) {
    remainingReserveHrs = Number((nominalCapacityHrs - plannedEvaDurationHrs).toFixed(2));
    reserveBasis = `Nominal capacity (${nominalCapacityHrs} hr) − Planned/Elapsed EVA duration (${plannedEvaDurationHrs} hr)`;
  } else if (nominalCapacityHrs !== null && estimatedTraversalTimeMins !== null) {
    const routeHrs = Number((estimatedTraversalTimeMins / 60).toFixed(2));
    remainingReserveHrs = Number((nominalCapacityHrs - routeHrs).toFixed(2));
    reserveBasis = `Nominal capacity (${nominalCapacityHrs} hr) − Calculated route traversal (${routeHrs} hr)`;
  } else if (batteryCapacityWh !== null && lifeSupportPowerWatts !== null && lifeSupportPowerWatts > 0) {
    remainingReserveHrs = Number((batteryCapacityWh / lifeSupportPowerWatts).toFixed(2));
    reserveBasis = `Battery capacity (${batteryCapacityWh} Wh) ÷ PLSS power draw (${lifeSupportPowerWatts} W)`;
  } else {
    if (nominalCapacityHrs === null) missingReserveInputs.push('Life-Support Consumable Capacity (hr)');
    missingReserveInputs.push('Planned EVA Duration (hr), Consumption Rate (W), or Measured Reserve (hr)');
    reserveBasis = 'Insufficient consumption rate or EVA duration data to compute remaining usable reserve.';
  }

  if (remainingReserveHrs !== null) {
    if (remainingReserveHrs <= 0) {
      reserveStatus = 'deficit';
    } else if (nominalCapacityHrs !== null && nominalCapacityHrs > 0) {
      reservePct = Number(Math.max(0, Math.min(100, (remainingReserveHrs / nominalCapacityHrs) * 100)).toFixed(0));
      reserveStatus = reservePct < 25 ? 'caution' : 'nominal';
    } else {
      reserveStatus = remainingReserveHrs < 1.5 ? 'caution' : 'nominal';
    }
  }

  return {
    configId: config.id,
    mass: {
      astronautBodyMassKg,
      suitMassKg,
      plssMassKg,
      sampleContainerMassKg,
      scientificPayloadMassKg,
      additionalEquipmentMassKg,
      reportedTotalMassKg,
      componentSumKg,
      totalMassKg,
      payloadMassKg,
      payloadFractionPct,
      isCompleteMassData,
      missingRequiredMassFields,
      totalMassBasis,
      massDiscrepancyWarning,
    },
    gravity: {
      gravityMs2,
      gravitySource: gravityProv.source,
      gravitySourceType: gravityProv.sourceType,
      marsWeightN,
      earthEquivalentKgf,
      earthWeightN,
    },
    mobility: {
      maxSpeedMs,
      maxSpeedKmh,
      maxSlopeDeg,
      suitPressureKpa,
      suitPressurePsi,
      routeDistanceM,
      estimatedTraversalTimeMins,
      terrainSlopeDeg,
      slopeFeasible,
      slopeMarginDeg,
      slopeStatusLabel,
      limitations,
    },
    metabolic: {
      uploadedBaseWatts,
      uploadedWalkingWatts,
      uploadedInclineWatts,
      uploadedInclineAngleDeg,
      effectiveBaseWatts,
      effectiveBaseSourceLabel,
      isBaseReferenceUsed,
      modeledFlatWatts,
      modeledFlatKcalHr,
      modeledSlope10Watts,
      modeledSlope15Watts,
      modeledRouteSlopeWatts,
      modeledRouteSlopeDeg,
      estimatedRouteEnergyWh,
      metabolicModelAvailable,
      missingModelInputs,
      formulaText: 'P_total = P_base + 3.8·m·v + 12.5·m·v·sin(θ)',
      uncertaintyNote:
        'Modeled values are theoretical Pandolf-style kinetic estimates (±15–20% biomechanical variance), NOT measured NASA flight telemetry.',
    },
    lifeSupport: {
      nominalCapacityHrs,
      remainingReserveHrs,
      reserveBasis,
      reserveStatus,
      reservePct,
      missingReserveInputs,
    },
  };
}
