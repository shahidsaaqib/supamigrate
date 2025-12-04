// Handle redirect from 404 page for single-page apps
if (window.location.pathname.includes('/?/')) {
	const newPath = '/' + window.location.pathname.split('/?/')[1].replace(/~and~/g, '&');
	window.history.replaceState(null, '', newPath);
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
