// Handle redirect payload from 404.html (encoded)
(function() {
	// We expect URLs like: /<base>/?/<encodedPath>&<encodedSearch>#hash
	var search = window.location.search || '';
	if (search.indexOf('?/') === 1) { // search starts with '?/'
		var payload = search.slice(2); // remove '?/'
		var parts = payload.split('&');
		var encPath = parts[0] || '';
		var encSearch = parts[1] || '';
		try {
			var decodedPath = decodeURIComponent(encPath);
			var decodedSearch = encSearch ? '?' + decodeURIComponent(encSearch) : '';
			// base path (e.g. /supamigrate)
			var base = window.location.pathname.split('/').slice(0,2).join('/') || '';
			var newPath = base + (decodedPath ? '/' + decodedPath : '') + decodedSearch + window.location.hash;
			window.history.replaceState(null, '', newPath);
		} catch (e) {
			// if decoding fails, fall back to no-op
			console.warn('Failed to decode redirect payload', e);
		}
	}
})();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
