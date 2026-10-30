import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const { user } = useAuth();

  // Load missions and subscribe to updates, ensuring a default mission exists
  const loadMissions = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchUserMissions();
    let list = data;
    if (!list || list.length === 0) {
      const defaultMsn = createNewMissionRecord({ name: 'Jezero Delta Traverse Sol 428', description: 'Default Initial Mission' });
      await saveMissionRecord(defaultMsn);
      list = [defaultMsn];
    }
    setMissions(list);
    
    const savedId = localStorage.getItem('marsnav_active_mission_id');
    if (savedId && list.some((m: any) => m.id === savedId)) {
      setActiveMissionId(savedId);
    } else {
      setActiveMissionId(list[0].id);
      localStorage.setItem('marsnav_active_mission_id', list[0].id);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadMissions();

    const unsubscribe = subscribeToUserMissions((updatedList: any) => {
      if (updatedList && updatedList.length > 0) {
        setMissions(updatedList);
        setActiveMissionId((prev: string | null) => (prev && updatedList.some((m: any) => m.id === prev)) ? prev : updatedList[0].id);
      } else if (updatedList && updatedList.length === 0) {
        // If everything is gone, re-initialize
        loadMissions();
      }
    });

    return () => unsubscribe();
  }, [user, loadMissions]);

  const handleSetActiveMission = (id: string | null) => {
    setActiveMissionId(id);
    if (id) {
      localStorage.setItem('marsnav_active_mission_id', id);
    } else {
      localStorage.removeItem('marsnav_active_mission_id');
    }
  };

  const activeMission = missions.find(m => m.id === activeMissionId) || null;

  const createNewMission = async (params: { name: string; description: string; roverProfile?: string }) => {
    const newMission = createNewMissionRecord(params) as unknown as MissionRecord;
    await saveMissionRecord(newMission);
    setActiveMissionId(newMission.id);
    return newMission;
  };

  const updateMission = async (id: string, updates: Partial<MissionRecord>) => {
    const mission = missions.find(m => m.id === id);
    if (!mission) return;

    const updated = {
      ...mission,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await saveMissionRecord(updated);
  };

  const deleteMission = async (id: string) => {
    await deleteMissionRecord(id);
    if (activeMissionId === id) setActiveMissionId(null);
  };

  const saveTerrainAnalysis = async (id: string, terrainAnalysis: any, segmentationOutput: string, obstacles: any[]) => {
    await updateMission(id, { terrainAnalysis, segmentationOutput, obstacles });
  };

  const saveRouteResult = async (id: string, routeData: any) => {
    await updateMission(id, { routes: [routeData], selectedRouteIndex: 0 });
  };

  const saveDatasetVerification = async (id: string, report: any) => {
    await updateMission(id, { validationReports: [report] });
  };

  const saveHazardAnalysis = async (id: string, hazardData: any) => {
    await updateMission(id, { terrainAnalysis: hazardData });
  };

  const saveFieldNote = async (id: string, note: any) => {
    const mission = missions.find(m => m.id === id);
    if (!mission) return;
    await updateMission(id, { fieldNotes: [...(mission.fieldNotes || []), note] });
  };

  const deleteFieldNote = async (id: string, noteId: string) => {
    const mission = missions.find(m => m.id === id);
    if (!mission) return;
    await updateMission(id, { fieldNotes: (mission.fieldNotes || []).filter((n: any) => n.id !== noteId) });
  };

  return (
    <MissionRecordContext.Provider value={{
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
    }}>
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
