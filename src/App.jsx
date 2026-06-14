import { Suspense, lazy, useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { T } from "./lang";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import HowItWorks from "./components/HowItWorks";
import ForWhom from "./components/ForWhom";
import Products from "./components/Products";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import "./index.css";

const PomBuilder = lazy(() => import("./tools/pom/PomBuilder"));
const TechPackBuilder = lazy(() => import("./tools/pom/TechPackBuilder"));
const TechPackGuidePage = lazy(() => import("./tools/pom/TechPackGuidePage"));
const TechPackHub = lazy(() => import("./tools/pom/TechPackHub"));
const NodeCatalog = lazy(() => import("./tools/nodes/NodeCatalog"));
const VseReview = lazy(() => import("./tools/vse/VseReview"));

function ToolFallback() {
  return <div style={{ padding: 24 }}>Загрузка...</div>;
}

function LandingPage({ t, lang, setLang, theme, toggleTheme }) {
  return (
    <div style={{ position: "relative" }}>
      <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
      <main>
        <Hero t={t} />
        <Services t={t} />
        <HowItWorks t={t} />
        <ForWhom t={t} />
        <Products t={t} />
        <Contact t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState("ru");
  const [theme, setTheme] = useState("light");
  const t = T[lang];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  return (
    <Routes>
      <Route path="/" element={
        <LandingPage t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
      } />
      <Route path="/tools/pom" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <Suspense fallback={<ToolFallback />}>
            <PomBuilder lang={lang} />
          </Suspense>
        </div>
      } />
      <Route path="/tools/techpack" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <Suspense fallback={<ToolFallback />}>
            <TechPackBuilder lang={lang} />
          </Suspense>
        </div>
      } />
      <Route path="/tools/techpack-hub" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <Suspense fallback={<ToolFallback />}>
            <TechPackHub />
          </Suspense>
        </div>
      } />
      <Route path="/tools/techpack/guides/:slug" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <Suspense fallback={<ToolFallback />}>
            <TechPackGuidePage />
          </Suspense>
        </div>
      } />
      <Route path="/tools/nodes" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <Suspense fallback={<ToolFallback />}>
            <NodeCatalog lang={lang} />
          </Suspense>
        </div>
      } />
      <Route path="/tools/vse" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <Suspense fallback={<ToolFallback />}>
            <VseReview />
          </Suspense>
        </div>
      } />
    </Routes>
  );
}
