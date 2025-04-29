import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Home from "./pages/Home/home";
import Brackets from "./pages/Brackets/brackets";
import Login from "./pages/Login/login";
import Register from "./pages/Register/register";
import CreateCompetition from "./pages/CreateCompetition/createCompetition";
import CompetitionPage from "./pages/CompetitionPage/competitionPage";

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Home />
                        </ProtectedRoute>
                    } />
                    <Route path="/brackets" element={<Brackets />} />
                    <Route path="/create-competition" element={<CreateCompetition />} />
                    <Route path="/competition/:id" element={<CompetitionPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}
