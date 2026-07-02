import { useState } from "react";
import LiveFeed from "./tabs/LiveFeed.jsx";
import Resumen from "./tabs/Resumen.jsx";

const TABS = [
  { id: "live-feed", label: "Live Feed" },
  { id: "resumen", label: "Resumen" },
  { id: "embudo", label: "Embudo" },
  { id: "rendimiento", label: "Rendimiento" },
  { id: "meta-crm", label: "Meta vs CRM" },
  { id: "whatsapp-leads", label: "WhatsApp Leads" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 flex flex-col bg-gray-900 text-gray-100">
        <div className="border-b border-gray-800 px-6 py-5 text-lg font-semibold">
          Seguimiento Comercial
        </div>
        <nav className="flex-1 py-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full border-l-4 px-6 py-3 text-left text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-500 bg-gray-800 text-white"
                  : "border-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {activeTab === "live-feed" && <LiveFeed />}
        {activeTab === "resumen" && <Resumen />}
      </main>
    </div>
  );
}
