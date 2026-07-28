import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";

export const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};
