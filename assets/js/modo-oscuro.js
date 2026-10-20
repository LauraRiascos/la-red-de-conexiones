const btnSwitch = document.querySelector("#switch");

btnSwitch.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  // Gradamos el modo en localstorage.
  if (document.body.classList.contains("dark")) {
    localStorage.setItem("dark-mode", "true");
  } else {
    localStorage.setItem("dark-mode", "false");
  }
});

// Obtenemos el modo actual.
if (localStorage.getItem("dark-mode") === "true") {
  document.body.classList.add("dark");
} else {
  document.body.classList.remove("dark");
}
