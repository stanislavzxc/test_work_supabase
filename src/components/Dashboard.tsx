import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { TaskDetails } from './TaskDetails'

export function Dashboard({ profile }: { profile: any }) {
  const [objects, setObjects] = useState<any[]>([])
  const [tasks, setTasks] = useState<Record<number, any[]>>({})
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [workers, setWorkers] = useState<any[]>([])
  
  const [view, setView] = useState<'objects' | 'my-tasks'>('objects')
  const [myTasks, setMyTasks] = useState<any[]>([])

  const [newObjName, setNewObjName] = useState('')
  const [newObjAddress, setNewObjAddress] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedObjId, setSelectedObjId] = useState('')
  const [workerId, setWorkerId] = useState('')

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
    
    if (profile.role === 'worker') {
      const { data: myTasksData } = await supabase.from('tasks').select('*').eq('assignee_id', profile.id)
      setMyTasks(myTasksData || [])
    }
  }

  useEffect(() => {
    loadData() 
    supabase.from('profiles').select('id, role').eq('role', 'worker').then(({ data }) => {
      setWorkers(data || [])
    })
  }, [view])

  const handleCreateObject = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('objects').insert({ name: newObjName, address: newObjAddress })
    setNewObjName(''); setNewObjAddress(''); loadData()
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('tasks').insert({
      title: newTaskTitle,
      object_id: selectedObjId,
      assignee_id: workerId,
      author_id: profile.id,
      status: 'new'
    })
    setNewTaskTitle(''); loadData()
  }

  const handleDeleteObject = async (id: number) => {
    if (!confirm('Удалить объект и все его задачи?')) return
    await supabase.from('objects').delete().eq('id', id)
    loadData()
  }

  if (selectedTaskId) {
    return <TaskDetails taskId={selectedTaskId} profile={profile} onBack={() => {
        setSelectedTaskId(null) 
        loadData()
    }} 
        />
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Панель управления (Роль: {profile?.role})</h2>
        <button onClick={() => supabase.auth.signOut()}>Выйти</button>
      </div>

      {/* ВКЛАДКИ ДЛЯ ВОРКЕРА */}
      {profile?.role === 'worker' && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setView('objects')} style={{ fontWeight: view === 'objects' ? 'bold' : 'normal', marginRight: 10 }}>Объекты</button>
          <button onClick={() => setView('my-tasks')} style={{ fontWeight: view === 'my-tasks' ? 'bold' : 'normal' }}>Мои задачи</button>
        </div>
      )}

      {/* БЛОК ДЛЯ МЕНЕДЖЕРА */}
      {profile?.role === 'manager' && (
        <div style={{ background: '#000000', padding: 15, marginBottom: 20, border: '1px solid #ccc' }}>
          <h3>Создать объект</h3>
          <form onSubmit={handleCreateObject} style={{ marginBottom: 15 }}>
            <input placeholder="Название" value={newObjName} onChange={e => setNewObjName(e.target.value)} required style={{ marginRight: 10 }} />
            <input placeholder="Адрес" value={newObjAddress} onChange={e => setNewObjAddress(e.target.value)} required style={{ marginRight: 10 }} />
            <button type="submit">Добавить</button>
          </form>

          <h3>Создать задачу</h3>
          <form onSubmit={handleCreateTask}>
            <input placeholder="Название задачи" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required style={{ marginRight: 10 }} />
            <select value={selectedObjId} onChange={e => setSelectedObjId(e.target.value)} required style={{ marginRight: 10 }}>
              <option value="">Объект...</option>
              {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select value={workerId} onChange={e => setWorkerId(e.target.value)} required style={{ marginRight: 10 }}>
              <option value="">Исполнитель...</option>
              {workers.map(w => <option key={w.id} value={w.id}>ID: {w.id.slice(0, 8)}</option>)}
            </select>
            <button type="submit">Создать</button>
          </form>
        </div>
      )}

      {/* СПИСОК "МОИ ЗАДАЧИ" ДЛЯ ВОРКЕРА */}
      {profile?.role === 'worker' && view === 'my-tasks' && (
        <div>
          <h3>Мои задачи</h3>
          {myTasks.length === 0 && <p>У вас пока нет задач.</p>}
          <ul>
            {myTasks.map(task => (
              <li key={task.id} style={{ marginBottom: 10 }}>
                <b>{task.title}</b> (Статус: {task.status}) 
                <button onClick={() => setSelectedTaskId(task.id)} style={{ marginLeft: 10 }}>Открыть</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* СПИСОК ОБЪЕКТОВ */}
      {view === 'objects' && objects.map(obj => (
        <div key={obj.id} style={{ border: '1px solid #ccc', padding: 15, marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3>{obj.name}</h3>
            {profile?.role === 'manager' && (
              <button onClick={() => handleDeleteObject(obj.id)} style={{ color: 'red' }}>Удалить объект</button>
            )}
          </div>
          <p>{obj.address}</p>
          
          <h4>Задачи:</h4>
          {(!tasks[obj.id] || tasks[obj.id].length === 0) && <p>Задач нет</p>}
          <ul>
            {tasks[obj.id]?.map(task => (
              <li key={task.id} style={{ marginBottom: 5 }}>
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