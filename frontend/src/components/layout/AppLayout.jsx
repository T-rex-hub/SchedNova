

import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import Footer from "./footer.jsx";
export default function AppLayout({ children, hideSidebar = false }) {

  const bgGradient =
    "bg-gradient-to-b from-[#3B0D91] via-[#6A00F4] to-[#1D9AF0]";

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`flex flex-col min-h-screen text-white ${bgGradient}`}>
      
      <div className="flex flex-1">
        
        {!hideSidebar && (
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        )}

        <div className="flex-1 flex flex-col">
          
          <Header setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 p-8 overflow-y-auto">
            {children}
          </main>
          <Footer />

        </div>
      </div>

    </div>
  );
}