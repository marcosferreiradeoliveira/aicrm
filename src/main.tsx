import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HomePage } from "./pages/HomePage.tsx";
import { ManageBookingPage } from "./pages/ManageBookingPage.tsx";
import { PublicBookingPage } from "./pages/PublicBookingPage.tsx";
import "./index.css";

const App = lazy(() => import("./App.tsx"));

function bookingSlug(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const match = path.match(/^\/agendar\/([a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9]))$/);
  return match?.[1] ?? null;
}

function Root() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/index.html") return <HomePage />;
  if (path === "/agendar/gerenciar") return <ManageBookingPage />;
  const slug = bookingSlug(path);
  if (slug) return <PublicBookingPage slug={slug} />;
  if (path !== "/app") return <HomePage />;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#10152A] flex items-center justify-center text-white text-sm">
          Carregando BuildAI Leads...
        </div>
      }
    >
      <App />
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
