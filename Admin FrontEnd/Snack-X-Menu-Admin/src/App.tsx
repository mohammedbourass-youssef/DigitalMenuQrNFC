import { Switch, Route, Router as WouterRouter } from "wouter";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import CategoriesPage from "@/pages/Categories";
import DashboardPage from "@/pages/Dashboard";
import MenuItemsPage from "@/pages/MenuItems";
import NFCTagsPage from "@/pages/NFCTags";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}> 
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <Sidebar />

        <main className="lg:pl-72">
          <TopBar />

          <div className="mx-auto max-w-7xl p-6">
            <Switch>
              <Route path="/">
                <DashboardPage />
              </Route>
              <Route path="/menu-items">
                <MenuItemsPage />
              </Route>
              <Route path="/categories">
                <CategoriesPage />
              </Route>
              <Route path="/nfc-tags">
                <NFCTagsPage />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </WouterRouter>
  );
}

export default App;
