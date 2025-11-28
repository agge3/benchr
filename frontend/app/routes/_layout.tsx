import { Outlet } from "react-router";
import { Header } from "~/components/layout/Header";
import { Footer } from "~/components/layout/Footer";

export default function Layout() {
  return (
    <div className="h-screen flex flex-col bg-benchr-bg-main">
      {/* Header persists across all routes */}
      <Header />
      
      {/* Child routes render here */}
      <div className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </div>
      
      {/* Footer persists across all routes */}
      <Footer />
    </div>
  );
}
