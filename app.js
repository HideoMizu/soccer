async function login() {
  const teamName = document.getElementById("teamName").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  const xmlText = await fetch("data.xml").then(r => r.text());
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");

  const teams = [...xml.querySelectorAll("team")];

  const ok = teams.some(t => {
    const name = t.querySelector("name").textContent;
    const pass = t.querySelector("password").textContent;
    return name === teamName && pass === password;
  });

  if (ok) {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
  } else {
    msg.textContent = "Team name or password is wrong.";
  }
}
