import { Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { TodayPage } from "./pages/TodayPage";
import { EventsPage } from "./pages/EventsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ContactsPage } from "./pages/ContactsPage";
import { VenuesPage } from "./pages/VenuesPage";
import { InventoryPage } from "./pages/InventoryPage";
import { PriceListPage } from "./pages/PriceListPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { TestFlowsPage } from "./pages/TestFlowsPage";

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/venues" element={<VenuesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/price-list" element={<PriceListPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/test-flows" element={<TestFlowsPage />} />
        </Routes>
      </main>
    </div>
  );
}
