import { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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
      const dept = t.assigned_department || 'Unassigned'
      deptCounts[dept] = (deptCounts[dept] || 0) + 1
      if (prioCounts[t.priority] !== undefined) prioCounts[t.priority]++
    })

    const pieData = Object.keys(deptCounts).map(key => ({ name: key, value: deptCounts[key] }))
    const barData = [
      { name: 'High', count: prioCounts.High, fill: '#ef4444' },   // Tailwind Red-500
      { name: 'Medium', count: prioCounts.Medium, fill: '#f59e0b' }, // Tailwind Amber-500
      { name: 'Low', count: prioCounts.Low, fill: '#10b981' }      // Tailwind Emerald-500
    ]

    return { pieData, barData }
  }

  const { pieData, barData } = getChartData()
  // Updated to Tailwind color palette
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] 

  // ==========================================
  // RENDER SCREEN 1: LOGIN
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Enterprise Login</h2>
            <p className="text-slate-500 mt-2 text-sm">Sign in to access the task dashboard</p>
          </div>
          
          {loginError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center mb-6 border border-red-100">
              {loginError}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <input 
                type="email" 
                placeholder="Email address" 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white" 
                required 
              />
            </div>
            <div>
              <input 
                type="password" 
                placeholder="Password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white" 
                required 
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md shadow-blue-500/30 mt-2"
            >
              Secure Log In
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER SCREEN 2: DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      
      {/* Premium Navigation Bar */}
      <nav className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center shadow-lg mb-8">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <div className="bg-blue-500 text-white p-2 rounded-lg font-bold shadow-inner">AI</div>
            <h1 className="text-xl font-semibold tracking-wide">Enterprise Dispatcher</h1>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-slate-300 text-sm hidden sm:block">
              Logged in as: <span className="text-white font-medium">{currentUser}</span>
            </span>
            <button 
                onClick={handleLogout} 
                className="bg-slate-800 hover:bg-red-500 border border-slate-700 hover:border-red-500 transition-all px-4 py-2 rounded-md text-sm font-medium shadow-sm"
            >
                Logout
            </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4">
        
        {/* ADMIN ANALYTICS DASHBOARD (Only shows for the Boss) */}
        {currentUser === 'boss@test.com' && tasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            
            {/* PIE CHART */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
              <h3 className="text-lg font-bold text-slate-700 mb-2">Department Workload</h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BAR CHART */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
              <h3 className="text-lg font-bold text-slate-700 mb-2">Company Crisis Levels</h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* DISPATCHER FORM */}
        {currentUser === 'dispatcher@test.com' && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 mb-10 max-w-3xl mx-auto">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800">Route a New Ticket</h3>
                <p className="text-sm text-slate-500">AI will automatically categorize and assign priority.</p>
              </div>
              
              <form onSubmit={handleCreateTask} className="flex flex-col gap-5">
                  <input 
                    type="text" 
                    placeholder="Brief title (e.g., Server Crash)" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all font-medium" 
                    required 
                  />
                  <textarea 
                    placeholder="Provide details for the AI to analyze..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-y bg-slate-50 focus:bg-white transition-all text-sm" 
                  />
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className={`py-3 px-4 rounded-lg font-bold transition-all shadow-md mt-2 flex justify-center items-center ${isSubmitting ? 'bg-slate-400 text-slate-100 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'}`}
                  >
                    {isSubmitting ? 'Processing via AI...' : 'Analyze & Dispatch Ticket'}
                  </button>
              </form>
          </div>
        )}

        {/* TASK LIST */}
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500 font-medium">Syncing with secure database...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
              <p className="text-slate-500 font-medium text-lg">Inbox Zero</p>
              <p className="text-slate-400 text-sm mt-1">No tasks assigned to your department.</p>
            </div>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id} 
                className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all border-l-4 
                  ${task.priority === 'High' ? 'border-l-red-500' : 
                    task.priority === 'Medium' ? 'border-l-amber-500' : 
                    'border-l-emerald-500'}`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                  <h4 className="text-lg font-bold text-slate-800 leading-tight">{task.title}</h4>
                  
                  {/* Dynamic Priority Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap self-start
                      ${task.priority === 'High' ? 'bg-red-100 text-red-700' : 
                        task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 
                        'bg-emerald-100 text-emerald-700'}`}
                  >
                      {task.priority} Priority
                  </span>
                </div>
                
                <p className="text-slate-600 text-sm mb-5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {task.description}
                </p>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8"></path></svg>
                    {task.assigned_department}
                  </span>
                  
                  {/* The Resolve Button Shell */}
                  {currentUser !== 'boss@test.com' && currentUser !== 'dispatcher@test.com' && (
                      <button className="text-sm font-bold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors border border-emerald-200 hover:border-emerald-500 shadow-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                          Resolve Ticket
                      </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}

export default App