import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { TaskDetails } from './TaskDetails'

export function Dashboard({ profile }: { profile: any }) {
  const [objects, setObjects] = useState<any[]>([])
  const [tasks, setTasks] = useState<Record<number, any[]>>({})
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  
  const [workers, setWorkers] = useState<any[]>([])

  // Стейты для создания
  const [newObjName, setNewObjName] = useState('')
  const [newObjAddress, setNewObjAddress] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedObjId, setSelectedObjId] = useState('')
  const [workerId, setWorkerId] = useState('') // Сюда вставим UUID воркера

  // Функция загрузки данных (вынесена отдельно)
  const loadData = async () => {
    const { data: objs } = await supabase.from('objects').select('*')
    setObjects(objs || [])
    if (objs) {
      const tasksMap: Record<number, any[]> = {}
      for (const obj of objs) {
        const { data: taskData } = await supabase.from('tasks').select('*').eq('object_id', obj.id)
        tasksMap[obj.id] = taskData || []
      }
      setTasks(tasksMap)
    }
  }

  useEffect(() => {
    loadData() 
    
    supabase.from('profiles').select('id, role').eq('role', 'worker').then(({ data }) => {
    setWorkers(data || [])
  })
  }, [])

  const handleCreateObject = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('objects').insert({ name: newObjName, address: newObjAddress })
    setNewObjName('')
    setNewObjAddress('')
    loadData()
  }

  // Создание задачи
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('tasks').insert({
      title: newTaskTitle,
      object_id: selectedObjId,
      assignee_id: workerId, // UUID воркера
      author_id: profile.id, // UUID текущего менеджера
      status: 'new'
    })
    setNewTaskTitle('')
    loadData()
  }

  if (selectedTaskId) {
    return <TaskDetails taskId={selectedTaskId} profile={profile} onBack={() => setSelectedTaskId(null)} />
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Объекты (Роль: {profile?.role})</h2>
        <button onClick={() => supabase.auth.signOut()}>Выйти</button>
      </div>

      {/* БЛОК ДЛЯ МЕНЕДЖЕРА (Создание) */}
      {profile?.role === 'manager' && (
        <div style={{ background: '#eee', padding: 15, marginBottom: 20 }}>
          <h3>Создать объект</h3>
          <form onSubmit={handleCreateObject}>
            <input placeholder="Название" value={newObjName} onChange={e => setNewObjName(e.target.value)} required />
            <input placeholder="Адрес" value={newObjAddress} onChange={e => setNewObjAddress(e.target.value)} required />
            <button type="submit">Добавить объект</button>
          </form>

          <h3 style={{ marginTop: 20 }}>Создать задачу</h3>
          <form onSubmit={handleCreateTask}>
            <input placeholder="Название задачи" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required />
            <select value={selectedObjId} onChange={e => setSelectedObjId(e.target.value)} required>
              <option value="">Выберите объект</option>
              {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select value={workerId} onChange={e => setWorkerId(e.target.value)} required>
                <option value="">Выберите исполнителя</option>
                {workers.map(w => (
    <option key={w.id} value={w.id}>
      Исполнитель {w.id.slice(0, 8)}...
    </option>
  ))}
</select>
            <button type="submit">Создать задачу</button>
          </form>
        </div>
      )}

      {/* СПИСОК ОБЪЕКТОВ */}
      {objects.map(obj => (
        <div key={obj.id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
          <h3>{obj.name}</h3>
          <p>{obj.address}</p>
          <ul>
            {tasks[obj.id]?.map(task => (
              <li key={task.id}>
                {task.title} (Статус: {task.status}) 
                <button onClick={() => setSelectedTaskId(task.id)} style={{ marginLeft: 10 }}>Открыть</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}