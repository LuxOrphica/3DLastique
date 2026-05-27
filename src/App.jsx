import { useState, useEffect } from "react";
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
import PomBuilder from "./tools/pom/PomBuilder";
import TechPackBuilder from "./tools/pom/TechPackBuilder";
import TechPackGuidePage from "./tools/pom/TechPackGuidePage";
import TechPackHub from "./tools/pom/TechPackHub";
import NodeCatalog from "./tools/nodes/NodeCatalog";
import VseReview from "./tools/vse/VseReview";
import "./index.css";

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
          <PomBuilder lang={lang} />
        </div>
      } />
      <Route path="/tools/techpack" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <TechPackBuilder lang={lang} />
        </div>
      } />
      <Route path="/tools/techpack-hub" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <TechPackHub />
        </div>
      } />
      <Route path="/tools/techpack/guides/:slug" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <TechPackGuidePage />
        </div>
      } />
      <Route path="/tools/nodes" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <NodeCatalog lang={lang} />
        </div>
      } />
      <Route path="/tools/vse" element={
        <div style={{ position: "relative" }}>
          <Header t={t} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
          <VseReview />
        </div>
      } />
    </Routes>
  );
}
