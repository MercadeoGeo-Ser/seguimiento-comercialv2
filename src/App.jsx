import { useState } from "react";
import LiveFeed from "./tabs/LiveFeed.jsx";
import Resumen from "./tabs/Resumen.jsx";
import Embudo from "./tabs/Embudo.jsx";
import Rendimiento from "./tabs/Rendimiento.jsx";
import MetaVsCRM from "./tabs/MetaVsCRM.jsx";
import WhatsAppLeads from "./tabs/WhatsAppLeads.jsx";

const TABS = [
  { id: "live-feed", label: "Live Feed", icon: "⚡" },
  { id: "resumen", label: "Resumen", icon: "📊" },
  { id: "embudo", label: "Embudo", icon: "🔽" },
  { id: "rendimiento", label: "Rendimiento", icon: "🏆" },
  { id: "meta-crm", label: "Meta vs CRM", icon: "🔗" },
  { id: "whatsapp-leads", label: "WhatsApp Leads", icon: "💬" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          width: 240,
          minHeight: "100vh",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            Seguimiento
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Comercial · Geotours</div>
        </div>

        {TABS.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              margin: "2px 8px",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.15s",
              background: activeTab === tab.id ? "rgba(99,102,241,0.15)" : "transparent",
              borderLeft: activeTab === tab.id ? "3px solid #6366f1" : "3px solid transparent",
              color: activeTab === tab.id ? "#fff" : "#94a3b8",
            }}
          >
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            <span style={{ fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400 }}>
              {tab.label}
            </span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, background: "#f8fafc", minHeight: "100vh", overflow: "auto" }}>
        <div
          style={{
            padding: "20px 32px",
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
              {TABS.find((t) => t.id === activeTab)?.label}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              {new Date().toLocaleDateString("es-CO", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {activeTab === "live-feed" && <LiveFeed />}
          {activeTab === "resumen" && <Resumen />}
          {activeTab === "embudo" && <Embudo />}
          {activeTab === "rendimiento" && <Rendimiento />}
          {activeTab === "meta-crm" && <MetaVsCRM />}
          {activeTab === "whatsapp-leads" && <WhatsAppLeads />}
        </div>
      </div>
    </div>
  );
}
