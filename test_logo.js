fetch("http://localhost:3000/logo.jpeg").then(r => r.text().then(t => console.log(r.status, r.headers.get("content-type"), t.substring(0, 100)))).catch(e => console.error(e));
