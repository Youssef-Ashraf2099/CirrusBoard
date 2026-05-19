'use client'

import { Canvas } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Environment } from '@react-three/drei'
import { Suspense } from 'react'

function FloatingOrbs() {
  return (
    <>
      {/* Main orb - primary accent */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere args={[1, 64, 64]} position={[-3, 2, -5]}>
          <MeshDistortMaterial
            color="#00d4ff"
            attach="material"
            distort={0.4}
            speed={2}
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>
      </Float>

      {/* Secondary orb - accent color */}
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
        <Sphere args={[0.6, 64, 64]} position={[4, -1, -4]}>
          <MeshDistortMaterial
            color="#a855f7"
            attach="material"
            distort={0.3}
            speed={3}
            roughness={0.3}
            metalness={0.7}
          />
        </Sphere>
      </Float>

      {/* Small accent orb */}
      <Float speed={3} rotationIntensity={0.8} floatIntensity={1.2}>
        <Sphere args={[0.3, 32, 32]} position={[2, 3, -3]}>
          <MeshDistortMaterial
            color="#22c55e"
            attach="material"
            distort={0.5}
            speed={4}
            roughness={0.1}
            metalness={0.9}
          />
        </Sphere>
      </Float>

      {/* Background ambient orbs */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
        <Sphere args={[0.8, 32, 32]} position={[-5, -2, -8]}>
          <MeshDistortMaterial
            color="#0ea5e9"
            attach="material"
            distort={0.2}
            speed={1}
            roughness={0.5}
            metalness={0.5}
            opacity={0.6}
            transparent
          />
        </Sphere>
      </Float>
    </>
  )
}

export function Background3D() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[10, 10, 5]} intensity={0.5} />
          <pointLight position={[-10, -10, -5]} intensity={0.3} color="#a855f7" />
          <FloatingOrbs />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  )
}
