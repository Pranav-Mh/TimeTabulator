import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r min-h-screen">
      <div className="p-4 border-b">
        <div className="text-xl font-bold">TimeTabulator</div>
        <div className="text-sm text-gray-500">Admin</div>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          <li><Link to="/" className="text-gray-700 hover:text-blue-600">Dashboard</Link></li>
          <li><Link to="/syllabus" className="text-gray-700 hover:text-blue-600">Syllabus</Link></li>
        </ul>
      </nav>
    </aside>
  );
}
