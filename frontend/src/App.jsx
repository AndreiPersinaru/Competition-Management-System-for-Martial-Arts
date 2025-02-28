import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Brackets from "./pages/Brackets/brackets"

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home/> } />
                <Route path="/brackets" element={<Brackets/> } />
            </Routes>
        </Router>
    );
}
