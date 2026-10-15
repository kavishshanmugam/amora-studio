import { useEffect, useRef } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { useNativeNotifications } from "./hooks/use-native-notifications";
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

function NotFoundPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => headingRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <section className="max-w-lg py-8">
      <p className="text-sm font-medium text-brand mb-2">404</p>
      <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-bold mb-3 outline-none">Page not found</h1>
      <p className="text-text-secondary mb-6">The page may have moved, or the address may be incorrect.</p>
      <Link to="/" className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Back to Today</Link>
    </section>
  );
}

export default function App() {
  useNativeNotifications();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus();
  }, [location.pathname]);

  return (
    <div className="app-shell flex min-h-dvh overflow-hidden">
      <Sidebar />
      <main ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto bg-bg p-6 outline-none">
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
          {import.meta.env.DEV && <Route path="/test-flows" element={<TestFlowsPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
