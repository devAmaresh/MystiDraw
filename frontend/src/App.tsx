import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import DrawingPage from "./pages/play/page";
import LandingPage from "./pages/landing/page";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/play/:roomId" element={<DrawingPage />} />
      </Routes>
    </Router>
  );
};

export default App;
