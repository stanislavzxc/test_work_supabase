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
      console.error("ОШИБКА ЗАГРУЗКИ:", error);
      return
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
      return setError(`Ошибка: ${updateError.message}`)
    }

    /*
    await supabase.from('task_history').insert({
      task_id: taskId,
      changed_by: profile.id,
      old_status: task.status,
      new_status: newStatus,
      comment: comment || null
    })
    */

    setComment('')
    setError('')
    fetchTask()
  }

  const handleDeleteTask = async () => {
    if (!confirm('Вы уверены, что хотите удалить задачу?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    
    if (error) {
      alert(`Не удалось удалить: ${error.message}`)
    } else {
      onBack()
    }
  }

  if (!task) return <div style={{ padding: 20 }}>Загрузка...</div>

  const renderActions = () => {
    if (profile.role === 'manager') {
      if (task.status === 'review') {
        return (
          <div>
            <button onClick={() => changeStatus('accepted')} style={{ marginRight: 10 }}>Принять</button>
            <div style={{ marginTop: 10 }}>
              <input 
                placeholder="Комментарий (обязателен)" 
                value={comment} onChange={e => setComment(e.target.value)} 
                style={{ marginRight: 10 }}
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

    return <p style={{ color: '#888' }}>Нет доступных действий для этой роли в текущем статусе.</p>
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ С КНОПКАМИ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
        <button onClick={onBack}>← Назад</button>
        
        {/* КНОПКА УДАЛЕНИЯ ТОЛЬКО ДЛЯ МЕНЕДЖЕРА */}
        {profile.role === 'manager' && (
          <button onClick={handleDeleteTask} style={{ color: 'red', background: 'none', border: '1px solid red', padding: '5px 10px', borderRadius: 4 }}>
            Удалить задачу
          </button>
        )}
      </div>
      
      <h2>{task.title}</h2>
      <p><b>Описание:</b> {task.description || 'Нет описания'}</p>
      <p><b>Текущий статус:</b> <span style={{ fontWeight: 'bold' }}>{task.status}</span></p>

      <div style={{ background: '#f0f0f0', padding: 15, margin: '20px 0', border: '1px solid #ddd' }}>
        <h4 style={{ marginTop: 0 }}>Действия:</h4>
        {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
        {renderActions()}
      </div>

      <h3>История изменений</h3>
      {history.length === 0 && <p>История пуста</p>}
      <ul style={{ paddingLeft: 20 }}>
        {history.map(h => (
          <li key={h.id} style={{ marginBottom: 5 }}>
            <span style={{ color: '#666' }}>{new Date(h.changed_at).toLocaleString()}</span>: <b>{h.old_status}</b> → <b>{h.new_status}</b>
            {h.comment && <span> (Комментарий: {h.comment})</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}