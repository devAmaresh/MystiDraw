import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import DrawingPage from "./pages/play/page";
import LandingPage from "./pages/landing/page";
import { useEffect } from "react";

const App = () => {
  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch(() => {
          // Ignore errors during cleanup
        });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
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
