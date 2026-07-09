import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Palestra from "./pages/Palestra";
import Alimentazione from "./pages/Alimentazione";
import Timer from "./pages/Timer";
import Profilo from "./pages/Profilo";
import Impostazioni from "./pages/Impostazioni";
import ImpostazioniColori from "./pages/ImpostazioniColori";
import ImpostazioniObiettivi from "./pages/ImpostazioniObiettivi";
import ImpostazioniLingua from "./pages/ImpostazioniLingua";
import Registrazione from "./pages/Registrazione";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/palestra" element={<Palestra />} />
        <Route path="/alimentazione" element={<Alimentazione />} />
        <Route path="/timer" element={<Timer />} />
        <Route path="/profilo" element={<Profilo />} />
        <Route path="/impostazioni" element={<Impostazioni />} />
        <Route path="/impostazioni/colori" element={<ImpostazioniColori />} />
        <Route path="/impostazioni/obiettivi" element={<ImpostazioniObiettivi />} />
        <Route path="/impostazioni/lingua" element={<ImpostazioniLingua />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/registrazione" element={<Registrazione />} />
    </Routes>
  );
}

export default App;