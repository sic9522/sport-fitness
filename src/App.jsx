import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import PageLoader from "./components/PageLoader";

// Pagine caricate on-demand (code-splitting per rotta): riduce il bundle
// iniziale, ogni pagina arriva nel suo chunk al primo accesso. Il fallback
// dentro Layout (Suspense) preserva la shell TopBar/Footer/TimerPill.
const Home = lazy(() => import("./pages/Home"));
const Palestra = lazy(() => import("./pages/Palestra"));
const Alimentazione = lazy(() => import("./pages/Alimentazione"));
const Timer = lazy(() => import("./pages/Timer"));
const Insights = lazy(() => import("./pages/Insights"));
const Peso = lazy(() => import("./pages/Peso"));
// Sezione predisposta ma non ancora esposta: nessun link la mostra (vedi config/features.js).
const MisureCorporee = lazy(() => import("./pages/MisureCorporee"));
const Profilo = lazy(() => import("./pages/Profilo"));
const ImpostazioniColori = lazy(() => import("./pages/ImpostazioniColori"));
const ImpostazioniObiettivi = lazy(() => import("./pages/ImpostazioniObiettivi"));
const ImpostazioniLingua = lazy(() => import("./pages/ImpostazioniLingua"));
const ImpostazioniBackup = lazy(() => import("./pages/ImpostazioniBackup"));
const Registrazione = lazy(() => import("./pages/Registrazione"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  return (
    // Boundary esterno: copre /registrazione (fuori da Layout) e il primo caricamento.
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/palestra" element={<Palestra />} />
          <Route path="/alimentazione" element={<Alimentazione />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/peso" element={<Peso />} />
          <Route path="/misure" element={<MisureCorporee />} />
          <Route path="/profilo" element={<Profilo />} />
          <Route path="/impostazioni/colori" element={<ImpostazioniColori />} />
          <Route path="/impostazioni/obiettivi" element={<ImpostazioniObiettivi />} />
          <Route path="/impostazioni/lingua" element={<ImpostazioniLingua />} />
          <Route path="/impostazioni/backup" element={<ImpostazioniBackup />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/registrazione" element={<Registrazione />} />
      </Routes>
    </Suspense>
  );
}

export default App;
