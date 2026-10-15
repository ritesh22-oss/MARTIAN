import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import BootScreen from './components/BootScreen';
import Navbar from './components/Navbar';
import SpaceBackground from './components/SpaceBackground';
import HeroSection from './components/HeroSection';
import MissionOverview from './components/MissionOverview';
import MarsTerrain3D from './components/MarsTerrain3D';
import TerrainAnalysis from './components/TerrainAnalysis';
import RoutePlanner from './components/RoutePlanner';
import DatasetSection from './components/DatasetSection';
import MethodologySection from './components/MethodologySection';
import Footer from './components/Footer';
import SavedMissionsModal from './components/SavedMissionsModal';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [backendStatus, setBackendStatus] = useState('standby'); // 'standby' or 'connected'
  const [missionsModalOpen, setMissionsModalOpen] = useState(false);

  if (!booted) {
    return <BootScreen onComplete={() => setBooted(true)} />;
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#050813] text-slate-100 relative overflow-x-hidden animate-fade-in">
        {/* Animated Starfield & Deep Space Background */}
        <SpaceBackground />

        {/* Glass Navigation Bar with Firebase Auth & Missions Link */}
        <Navbar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          backendStatus={backendStatus}
          onOpenMissions={() => setMissionsModalOpen(true)}
        />

        {/* Main Content Sections */}
        <main className="relative z-10 flex flex-col space-y-12">
          <HeroSection setActiveSection={setActiveSection} />
          <MissionOverview />
          <MarsTerrain3D onOpenMissions={() => setMissionsModalOpen(true)} />
          <TerrainAnalysis />
          <RoutePlanner onOpenMissions={() => setMissionsModalOpen(true)} />
          <DatasetSection />
          <MethodologySection />
        </main>

        {/* Cloud Missions Modal */}
        <SavedMissionsModal
          isOpen={missionsModalOpen}
          onClose={() => setMissionsModalOpen(false)}
        />

        {/* Professional Footer */}
        <Footer />
      </div>
    </AuthProvider>
  );
}
