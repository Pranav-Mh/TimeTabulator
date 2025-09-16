import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Syllabus", path: "/syllabus" },
  { label: "Teacher", path: "/teacher" },
  { label: "Assign Theory", path: "/assign-theory" }, // ✅ Replaced Lecture
  { label: "Lab", path: "/lab" },
  { label: "Configure Resources", path: "/resources" },
  { label: "Generator", path: "/generator" },
];

const Sidebar = ({ activeStep }) => {
  const location = useLocation();

  return (
    <aside>
      <nav>
        {menuItems.map((item, idx) => {
          // Enable only steps up to activeStep
          const enabled = idx <= activeStep;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.label}
              to={enabled ? item.path : '#'}
              className={isActive ? 'active' : enabled ? 'enabled' : ''}
              tabIndex={enabled ? 0 : -1}
              aria-disabled={!enabled}
              style={{
                pointerEvents: enabled ? 'auto' : 'none',
                color: isActive ? '#2563eb' : enabled ? '#3869e9' : '#b7bad9',
                fontWeight: isActive ? 'bold' : 'normal',
                background: isActive ? '#e0e7ff' : 'none',
                opacity: enabled ? 1 : 0.5,
                textDecoration: enabled ? 'none' : 'underline'
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
