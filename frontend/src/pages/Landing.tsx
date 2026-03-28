import React, { Suspense, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useData } from '../context/DataContext';

// Globe Component with Earth Texture
function Globe() {
  const globeRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load('https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg');
  }, []);
  
  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group>
      {/* Main Globe Sphere */}
      <Sphere ref={globeRef} args={[1, 64, 64]} rotation={[0.3, -1.4, 0]}>
        <meshStandardMaterial map={texture} />
      </Sphere>
      
      {/* Atmosphere */}
      <Sphere args={[1.1, 32, 32]} rotation={[0.3, -1.4, 0]}>
        <meshBasicMaterial color="#e0faf5" transparent opacity={0.05} />
      </Sphere>
    </group>
  );
}

// Scene Component
function Scene() {
  const { scene } = useThree();
  
  // Set scene background to white
  useMemo(() => {
    scene.background = new THREE.Color('#ffffff');
  }, [scene]);
  
  return (
    <>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <pointLight position={[-5, -3, -5]} intensity={0.4} />
      
      <Globe />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        autoRotate={true}
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, rules } = useData();
  
  // Calculate stats from context
  const totalTransactions = transactions.length;
  const totalViolations = transactions.filter(t => t['Is Laundering'] === 1).length;
  const cleanlinessPercentage = totalTransactions > 0 
    ? ((totalTransactions - totalViolations) / totalTransactions * 100).toFixed(1)
    : '100.0';
  const activeRules = rules.length;

  return (
    <div className="relative w-full h-screen bg-[#ffffff] overflow-hidden">
      {/* Three.js Canvas with white background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 35 }}
          gl={{ alpha: true }}
          style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>
      
      {/* DhanrakshaQ Branding */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-[6%] left-1/2 transform -translate-x-1/2 text-center z-10"
        style={{ position: 'absolute', top: '6%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 10 }}
      >
        <h1 className="text-7xl font-black text-[#0a1628] tracking-tighter">DhanrakshaQ</h1>
        <p className="text-lg text-[#8899aa] mt-2">
          "The next-generation Intelligence Ledger for regulatory enforcement & risk prediction."
        </p>
      </motion.div>
      
      {/* HUD Stats Overlay - White Background */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute top-8 right-8 bg-white border border-[rgba(0,180,150,0.3)] rounded-xl p-6 min-w-[180px] shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
        style={{ position: 'absolute', zIndex: 10 }}
      >
        <div className="text-[10px] font-black text-[#8899aa] uppercase tracking-widest mb-2">Transactions</div>
        <div className="text-3xl font-black text-[#0a1628]">{totalTransactions.toLocaleString()}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute bottom-8 right-8 bg-white border border-[rgba(0,180,150,0.3)] rounded-xl p-6 min-w-[180px] shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
        style={{ position: 'absolute', zIndex: 10 }}
      >
        <div className="text-[10px] font-black text-[#8899aa] uppercase tracking-widest mb-2">Violations</div>
        <div className={`text-3xl font-black ${totalViolations > 0 ? 'text-[#ff3333]' : 'text-[#0a1628]'}`}>
          {totalViolations.toLocaleString()}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="absolute bottom-8 left-8 bg-white border border-[rgba(0,180,150,0.3)] rounded-xl p-6 min-w-[180px] shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
        style={{ position: 'absolute', zIndex: 10 }}
      >
        <div className="text-[10px] font-black text-[#8899aa] uppercase tracking-widest mb-2">Clean</div>
        <div className="text-3xl font-black text-[#00b894]">{cleanlinessPercentage}%</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="absolute top-8 left-8 bg-white border border-[rgba(0,180,150,0.3)] rounded-xl p-6 min-w-[180px] shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
        style={{ position: 'absolute', zIndex: 10 }}
      >
        <div className="text-[10px] font-black text-[#8899aa] uppercase tracking-widest mb-2">Active Rules</div>
        <div className="text-3xl font-black text-[#0a1628]">{activeRules}</div>
      </motion.div>

      {/* Legend - Dark text */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="absolute top-48 right-8 bg-white border border-[rgba(0,180,150,0.3)] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
        style={{ position: 'absolute', zIndex: 10 }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff3333]"></div>
            <span className="text-xs text-[#0a1628]">AML Alert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ffaa00]"></div>
            <span className="text-xs text-[#0a1628]">High Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00ff88]"></div>
            <span className="text-xs text-[#0a1628]">Clean</span>
          </div>
        </div>
      </motion.div>

      {/* CTA Button - Moved Down */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        className="absolute bottom-16 left-1/2 transform -translate-x-1/2"
        style={{ position: 'absolute', zIndex: 10 }}
      >
        <motion.button
          onClick={() => navigate('/home')}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="h-20 px-12 bg-[#00b894] text-white rounded-[3rem] text-lg font-black shadow-[0_0_30px_rgba(0,184,148,0.3)] flex items-center gap-4 group transition-all"
        >
          Initialize System Core
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center group-hover:translate-x-2 transition-transform">
            <ArrowRight className="w-5 h-5 text-[#00b894]" />
          </div>
        </motion.button>
      </motion.div>

      {/* Status Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-3"
        style={{ position: 'absolute', zIndex: 10 }}
      >
        <div className="w-3 h-3 rounded-full bg-[#00b894] animate-pulse"></div>
        <span className="text-[10px] font-black text-[#8899aa] uppercase tracking-[0.3em]">
          Authorized Access Only • v2.4.0
        </span>
      </motion.div>
    </div>
  );
};
