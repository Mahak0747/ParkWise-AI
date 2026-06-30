import { useState, useEffect } from 'react'
import { Bell, Search, User, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

export default function TopBar() {

  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])


  const formatted = time.toLocaleTimeString(
    'en-IN',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    }
  )


  const dateFormatted = time.toLocaleDateString(
    'en-IN',
    {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    }
  )


  return (

    <header
      className="flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0"
      style={{
        background: 'rgba(15,23,42,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}
    >


      {/* Brand Section */}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-3"
      >

        <div className="flex items-center gap-3">

          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)'
            }}
          >
            <Shield size={18} className="text-white" />
          </div>


          <div>

            <p className="font-bold text-white text-base leading-none">
              ParkWise AI
            </p>

            <p className="text-slate-500 text-xs">
              Bengaluru Traffic Command Center
            </p>

          </div>


        </div>



        {/* System Status only desktop */}

        <div className="hidden md:block h-8 w-px bg-white/10" />


        <div className="hidden md:flex items-center gap-2">

          <span className="relative flex h-2 w-2">

            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-low opacity-75" />

            <span className="relative inline-flex rounded-full h-2 w-2 bg-low" />

          </span>


          <span className="text-low text-xs font-medium">
            System Operational
          </span>


        </div>


      </motion.div>




      {/* Search only desktop */}

      <div className="hidden md:block flex-1 max-w-md mx-8">

        <div className="relative">

          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />


          <input
            type="text"
            placeholder="Search stations, junctions, vehicles..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none"
          />

        </div>

      </div>





      {/* Right Section */}

      <div className="flex items-center gap-3">


        {/* Timer */}

        <div className="text-right">

          <p className="font-mono text-white text-sm font-semibold">
            {formatted}
          </p>


          <p className="hidden md:block text-slate-500 text-xs">
            IST · {dateFormatted}
          </p>

        </div>



        {/* Desktop actions */}

        <div className="hidden md:flex items-center gap-3">


          <button className="relative p-2 rounded-lg bg-white/5 border border-white/10">

            <Bell size={15} className="text-slate-400" />

            <span className="absolute top-1 right-1 w-2 h-2 bg-critical rounded-full" />

          </button>




          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">


            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-blue-700 flex items-center justify-center">

              <User size={12} className="text-white" />

            </div>



            <div>

              <p className="text-white text-xs font-medium">
                Cmd. Officer
              </p>


              <p className="text-slate-500 text-xs">
                Admin
              </p>


            </div>


          </div>


        </div>


      </div>


    </header>

  )
}