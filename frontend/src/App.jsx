import { useState, useEffect } from 'react'

function App() {
  // 1. Memory for our tasks and authentication
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  // 2. Memory for our new form inputs
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Automatically log in and fetch tasks on load
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const loginRes = await fetch('http://127.0.0.1:8000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ username: 'ceo@test.com', password: 'securepassword123' })
        })
        const loginData = await loginRes.json()
        setToken(loginData.access_token) // Save the token so our form can use it!

        const tasksRes = await fetch('http://127.0.0.1:8000/tasks/', {
          headers: { 'Authorization': `Bearer ${loginData.access_token}` }
        })
        setTasks(await tasksRes.json())
        setLoading(false)
      } catch (error) {
        console.error("Error connecting to API:", error)
      }
    }
    fetchTasks()
  }, [])

  // 3. The function that runs when you hit "Create Task"
  const handleCreateTask = async (e) => {
    e.preventDefault() // Stop the page from refreshing
    if (!title.trim()) return // Don't submit if title is empty
    
    setIsSubmitting(true)

    try {
      const res = await fetch('http://127.0.0.1:8000/tasks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description })
      })
      
      if (res.ok) {
        const newTask = await res.json()
        // Instantly add the new AI-graded task to the top of our list!
        setTasks([newTask, ...tasks])
        // Clear the form
        setTitle("")
        setDescription("")
      }
    } catch (error) {
      console.error("Error creating task:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f4f4f9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        <h1 style={{ color: '#333', marginBottom: '5px' }}>AI Task Dashboard</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>Logged in as: <strong>ceo@test.com</strong></p>

        {/* --- THE NEW TASK FORM --- */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0 }}>Create New Task</h3>
          <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Task Title (e.g. Server Crash)" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
              required
            />
            <textarea 
              placeholder="Provide details for the AI to analyze..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit', fontSize: '14px' }}
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ 
                padding: '12px', 
                backgroundColor: isSubmitting ? '#999' : '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: isSubmitting ? 'wait' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isSubmitting ? 'AI is Analyzing...' : 'Create & Analyze Task'}
            </button>
          </form>
        </div>
        {/* ------------------------- */}

        {loading ? (
          <p>Loading AI data...</p>
        ) : (
          tasks.map(task => (
            <div key={task.id} style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderLeft: task.priority === 'High' ? '5px solid #ff4d4f' : task.priority === 'Medium' ? '5px solid #faad14' : '5px solid #52c41a',
              padding: '20px',
              marginBottom: '15px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#111' }}>
                {task.title} 
                <span style={{ fontSize: '14px', color: task.priority === 'High' ? '#ff4d4f' : task.priority === 'Medium' ? '#faad14' : '#52c41a', marginLeft: '10px' }}>
                  ({task.priority})
                </span>
              </h3>
              <p style={{ margin: 0, color: '#555', lineHeight: '1.5' }}>{task.description}</p>
            </div>
          ))
        )}

      </div>
    </div>
  )
}

  export default App