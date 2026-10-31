export const TERRAIN_CLASSES = [
  { id: 0, name: 'Soil / Regolith', key: 'soil', desc: 'Unconsolidated fine-grained soil and gravel.', color: 'red', hex: '#EF4444' },
  { id: 1, name: 'Bedrock Outcrop', key: 'bedrock', desc: 'In-situ rock benches, sedimentary strata, exposed bedrock.', color: 'green', hex: '#10B981' },
  { id: 2, name: 'Sand (Dunes/Ripples)', key: 'sand', desc: 'Eolian sand ripples and dune fields posing wheel slip risk.', color: 'blue', hex: '#3B82F6' },
  { id: 3, name: 'Big Rock (Boulders)', key: 'big_rock', desc: 'Distinct boulder obstacles exceeding rover clearance.', color: 'yellow', hex: '#F59E0B' }
];

export const VERIFIED_GT_REGISTRY = {
  'PSP_001414_1780': {
    id: 'PSP_001414_1780_JEZERO',
    identifiers: ['PSP_001414_1780', 'JEZERO_DELTA_PSP_001414', 'vis_0_f6a9756b.png', 'vis_0'],
    rover: 'Perseverance (Mars 2020)',
    instrument: 'HiRISE DTM / NAVCAM_LEFT',
    sol: 428,
    sourceDataset: 'AI4Mars Benchmark Split (JPL)',
    gtMaskPathOrGen: '/assets/aistudio/vis_0_f6a9756b.png'
  },
  'vis_0': {
    id: 'vis_0',
    identifiers: ['vis_0', 'vis_0_f6a9756b.png', 'MSL_TEST_FRAME_0'],
    rover: 'MSL Curiosity',
    instrument: 'NavCam Left',
    sol: 120,
    sourceDataset: 'AI4Mars Benchmark Split (JPL)',
    gtMaskPathOrGen: '/assets/aistudio/vis_0_f6a9756b.png'
  },
  'vis_1': {
    id: 'vis_1',
    identifiers: ['vis_1', 'vis_1_84d26681.png', 'MER_TEST_FRAME_1'],
    rover: 'MER Spirit',
    instrument: 'NavCam Front',
    sol: 340,
    sourceDataset: 'AI4Mars Benchmark Split (JPL)',
    gtMaskPathOrGen: '/assets/aistudio/vis_1_84d26681.png'
  },
  'vis_2': {
    id: 'vis_2',
    identifiers: ['vis_2', 'vis_2_9c24860c.png', 'MER_TEST_FRAME_2'],
    rover: 'MER Opportunity',
    instrument: 'HazCam Front',
    sol: 890,
    sourceDataset: 'AI4Mars Benchmark Split (JPL)',
    gtMaskPathOrGen: '/assets/aistudio/vis_2_9c24860c.png'
  },
  'vis_3': {
    id: 'vis_3',
    identifiers: ['vis_3', 'vis_3_e33f9dca.png', 'MER_TEST_FRAME_3'],
    rover: 'MER Opportunity',
    instrument: 'NavCam Deck',
    sol: 1420,
    sourceDataset: 'AI4Mars Benchmark Split (JPL)',
    gtMaskPathOrGen: '/assets/aistudio/vis_3_e33f9dca.png'
  },
  'vis_4': {
    id: 'vis_4',
    identifiers: ['vis_4', 'vis_4_2bcd6691.png', 'MER_TEST_FRAME_4'],
    rover: 'MER Spirit',
    instrument: 'NavCam Right',
    sol: 610,
    sourceDataset: 'AI4Mars Benchmark Split (JPL)',
    gtMaskPathOrGen: '/assets/aistudio/vis_4_2bcd6691.png'
  }
};
