import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Map,
  BarChart3,
  Brain,
  Car,
  Settings,
  Activity,
} from 'lucide-react'


const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/map', icon: Map, label: 'Hotspot Map' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/model', icon: Brain, label: 'Model Insights' },
  { to: '/vehicles', icon: Car, label: 'Vehicle Search' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]


export default function Sidebar() {

  return (
    <motion.aside

      initial={{ x:-20, opacity:0 }}
      animate={{ x:0, opacity:1 }}
      transition={{ duration:0.4 }}

      className="
      flex-shrink-0 
      flex 
      flex-col 
      h-full
      w-16
      md:w-64
      "

      style={{
        background:'rgba(15,23,42,0.95)',
        borderRight:'1px solid rgba(255,255,255,0.05)',
      }}

    >


      {/* Navigation */}

      <nav
        className="
        flex-1 
        px-2
        md:px-3
        py-4 
        space-y-1 
        overflow-y-auto
        "
      >


        {/* Navigation heading only desktop */}

        <p
          className="
          hidden 
          md:block
          text-slate-600 
          text-xs 
          font-semibold 
          uppercase 
          tracking-wider 
          px-3 
          mb-3
          "
        >
          Navigation
        </p>



        {
          navItems.map(({to, icon:Icon, label, end}) => (

            <NavLink

              key={to}
              to={to}
              end={end}

              className={({isActive}) =>
              `
              nav-item
              ${isActive ? 'active':''}
              justify-center
              md:justify-start
              `
              }

            >

              {
                ({isActive}) => (

                  <>


                    <Icon

                      size={18}

                      className={`
                      flex-shrink-0
                      ${isActive 
                      ? 'text-accent'
                      : 'text-slate-500'}
                      `}

                    />



                    {/* Name visible only desktop */}

                    <span
                      className="
                      hidden 
                      md:block
                      "
                    >
                      {label}
                    </span>



                    {/* Active dot only desktop */}

                    {
                      isActive && (

                        <motion.div

                          layoutId="nav-indicator"

                          className="
                          hidden
                          md:block
                          ml-auto 
                          w-1.5 
                          h-1.5 
                          rounded-full 
                          bg-accent
                          "

                        />

                      )
                    }


                  </>

                )
              }


            </NavLink>


          ))
        }


      </nav>




      {/* Footer only desktop */}

      <div

        className="
        hidden
        md:block
        px-5 
        py-4 
        border-t 
        border-white/5
        "

      >

        <div className="flex items-center gap-2">

          <Activity 
            size={12}
            className="text-slate-600"
          />

          <span className="
          text-slate-600 
          text-xs 
          font-mono
          ">
            v0.1.0 · Phase 1
          </span>

        </div>


        <p className="
        text-slate-700 
        text-xs 
        mt-1
        ">
          © Bengaluru Traffic Police
        </p>


      </div>


    </motion.aside>
  )
}