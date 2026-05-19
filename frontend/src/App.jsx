import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function App() {
  const [token, setToken] = useState(null)
  const [currentUser, setCurrentUser] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("securepassword123")
  const [loginError, setLoginError] = useState("")

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- LOGIC: LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError("")
    try {
      const res = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: loginEmail, password: loginPassword })
      })
      if (!res.ok) throw new Error("Invalid credentials")
      const data = await res.json()
      setToken(data.access_token)
      setCurrentUser(loginEmail)
      fetchTasks(data.access_token)
    } catch (error) {
      setLoginError("Login failed. Check your credentials.")
    }
  }

  const handleLogout = () => {
    setToken(null)
    setTasks([])
    setCurrentUser("")
    setLoginEmail("")
  }

  const fetchTasks = async (authToken) => {
    setLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/tasks', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      setTasks(await res.json())
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, description })
      })
      if (res.ok) {
        const newTask = await res.json()
        setTasks([newTask, ...tasks])
        setTitle("")
        setDescription("")
      }
    } catch (error) {
      console.error("Error creating task:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- LOGIC: DATA CRUNCHING FOR CHARTS ---
  const getChartData = () => {
    const deptCounts = {}
    const prioCounts = { High: 0, Medium: 0, Low: 0 }

    tasks.forEach(t => {
      // Tally Departments
      const dept = t.assigned_department || 'Unassigned'
      deptCounts[dept] = (deptCounts[dept] || 0) + 1
      // Tally Priorities
      if (prioCounts[t.priority] !== undefined) prioCounts[t.priority]++
    })

    const pieData = Object.keys(deptCounts).map(key => ({ name: key, value: deptCounts[key] }))
    const barData = [
      { name: 'High', count: prioCounts.High, fill: '#ff4d4f' },
      { name: 'Medium', count: prioCounts.Medium, fill: '#faad14' },
      { name: 'Low', count: prioCounts.Low, fill: '#52c41a' }
    ]

    return { pieData, barData }
  }

  const { pieData, barData } = getChartData()
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  // ==========================================
  // RENDER SCREEN 1: LOGIN
  // ==========================================
  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f9', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '300px' }}>
          <h2 style={{ marginTop: 0, textAlign: 'center' }}>Enterprise Login</h2>
          {loginError && <p style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{loginError}</p>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="email" placeholder="Email address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
            <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} required />
            <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Log In</button>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER SCREEN 2: DASHBOARD
  // ==========================================
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f4f4f9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ color: '#333', margin: '0 0 5px 0' }}>AI Task Dashboard</h1>
            <p style={{ color: '#666', margin: 0 }}>Logged in as: <strong>{currentUser}</strong></p>
          </div>
          <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>

        {/* ADMIN ANALYTICS DASHBOARD (Only shows for the Boss) */}
        {currentUser === 'boss@test.com' && tasks.length > 0 && (
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            
            {/* PIE CHART: Department Workload */}
            <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, textAlign: 'center', color: '#555' }}>Department Workload</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* BAR CHART: Crisis Levels */}
            <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, textAlign: 'center', color: '#555' }}>Company Crisis Levels</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}

        {currentUser === 'dispatcher@test.com' && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0 }}>Create New Task</h3>
                <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" placeholder="Task Title (e.g. Server Crash)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }} required />
                    <textarea placeholder="Provide details for the AI to analyze..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit', fontSize: '14px' }} />
                    <button type="submit" disabled={isSubmitting} style={{ padding: '12px', backgroundColor: isSubmitting ? '#999' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'wait' : 'pointer', fontWeight: 'bold' }}>{isSubmitting ? 'AI is Analyzing...' : 'Create & Analyze Task'}</button>
                </form>
            </div>
        )}

        {loading ? <p>Loading your secure dashboard...</p> : tasks.length === 0 ? <p style={{ textAlign: 'center', color: '#666' }}>No tasks found for your department.</p> : (
          tasks.map(task => (
            <div key={task.id} style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderLeft: task.priority === 'High' ? '5px solid #ff4d4f' : task.priority === 'Medium' ? '5px solid #faad14' : '5px solid #52c41a', padding: '20px', marginBottom: '15px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#111', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                {task.title} 
                <span style={{ fontSize: '14px', color: task.priority === 'High' ? '#ff4d4f' : task.priority === 'Medium' ? '#faad14' : '#52c41a' }}>({task.priority})</span>
                {task.assigned_department && <span style={{ fontSize: '12px', color: '#555', backgroundColor: '#eee', padding: '4px 8px', borderRadius: '12px', fontWeight: 'normal' }}>{task.assigned_department}</span>}
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