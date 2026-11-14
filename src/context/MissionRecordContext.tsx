import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  createNewMissionRecord, 
  saveMissionRecord, 
  deleteMissionRecord, 
  fetchUserMissions,
  subscribeToUserMissions 
} from '../utils/missionService';
import { useAuth } from './AuthContext';

// Define the complete structure for a mission record
export interface MissionRecord {
  id: string;
  userId?: string | null;
  name: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Failed';
  createdAt: string;
  updatedAt: string;
  // Visual Evidence & Assets
  terrainImage: string; // Original
  processedImage?: string;
  segmentationOutput?: string;
  obstacleOverlay?: string;
  routeVisualization?: string;
  imageProvenance?: any;
  detectionMethod?: string;
  selectedStrategy?: string;
  // Terrain Analysis
  terrainAnalysis: any; // Raw analysis output
  obstacles: any[];
  segmentedHazards: any[];
  // Route Data
  routes: any[];
  selectedRouteIndex: number;
  routeMetrics?: any;
  rawRoutePath?: any[];
  simulationState?: any;
  checkpoints?: any[];
  startPoint: { x: number; y: number } | null;
  destinationPoint: { x: number; y: number } | null;
  // Telemetry & Rover
  telemetry: any;
  roverProfile: string;
  roverConfiguration: any;
  // Science & Provenance
  scienceTargets: any[];
  datasetProvenance: any;
  validationReports: any[];
  fieldNotes: any[];
  traversalLog: any[];
  validationPassed: boolean;
  isArchived: boolean;
}

interface MissionRecordContextType {
  missions: MissionRecord[];
  activeMission: MissionRecord | null;
  isLoading: boolean;
  setActiveMission: (id: string | null) => void;
  createNewMission: (params: { name: string; description: string; roverProfile?: string }) => Promise<MissionRecord>;
  updateMission: (id: string, updates: Partial<MissionRecord>) => Promise<void>;
  deleteMission: (id: string) => Promise<void>;
  // Helper to update specific sub-sections
  saveTerrainAnalysis: (id: string, analysis: any, segmentationOutput: string, obstacles: any[]) => Promise<void>;
  saveRouteResult: (id: string, routeData: any) => Promise<void>;
  saveDatasetVerification: (id: string, report: any) => Promise<void>;
  saveHazardAnalysis: (id: string, hazardData: any) => Promise<void>;
  saveFieldNote: (id: string, note: any) => Promise<void>;
  deleteFieldNote: (id: string, noteId: string) => Promise<void>;
}

const MissionRecordContext = createContext<MissionRecordContextType | undefined>(undefined);

