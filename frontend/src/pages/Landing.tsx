import React, { Suspense, useRef, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, MapPin, AlertTriangle } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Ring, Points, PointMaterial, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useData } from '../context/DataContext';

// Camera Controller for India Zoom
function CameraController({ isZoomed }: { isZoomed: boolean }) {
  const { camera } = useThree();
  const originalPosition = useMemo(() => new THREE.Vector3(0, 2, 8), []);
  const zoomedPosition = useMemo(() => {
    // Calculate India's center position on globe surface
    const lat = 20.5;
    const lon = 78.9;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const radius = 3.5; // Closer distance for zoom
    
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi) + 0.5,
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }, []);

  useFrame(() => {
    if (isZoomed) {
      camera.position.lerp(zoomedPosition, 0.05);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.lerp(originalPosition, 0.05);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

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
      {/* Main Globe with Earth Texture */}
      <Sphere ref={globeRef} args={[2, 64, 64]}>
        <meshStandardMaterial map={texture} roughness={0.8} metalness={0} />
      </Sphere>
      
      {/* Wireframe Overlay */}
      <Sphere args={[2.01, 32, 32]}>
        <meshBasicMaterial color="#00b894" transparent opacity={0.06} wireframe />
      </Sphere>
      
      {/* Atmosphere */}
      <Sphere args={[2.3, 32, 32]}>
        <meshBasicMaterial color="#e0faf5" transparent opacity={0.05} />
      </Sphere>
    </group>
  );
}

// Transaction Pin Component with Tooltip
function TransactionPin({ lat, lon, color, size, isAML, city, status, isZoomed }: { 
  lat: number; 
  lon: number; 
  color: string; 
  size: number; 
  isAML?: boolean;
  city: string;
  status: string;
  isZoomed?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRefs = useRef<THREE.Mesh[]>([]);
  const [hovered, setHovered] = useState(false);
  
  // Convert lat/lon to 3D coordinates
  const position = useMemo(() => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const radius = 2.08; // Slightly above surface
    
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }, [lat, lon]);

  useFrame((state) => {
    if (isAML && ringRefs.current.length > 0) {
      ringRefs.current.forEach((ring, index) => {
        if (ring) {
          const delay = index * 0.3;
          const scale = 1 + Math.sin((state.clock.elapsedTime + delay) * 2) * 0.5;
          ring.scale.set(scale, scale, scale);
          (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - scale * 0.3);
        }
      });
    }
  });

  return (
    <group position={position}>
      {/* Point Light for glow */}
      <pointLight color={color} intensity={0.5} distance={1} />
      
      {/* Main Pin */}
      <Sphere 
        ref={meshRef}
        args={[isZoomed ? 0.09 : 0.07, 16, 16]} // Larger size during zoom
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={2} 
          depthTest={false} // Always render on top
        />
      </Sphere>
      
      {/* Radar Pulse for AML Alert - Multiple staggered rings */}
      {isAML && [0, 1, 2].map((index) => (
        <Ring 
          key={index}
          ref={(el) => { if (el) ringRefs.current[index] = el; }}
          args={[size * (2 + index * 0.3), size * (2.5 + index * 0.3), 32]}
        >
          <meshBasicMaterial color="#ff3333" transparent opacity={0.6 - index * 0.2} side={THREE.DoubleSide} depthTest={false} />
        </Ring>
      ))}
      
      {/* Tooltip */}
      {hovered && (
        <Html distanceFactor={8}>
          <div className="bg-white border border-gray-200 rounded-lg px-2 py-2 shadow-xl">
            <div className="text-gray-800 font-bold text-sm">{city}</div>
            <div className="text-gray-600 text-xs">{status}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Starfield Component
function Starfield() {
  const points = useMemo(() => {
    const p = new Array(5000).fill(0).map(() => [
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50,
    ]);
    return new Float32Array(p.flat());
  }, []);

  return (
    <Points positions={points} stride={3} frustumCulled={false}>
      <PointMaterial color="#ffffff" size={0.02} sizeAttenuation transparent opacity={0.8} />
    </Points>
  );
}

// Scene Component
function Scene({ isZoomed }: { isZoomed: boolean }) {
  const { scene } = useThree();
  
  // Set scene background to white
  useMemo(() => {
    scene.background = new THREE.Color('#ffffff');
  }, [scene]);
  
  // Calculate India center position for highlight ring
  const indiaHighlightPosition = useMemo(() => {
    const lat = 20.5;
    const lon = 78.9;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const radius = 2.02; // Just above globe surface
    
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }, []);
  
  return (
    <>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <pointLight position={[-5, -3, -5]} intensity={0.4} />
      
      <Globe />
      
      {/* India Highlight Ring - visible only when zoomed */}
      {isZoomed && (
        <Ring 
          args={[0.8, 1.2, 32]} 
          position={indiaHighlightPosition}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial color="#00b894" transparent opacity={0.3} side={THREE.DoubleSide} depthTest={false} />
        </Ring>
      )}
      
      {/* Transaction Pins with proper positioning and colors */}
      <TransactionPin lat={19.076} lon={72.877} color="#ff3333" size={0.08} isAML city="Mumbai" status="AML Alert" isZoomed={isZoomed} />
      <TransactionPin lat={28.613} lon={77.209} color="#ffaa00" size={0.06} city="Delhi" status="High Risk" isZoomed={isZoomed} />
      <TransactionPin lat={12.971} lon={77.594} color="#ffaa00" size={0.06} city="Bangalore" status="High Risk" isZoomed={isZoomed} />
      <TransactionPin lat={22.572} lon={88.363} color="#ffaa00" size={0.06} city="Kolkata" status="High Risk" isZoomed={isZoomed} />
      <TransactionPin lat={13.082} lon={80.270} color="#00ff88" size={0.04} city="Chennai" status="Clean" isZoomed={isZoomed} />
      <TransactionPin lat={17.385} lon={78.486} color="#00ff88" size={0.04} city="Hyderabad" status="Clean" isZoomed={isZoomed} />
      <TransactionPin lat={18.520} lon={73.856} color="#00ff88" size={0.04} city="Pune" status="Clean" isZoomed={isZoomed} />
      
      <CameraController isZoomed={isZoomed} />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        autoRotate={!isZoomed}
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
  const [isZoomed, setIsZoomed] = useState(false);
  
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
      <Canvas
        camera={{ position: [0, 2, 8], fov: 45 }}
        gl={{ pixelRatio: Math.min(window.devicePixelRatio, 2) }}
      >
        <Suspense fallback={null}>
          <Scene isZoomed={isZoomed} />
        </Suspense>
      </Canvas>

      {/* SCANYX Branding */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center"
      >
        <h1 className="text-6xl font-black text-[#0a1628] tracking-tighter">DhanrakshaQ</h1>
        <p className="text-sm text-[#8899aa] uppercase tracking-widest mt-2">Regulatory Intelligence Platform</p>
      </motion.div>

      {/* HUD Stats Overlay - White Background */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute top-8 right-8 bg-white border border-[rgba(0,180,150,0.3)] rounded-xl p-6 min-w-[180px] shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
      >
        <div className="text-[10px] font-black text-[#8899aa] uppercase tracking-widest mb-2">Transactions</div>
        <div className="text-3xl font-black text-[#0a1628]">{totalTransactions.toLocaleString()}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute bottom-8 right-8 bg-white border border-[rgba(0,180,150,0.3)] rounded-xl p-6 min-w-[180px] shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
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
      >
        <div className="text-[10px] font-black text-[#8899aa] uppercase tracking-widest mb-2">Clean</div>
        <div className="text-3xl font-black text-[#00b894]">{cleanlinessPercentage}%</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="absolute top-8 left-8 bg-white border border-[rgba(0,180,150,0.3)] rounded-xl p-6 min-w-[180px] shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
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

      {/* Zoom Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="absolute bottom-8 right-1/2 transform translate-x-1/2 flex gap-3"
      >
        {!isZoomed ? (
          <button
            onClick={() => setIsZoomed(true)}
            className="px-2 py-2 bg-[#00b894]/20 border border-[#00b894]/30 rounded-full text-[#00b894] text-sm font-black uppercase tracking-widest hover:bg-[#00b894]/30 transition-all"
          >
            Focus India
          </button>
        ) : (
          <button
            onClick={() => setIsZoomed(false)}
            className="px-2 py-2 bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 rounded-full text-[#0ea5e9] text-sm font-black uppercase tracking-widest hover:bg-[#0ea5e9]/30 transition-all"
          >
            Global View
          </button>
        )}
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        className="absolute bottom-32 left-1/2 transform -translate-x-1/2"
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
      >
        <div className="w-3 h-3 rounded-full bg-[#00b894] animate-pulse"></div>
        <span className="text-[10px] font-black text-[#8899aa] uppercase tracking-[0.3em]">
          Authorized Access Only • v2.4.0
        </span>
      </motion.div>
    </div>
  );
};
