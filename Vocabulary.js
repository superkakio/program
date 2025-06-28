var gsBtn = document.getElementById('BotonGrupoSiguiente');
var giBtn = document.getElementById('BotonGrupoInicial');
var eBtn = document.getElementById('BotonEscuchar');
var lista = document.getElementById('ListaGrupos');
var mytabla = document.getElementById('mytabla');
var errorElm = document.getElementById('error');
var dbFileElm = document.getElementById('dbfile');
var savedbElm = document.getElementById('savedb');
var logo = document.getElementById('logo');
var diccionario = "traduccion1";
var filas;


const worker = new Worker("https://github.com/superkakio/program/blob/main/worker.sql-wasm.js");
worker.onerror = error;

function error(e) {
  console.log(e);
	errorElm.style.height = '2em';
	errorElm.textContent = e.message;
}

function noerror() {
  errorElm.style.height = '0';
}

function SelIdioma() {
  var iChk = document.getElementsByName('idioma');  
  var iChk_value;
  for(var i = 0; i < iChk.length; i++){
    if(iChk[i].checked){
      iChk_value = iChk[i].value;
    }
  }
  return iChk_value;  
}

// Load a db from a file
dbFileElm.onchange = function() {
	var f = dbFileElm.files[0];
	if (f.name == "Vocabulary.sqlite"){
	  var r = new FileReader();
	  r.onload = function() {
	    worker.onmessage = function () {
		  toc("Loading database from file");
		};
		tic();   
		try {
		  worker.postMessage({action:'open',buffer:r.result}, [r.result]);                          
          Filtrar();        
		}
		catch(exception) {
		  worker.postMessage({action:'open',buffer:r.result});
		}
	  }
	  r.readAsArrayBuffer(f);	
	} else {
	  alert("La base de datos cargada no es correcta");
	}		 
}

// Save the db to a file
function savedb() {
	worker.onmessage = function(event) {
		toc("Exporting the database");
		var arraybuff = event.data.buffer;
		var blob = new Blob([arraybuff]);		
		var a = document.getElementById('down')
		a.href = window.URL.createObjectURL(blob);
		a.download = "Vocabulary.sqlite";
		a.onclick = function() {			
			setTimeout(function() {
				window.URL.revokeObjectURL(a.href);
			}, 1500);
		};
		a.click();
	};
	tic();
	worker.postMessage({action:'export'});
}
savedbElm.addEventListener("click", savedb, true);

// Run a sql sentence in the database
function executeSQL(sqlsentence,columnas) {
	tic();
    worker.onmessage = function(event) {	
	var resultado = event.data.results;	
    toc("Executing SQL");
	tic();
	if (resultado.length == 0) {
	  resultado[0] = [" "];	
	}
    switch(columnas) {
      case "tabla":        
	   genera_tabla(resultado);
        break;
      case "trad":
           cargarHTML(resultado);
        break;
      case "son":
           cargarSonido(resultado);
        break;
      default:
        
    }
		toc("Displaying results");
	}
	worker.postMessage({action:'exec', sql:sqlsentence});	
}

function genera_tabla(valores) {
  // Obtener la referencia del elemento asid
  var aside = document.getElementsByTagName("aside")[0]; 
  //var tblBody = document.createElement("tbody");
  var tblBody = mytabla.tBodies[0];  
  while (tblBody.firstChild) {
  // This will remove all children within tbody
  tblBody.removeChild(tblBody.firstChild);
  }
  // Crea las celdas
  filas = valores[0].values.length;  
  for (var i = 0; i < filas; i++) {
    // Crea las hileras de la tabla
    var hilera = document.createElement("tr");
    for (var j = 0; j < 3; j++) {
      // Crea un elemento <td> y un nodo de texto, haz que el nodo de
      // texto sea el contenido de <td>, ubica el elemento <td> al final
      // de la hilera de la tabla
      var celda = document.createElement("td");
      var textoCelda = document.createTextNode(valores[0].values[i][j]);
      celda.appendChild(textoCelda);
      hilera.appendChild(celda);
    }
    // agrega la hilera al final de la tabla (al final del elemento tblbody)
    tblBody.appendChild(hilera);
  }
  // posiciona el <tbody> debajo del elemento <table>
  mytabla.appendChild(tblBody);
  // appends <table> into <body>
  aside.appendChild(mytabla);
  //Si se quiere que comience con la primera palabra activa descomentar la siguiente línea
  tblBody.rows[0].classList.toggle('selected');
}

function celdaActiva() {
	var Activa = document.getElementsByClassName('selected');
  if (Activa[0]) {
    var fila = Activa[0].rowIndex;
    if (fila < 1) {
      fila = 1;
    };
  };        
	return fila;
}

function lanzarHTML() {
  var fila = celdaActiva();
  var palabra = mytabla.tBodies[0].rows[fila-1].cells[0].innerHTML;
  var tabla = SelIdioma();
  executeSQL("SELECT " + diccionario + " FROM " + tabla + " WHERE palabra='" + palabra +"'","trad");
}

