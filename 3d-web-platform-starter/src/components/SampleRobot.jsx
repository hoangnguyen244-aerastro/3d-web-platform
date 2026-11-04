export default function SampleRobot({ color, metalness, roughness }) {
  const mat = { color, metalness, roughness };
  return <group>
    <mesh position={[0, 0, 0]}><boxGeometry args={[1, 1.2, 0.6]}/><meshStandardMaterial {...mat}/></mesh>
    <mesh position={[0, 0.94, 0]}><boxGeometry args={[0.8, 0.65, 0.6]}/><meshStandardMaterial {...mat}/></mesh>
    {[-0.19,0.19].map(x=><mesh key={x} position={[x, 1.0, 0.31]}><sphereGeometry args={[0.07,16,16]}/><meshStandardMaterial color="#8aefff" emissive="#3fc5ff" emissiveIntensity={1}/></mesh>)}
    {[-0.67,0.67].map(x=><mesh key={'arm'+x} position={[x, 0.05, 0]}><boxGeometry args={[0.22, 0.8, 0.27]}/><meshStandardMaterial {...mat}/></mesh>)}
    {[-0.28,0.28].map(x=><mesh key={'leg'+x} position={[x,-0.88,0]}><boxGeometry args={[0.28,0.55,0.33]}/><meshStandardMaterial {...mat}/></mesh>)}
    <mesh position={[0, 0.14, 0.32]}><boxGeometry args={[0.4,0.2,0.03]}/><meshStandardMaterial color="#113a5d" emissive="#008dd6" emissiveIntensity={0.5}/></mesh>
    <mesh position={[0, 1.35, 0]}><cylinderGeometry args={[0.035,0.035,0.24,12]}/><meshStandardMaterial color="#cad7e5" metalness={0.8}/></mesh>
    <mesh position={[0, 1.5, 0]}><sphereGeometry args={[0.08,16,16]}/><meshStandardMaterial color="#ff7788" emissive="#ff3366" emissiveIntensity={0.5}/></mesh>
  </group>;
}
