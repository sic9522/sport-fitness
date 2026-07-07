import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Palestra from "./pages/Palestra";
import SchedaDettaglio from "./pages/SchedaDettaglio";
import Alimentazione from "./pages/Alimentazione";
import AiChat from "./pages/AiChat";
import Profilo from "./pages/Profilo";
import Impostazioni from "./pages/Impostazioni";
import ImpostazioniColori from "./pages/ImpostazioniColori";
import ImpostazioniObiettivi from "./pages/ImpostazioniObiettivi";
import ImpostazioniLingua from "./pages/ImpostazioniLingua";
import Login from "./pages/Login";
import Registrazione from "./pages/Registrazione";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/palestra" element={<Palestra />} />
        <Route path="/palestra/:schedaId" element={<SchedaDettaglio />} />
        <Route path="/alimentazione" element={<Alimentazione />} />
        <Route path="/ai-chat" element={<AiChat />} />
        <Route path="/profilo" element={<Profilo />} />
        <Route path="/impostazioni" element={<Impostazioni />} />
        <Route path="/impostazioni/colori" element={<ImpostazioniColori />} />
        <Route path="/impostazioni/obiettivi" element={<ImpostazioniObiettivi />} />
        <Route path="/impostazioni/lingua" element={<ImpostazioniLingua />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/registrazione" element={<Registrazione />} />
    </Routes>
  );
}

export default App;