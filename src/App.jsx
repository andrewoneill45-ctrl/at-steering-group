import SteeringGroup from './SteeringGroup.jsx'
import { useSync } from './useSync.js'

export default function App() {
  const { themes, setThemes, syncStatus } = useSync()
  return <SteeringGroup themes={themes} setThemes={setThemes} syncStatus={syncStatus} />
}
