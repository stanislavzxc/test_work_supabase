import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function TaskDetails({ taskId, profile, onBack }: { taskId: string, profile: any, onBack: () => void }) {
  const [task, setTask] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const fetchTask = async () => {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single()

if (error) {
  console.error("ОШИБКА ЗАГРУЗКИ ЗАДАЧИ:", error);
}
    const { data: hist } = await supabase.from('task_history').select('*').eq('task_id', taskId).order('changed_at', { ascending: false })
    setTask(data)
    setHistory(hist || [])
  }

  useEffect(() => { fetchTask() }, [taskId])

  const changeStatus = async (newStatus: string, requireComment = false) => {
    if (requireComment && !comment) {
      return setError('Комментарий обязателен при возврате на доработку')
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (updateError) {
      return setError('Ошибка (RLS): у вас нет прав на это действие')
    }

    // Пишем историю
    await supabase.from('task_history').insert({
      task_id: taskId,
      changed_by: profile.id,
      old_status: task.status,
      new_status: newStatus,
      comment: comment || null
    })

    setComment('')
    setError('')
    fetchTask() // Обновляем данные
  }

  if (!task) return <div>Загрузка...</div>

  // --- ЛОГИКА ОТОБРАЖЕНИЯ КНОПОК ---
  const renderActions = () => {
    if (profile.role === 'manager') {
      if (task.status === 'review') {
        return (
          <div>
            <button onClick={() => changeStatus('accepted')}>Принять</button>
            <div style={{ marginTop: 10 }}>
              <input 
                placeholder="Комментарий (обязателен)" 
                value={comment} onChange={e => setComment(e.target.value)} 
              />
              <button onClick={() => changeStatus('rework', true)}>На доработку</button>
            </div>
          </div>
        )
      }
    }

    if (profile.role === 'worker' && task.assignee_id === profile.id) {
      if (task.status === 'new') return <button onClick={() => changeStatus('in_progress')}>Взять в работу</button>
      if (task.status === 'in_progress') return <button onClick={() => changeStatus('review')}>Отправить на проверку</button>
      if (task.status === 'rework') return <button onClick={() => changeStatus('in_progress')}>Продолжить работу</button>
    }

    return <p>Нет доступных действий</p>
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <button onClick={onBack}>← Назад</button>
      <h2>{task.title}</h2>
      <p><b>Описание:</b> {task.description}</p>
      <p><b>Статус:</b> {task.status}</p>

      <div style={{ background: '#f0f0f0', padding: 10, margin: '20px 0' }}>
        <h4>Действия:</h4>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {renderActions()}
      </div>

      <h3>История изменений</h3>
      <ul>
        {history.map(h => (
          <li key={h.id}>
            {new Date(h.changed_at).toLocaleString()}: {h.old_status} → {h.new_status}
            {h.comment && ` (Комментарий: ${h.comment})`}
          </li>
        ))}
      </ul>
    </div>
  )
}