'use client'

import { Canvas } from '@react-three/fiber'
import { Float, Environment } from '@react-three/drei'
import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Group } from 'three'

// New Neon Color Palette
const colors = {
  background: '#050816',
  surface: '#111827',
  card: '#1a1f35',
  cyanGlow: '#00E5FF',
  violetGlow: '#7C3AED',
  pinkAccent: '#EC4899',
  limeSuccess: '#84CC16',
  warning: '#F59E0B',
  error: '#EF4444',
}

function KanbanColumn({ position, color, cardCount }: { 
  position: [number, number, number]
  color: string
  cardCount: number 
}) {
  const groupRef = useRef<Group>(null)
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.08
    }
  })

  const priorityColors = [colors.error, colors.warning, colors.limeSuccess]

  return (
    <group ref={groupRef} position={position}>
      {/* Column glass panel background */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[1.5, 3, 0.08]} />
        <meshStandardMaterial 
          color={colors.surface} 
          metalness={0.5} 
          roughness={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Neon glowing border frame */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[1.52, 3.02, 0.02]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.8} 
          roughness={0.2}
          transparent
          opacity={0.4}
        />
      </mesh>
      
      {/* Column header with strong neon glow */}
      <mesh position={[0, 1.25, 0.02]}>
        <boxGeometry args={[1.35, 0.35, 0.1]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.8}
          metalness={0.7} 
          roughness={0.2} 
        />
      </mesh>
      
      {/* Task cards with 3D effect */}
      {Array.from({ length: cardCount }).map((_, i) => (
        <Float key={i} speed={1.5} floatIntensity={0.08} rotationIntensity={0.02}>
          <group position={[0, 0.6 - i * 0.6, 0.08]}>
            {/* Card base - holographic glass effect */}
            <mesh>
              <boxGeometry args={[1.25, 0.5, 0.06]} />
              <meshStandardMaterial 
                color={colors.card} 
                metalness={0.4} 
                roughness={0.6}
                transparent
                opacity={0.95}
              />
            </mesh>
            {/* Card neon glow edge */}
            <mesh position={[0, 0, -0.02]}>
              <boxGeometry args={[1.27, 0.52, 0.02]} />
              <meshStandardMaterial 
                color={color}
                emissive={color}
                emissiveIntensity={0.2}
                transparent
                opacity={0.3}
              />
            </mesh>
            {/* Priority indicator with glow */}
            <mesh position={[-0.5, 0.15, 0.04]}>
              <boxGeometry args={[0.18, 0.08, 0.02]} />
              <meshStandardMaterial 
                color={priorityColors[i % 3]} 
                emissive={priorityColors[i % 3]}
                emissiveIntensity={0.8}
              />
            </mesh>
            {/* Text placeholder lines */}
            <mesh position={[0.05, 0.08, 0.04]}>
              <boxGeometry args={[0.85, 0.06, 0.01]} />
              <meshStandardMaterial color="#94A3B8" transparent opacity={0.4} />
            </mesh>
            <mesh position={[-0.05, -0.04, 0.04]}>
              <boxGeometry args={[0.65, 0.04, 0.01]} />
              <meshStandardMaterial color="#94A3B8" transparent opacity={0.3} />
            </mesh>
            {/* Avatar with neon ring */}
            <mesh position={[0.48, -0.14, 0.04]}>
              <circleGeometry args={[0.1, 20]} />
              <meshStandardMaterial 
                color={color} 
                emissive={color}
                emissiveIntensity={0.5}
              />
            </mesh>
            <mesh position={[0.48, -0.14, 0.045]}>
              <circleGeometry args={[0.07, 20]} />
              <meshStandardMaterial color={colors.surface} />
            </mesh>
          </group>
        </Float>
      ))}
    </group>
  )
}