function cargarHTML(valores) {
  var bytes = new Uint8Array(valores[0].values[0][0].toString().split(","));
  var blob = new Blob([bytes], {type : "text/html;charset=utf-8"});
  var reader = new FileReader();
  reader.onloadend = function () {
    document.getElementById("mysection").innerHTML = reader.result;
    }
  //start the reading process.
  reader.readAsText(blob);
  logo.src = diccionario + ".gif";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function espera() {  
  var retardo = document.getElementById('CampoRetardo').value*1000;  
  await sleep(retardo);
  lanzarSonido();
}

function lanzarSonido() {
  var fila = celdaActiva();
  var palabra = mytabla.tBodies[0].rows[fila-1].cells[0].innerHTML;
  var col = "sonido";
  var tabla = SelIdioma();
  executeSQL("SELECT " + col + " FROM " + tabla + " WHERE palabra='" + palabra +"'","son");
}

function cargarSonido(valores) {
  var bytes = new Uint8Array(valores[0].values[0][0].toString().split(","));
  var blob = new Blob([bytes], {type : "audio/mp3"});
  var audio = new Audio(URL.createObjectURL(blob));
  audio.play();
};
eBtn.addEventListener("click", lanzarSonido, true);

function CambioRegistro() {
  var vaChk = document.getElementById('VerAuto').checked;
  var eaChk = document.getElementById('EscuhaAuto').checked;  
  if (vaChk) {
    lanzarHTML();
  };
  if (eaChk) {
    espera();    
  };  
}

function Filtrar() {  
  var tabla = SelIdioma();
  var hoy = Fecha();  
  var dias = lista.options[lista.selectedIndex].label;
  var grupo = lista.value;
  executeSQL("SELECT palabra, fecha, id_grupo, (strftime('%J', '" + hoy + "') - strftime('%J', fecha)) as dif FROM " + tabla + " WHERE dif >= " + dias + " AND id_grupo='" + grupo + "'","tabla");
}

lista.onchange =function() {
  Filtrar();  
}	

function Fecha() {  
  var hoy = new Date();
  var year = hoy.getFullYear();
  var month = hoy.getMonth() + 1;
  var day = hoy.getDate();
  if(day<10) 
  {
    day='0'+day;
  } 
  if(month<10) 
  {
    month='0'+month;
  }
  var fecha = year + "-" + month + "-" + day;   
  return fecha;  
}

function GrupoSiguiente() {
  var fila = celdaActiva();
  var palabra = mytabla.tBodies[0].rows[fila-1].cells[0].innerHTML;
  var grupo = mytabla.tBodies[0].rows[fila-1].cells[2].innerHTML;
  var tabla = SelIdioma();
  var fecha = Fecha();
  grupo++;
  if (grupo > 7) {
      grupo = 7;
    };
  var sentencia = "UPDATE " + tabla + " SET id_grupo='" + grupo + "', fecha='" + fecha + "' WHERE palabra='" + palabra +"'";
  console.log(sentencia);
  executeSQL("commit");  
}
gsBtn.addEventListener("click", GrupoSiguiente, true);

function GrupoInicial() {
  var fila = celdaActiva();
  var palabra = mytabla.tBodies[0].rows[fila-1].cells[0].innerHTML;
  var grupo = 0;
  var tabla = SelIdioma();
  var fecha = Fecha();
  executeSQL("UPDATE " + tabla + " SET id_grupo='" + grupo + "', fecha='" + fecha + "' WHERE palabra='" + palabra +"'","default");  
}
giBtn.addEventListener("click", GrupoInicial, true);

mytabla.onclick = function (e) {
  var cell = e.target || window.event.srcElement;
  var fila = celdaActiva();	
  mytabla.tBodies[0].rows[fila-1].classList.toggle('selected');
	var fila = cell.parentNode.rowIndex;	
	mytabla.tBodies[0].rows[fila-1].classList.toggle('selected');
  CambioRegistro();
};

document.onkeypress = function(event){
  var codigoTecla = event.keyCode;
  var fila = celdaActiva();	
  mytabla.tBodies[0].rows[fila-1].classList.toggle('selected');
  if (codigoTecla == 38 && event.altKey) {
    fila--;
    if (fila < 1) {
      fila = 1;
    };
    mytabla.tBodies[0].rows[fila-1].classList.toggle('selected');
  }
  if (codigoTecla == 40 && event.altKey) {
    fila++;
    if (fila > filas) {
      fila = filas;
    };
    mytabla.tBodies[0].rows[fila-1].classList.toggle('selected');
  }
  CambioRegistro();
};

logo.onclick =function() {
  if (diccionario == "traduccion1") {
    diccionario = "traduccion2"
  } else {
    diccionario = "traduccion1"
  }
  lanzarHTML();
}

window.onbeforeunload = function(e) {
  savedb();
};

// Performance measurement functions
var tictime;
if (!window.performance || !performance.now) {window.performance = {now:Date.now}}
function tic () {tictime = performance.now()}
function toc(msg) {
	var dt = performance.now()-tictime;
	console.log((msg||'toc') + ": " + dt + "ms");
}