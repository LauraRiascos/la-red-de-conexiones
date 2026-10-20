var tamGeneral = 16;
		var tamH1 = 30; // Tamaño inicial para h1
		var tamH2 = 25; // Tamaño inicial para h2
		var tamH3 = 22; // Tamaño inicial para h3
		var tamH4 = 20; // Tamaño inicial para h4
		var tamH5 = 18; // Tamaño inicial para h5

		function agrandar() {
			tamGeneral++;
			tamH1++;
			tamH2++;
			tamH3++;
			tamH4++;
			tamH5++;
			actualizarTamano();
		}

		function achicar() {
			tamGeneral--;
			tamH1--;
			tamH2--;
			tamH3--;
			tamH4--;
			tamH5--;
			actualizarTamano();
		}

		function actualizarTamano() {
			document.body.style.fontSize = tamGeneral + "px";

			var h1s = document.querySelectorAll('h1');
			h1s.forEach(function (h1) {
				h1.style.fontSize = tamH1 + "px";
			});

			var h2s = document.querySelectorAll('h2');
			h2s.forEach(function (h2) {
				h2.style.fontSize = tamH2 + "px";
			});

			var h3s = document.querySelectorAll('h3');
			h3s.forEach(function (h3) {
				h3.style.fontSize = tamH3 + "px";
			});

			var h4s = document.querySelectorAll('h4');
			h4s.forEach(function (h4) {
				h4.style.fontSize = tamH4 + "px";
			});

			var h5s = document.querySelectorAll('h5');
			h5s.forEach(function (h5) {
				h5.style.fontSize = tamH5 + "px";
			});

			var textos = document.querySelectorAll('p, footer');
			textos.forEach(function (texto) {
				texto.style.fontSize = tamGeneral + "px";
			});
		}

		// Inicializar el tamaño al cargar la página
		document.addEventListener("DOMContentLoaded", function () {
			actualizarTamano();
		});