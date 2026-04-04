import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import ManualEntry from "@/pages/ManualEntry";
import CsvUpload from "@/pages/CsvUpload";
import Results from "@/pages/Results";
import HistoryPage from "@/pages/HistoryPage";
import UsersPage from "@/pages/UsersPage";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { TransactionsProvider } from "@/context/TransactionsContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/manual-entry" element={<ManualEntry />} />
        <Route path="/csv-upload" element={<CsvUpload />} />
        <Route path="/results" element={<Results />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DashboardLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TransactionsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </TransactionsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
