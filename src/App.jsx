import { useState, useEffect } from "react";
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

export default function App() {
  const [lang, setLang] = useState("ru");
  const [theme, setTheme] = useState("dark");
  const t = T[lang];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

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
