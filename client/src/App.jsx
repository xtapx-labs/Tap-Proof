import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Landing from './pages/Landing';
import Verify from './pages/Verify';
import History from './pages/History';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/scan" element={<Verify />} />
        <Route path="/history" element={<History />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}
