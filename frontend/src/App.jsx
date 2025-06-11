import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Home from "./pages/Home/home";
import Brackets from "./pages/Brackets/brackets";
import Login from "./pages/Login/login";
import Register from "./pages/Register/register";
import CreateCompetition from "./pages/CreateCompetition/createCompetition";
import CompetitionPage from "./pages/CompetitionPage/competitionPage";
import Competitions from "./pages/Competitions/competitions";
import MatchDashboard from "./pages/MatchDashboard/matchDashboard";
import PublicView from "./pages/PublicView/publicView";
import LivestreamPage from "./pages/LivestreamPage/livestreamPage";

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/brackets" element={<Brackets />} />
                    <Route path="/competitions" element={<Competitions />} />
                    <Route path="/competition/:id" element={<CompetitionPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/match-dashboard" element={<MatchDashboard />} />
                    <Route path="/public-view" element={<PublicView />} />
                    <Route path="/livestream" element={<LivestreamPage />} />
                    <Route
                        path="/create-competition"
                        element={
                            <ProtectedRoute>
                                <CreateCompetition />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </AuthProvider>
        </Router>
    );
}