export const MissionRecordProvider = ({ children }: { children: React.ReactNode }) => {
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const missionsRef = useRef<MissionRecord[]>(missions);
  missionsRef.current = missions;
  const isLoadingInFlightRef = useRef(false);

  const { user } = useAuth();

  // Load missions and subscribe to updates without hardcoded default missions
  const loadMissions = useCallback(async () => {
    if (isLoadingInFlightRef.current) return;
    isLoadingInFlightRef.current = true;
    setIsLoading(true);
    try {
      const data = await fetchUserMissions();
      const list = Array.isArray(data) ? data : [];
      setMissions(list);

      const savedId = localStorage.getItem('marsnav_active_mission_id');
      if (savedId && list.some((m: any) => m.id === savedId)) {
        setActiveMissionId(savedId);
      } else if (list.length > 0) {
        setActiveMissionId(list[0].id);
        localStorage.setItem('marsnav_active_mission_id', list[0].id);
      } else {
        setActiveMissionId(null);
        localStorage.removeItem('marsnav_active_mission_id');
      }
    } finally {
      setIsLoading(false);
      isLoadingInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadMissions();

    const unsubscribe = subscribeToUserMissions((updatedList: any) => {
      const list = Array.isArray(updatedList) ? updatedList : [];
      setMissions(list);
      setActiveMissionId((prev: string | null) => {
        if (prev && list.some((m: any) => m.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
    });

    return () => unsubscribe();
  }, [user, loadMissions]);

  const handleSetActiveMission = useCallback((id: string | null) => {
    setActiveMissionId(id);
    if (id) {
      localStorage.setItem('marsnav_active_mission_id', id);
    } else {
      localStorage.removeItem('marsnav_active_mission_id');
    }
  }, []);

  const activeMission = useMemo(
    () => missions.find(m => m.id === activeMissionId) || null,
    [missions, activeMissionId]
  );

  const createNewMission = useCallback(async (params: { name: string; description: string; roverProfile?: string }) => {
    const newMission = createNewMissionRecord(params) as unknown as MissionRecord;
    await saveMissionRecord(newMission);
    setMissions(prev => [newMission, ...prev.filter(m => m.id !== newMission.id)]);
    setActiveMissionId(newMission.id);
    localStorage.setItem('marsnav_active_mission_id', newMission.id);
    return newMission;
  }, []);

  const updateMission = useCallback(async (id: string, updates: Partial<MissionRecord>) => {
    const mission = missionsRef.current.find(m => m.id === id);
    if (!mission) return;

    const updated = {
      ...mission,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setMissions(prev => prev.map(m => (m.id === id ? updated : m)));
    await saveMissionRecord(updated);
  }, []);

  const deleteMission = useCallback(async (id: string) => {
    await deleteMissionRecord(id);
    setMissions(prev => prev.filter(m => m.id !== id));
    setActiveMissionId(prev => (prev === id ? null : prev));
  }, []);

  const saveTerrainAnalysis = useCallback(async (id: string, terrainAnalysis: any, segmentationOutput: string, obstacles: any[]) => {
    await updateMission(id, { terrainAnalysis, segmentationOutput, obstacles });
  }, [updateMission]);

  const saveRouteResult = useCallback(async (id: string, routeData: any) => {
    await updateMission(id, { routes: [routeData], selectedRouteIndex: 0 });
  }, [updateMission]);

  const saveDatasetVerification = useCallback(async (id: string, report: any) => {
    await updateMission(id, { validationReports: [report] });
  }, [updateMission]);

  const saveHazardAnalysis = useCallback(async (id: string, hazardData: any) => {
    await updateMission(id, { terrainAnalysis: hazardData });
  }, [updateMission]);

  const saveFieldNote = useCallback(async (id: string, note: any) => {
    const mission = missionsRef.current.find(m => m.id === id);
    if (!mission) return;
    await updateMission(id, { fieldNotes: [...(mission.fieldNotes || []), note] });
  }, [updateMission]);

  const deleteFieldNote = useCallback(async (id: string, noteId: string) => {
    const mission = missionsRef.current.find(m => m.id === id);
    if (!mission) return;
    await updateMission(id, { fieldNotes: (mission.fieldNotes || []).filter((n: any) => n.id !== noteId) });
  }, [updateMission]);

  const contextValue = useMemo(() => ({
    missions,
    activeMission,
    isLoading,
    setActiveMission: handleSetActiveMission,
    createNewMission,
    updateMission,
    deleteMission,
    saveTerrainAnalysis,
    saveRouteResult,
    saveDatasetVerification,
    saveHazardAnalysis,
    saveFieldNote,
    deleteFieldNote
  }), [
    missions,
    activeMission,
    isLoading,
    handleSetActiveMission,
    createNewMission,
    updateMission,
    deleteMission,
    saveTerrainAnalysis,
    saveRouteResult,
    saveDatasetVerification,
    saveHazardAnalysis,
    saveFieldNote,
    deleteFieldNote
  ]);

  return (
    <MissionRecordContext.Provider value={contextValue}>
      {children}
    </MissionRecordContext.Provider>
  );
};


export const useMissionRecord = () => {
  const context = useContext(MissionRecordContext);
  if (!context) {
    throw new Error('useMissionRecord must be used within a MissionRecordProvider');
  }
  return context;
};