function FloatingOrbs() {
  const groupRef = useRef<Group>(null)
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.03
    }
  })

  const orbs = [
    { pos: [-4.5, 2, -4] as [number, number, number], color: colors.cyanGlow, scale: 0.35 },
    { pos: [4.5, -1.5, -5] as [number, number, number], color: colors.limeSuccess, scale: 0.28 },
    { pos: [-3.5, -2, -3] as [number, number, number], color: colors.violetGlow, scale: 0.22 },
    { pos: [4, 2, -4] as [number, number, number], color: colors.pinkAccent, scale: 0.25 },
    { pos: [0, 3, -5] as [number, number, number], color: colors.cyanGlow, scale: 0.2 },
    { pos: [-5, 0, -6] as [number, number, number], color: colors.pinkAccent, scale: 0.3 },
  ]

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <Float key={i} speed={0.8 + i * 0.2} floatIntensity={0.4}>
          <mesh position={orb.pos} scale={orb.scale}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial 
              color={orb.color}
              emissive={orb.color}
              emissiveIntensity={0.9}
              metalness={1}
              roughness={0}
              transparent
              opacity={0.7}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

function ConnectionArrows() {
  const groupRef = useRef<Group>(null)
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if ('material' in child) {
          const mesh = child as Mesh
          if (mesh.material && 'opacity' in mesh.material) {
            (mesh.material as any).opacity = 0.4 + Math.sin(state.clock.elapsedTime * 2.5 + i * 0.5) * 0.3
          }
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {/* Arrow line 1 - Cyan */}
      <mesh position={[-0.9, 0, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
        <meshStandardMaterial 
          color={colors.cyanGlow} 
          emissive={colors.cyanGlow}
          emissiveIntensity={0.7}
          transparent 
          opacity={0.6} 
        />
      </mesh>
      <mesh position={[-0.55, 0, 0.1]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.14, 8]} />
        <meshStandardMaterial 
          color={colors.cyanGlow} 
          emissive={colors.cyanGlow} 
          emissiveIntensity={0.8} 
        />
      </mesh>
      
      {/* Arrow line 2 - Lime */}
      <mesh position={[0.9, 0, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
        <meshStandardMaterial 
          color={colors.limeSuccess} 
          emissive={colors.limeSuccess}
          emissiveIntensity={0.7}
          transparent 
          opacity={0.6} 
        />
      </mesh>
      <mesh position={[1.25, 0, 0.1]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.14, 8]} />
        <meshStandardMaterial 
          color={colors.limeSuccess} 
          emissive={colors.limeSuccess} 
          emissiveIntensity={0.8} 
        />
      </mesh>
    </group>
  )
}

function MainBoard() {
  const boardRef = useRef<Group>(null)
  
  useFrame((state) => {
    if (boardRef.current) {
      boardRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.06
      boardRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.02
    }
  })

  return (
    <group ref={boardRef} position={[0, 0, 0]}>
      <KanbanColumn position={[-1.8, 0, 0]} color={colors.violetGlow} cardCount={3} />
      <KanbanColumn position={[0, 0, 0]} color={colors.cyanGlow} cardCount={2} />
      <KanbanColumn position={[1.8, 0, 0]} color={colors.limeSuccess} cardCount={2} />
      <ConnectionArrows />
    </group>
  )
}

export function HeroScene() {
  return (
    <div className="w-full h-[550px] relative">
      <Canvas 
        camera={{ position: [0, 0, 6.5], fov: 42 }} 
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={[colors.background]} />
          
          {/* Ambient and directional lighting */}
          <ambientLight intensity={0.25} />
          <directionalLight position={[5, 5, 5]} intensity={0.4} color="#ffffff" />
          
          {/* Neon colored accent lights */}
          <pointLight position={[-4, 2, 4]} intensity={0.8} color={colors.cyanGlow} distance={12} />
          <pointLight position={[4, -2, 4]} intensity={0.6} color={colors.limeSuccess} distance={10} />
          <pointLight position={[0, 3, 3]} intensity={0.7} color={colors.violetGlow} distance={10} />
          <pointLight position={[3, 1, 5]} intensity={0.5} color={colors.pinkAccent} distance={8} />
          
          <MainBoard />
          <FloatingOrbs />
          
          <Environment preset="night" />
        </Suspense>
      </Canvas>
      
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#050816] via-transparent to-transparent opacity-70" />
    </div>
  )
}
