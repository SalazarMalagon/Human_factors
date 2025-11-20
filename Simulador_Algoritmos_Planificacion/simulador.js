// Clase para representar un proceso
class Proceso {
  constructor(id, llegada, ejecucionTotal, bloques) {
    this.id = id;
    this.llegada = llegada;
    this.ejecucionTotal = ejecucionTotal;
    this.ejecucionRestante = ejecucionTotal;
    this.bloques = bloques;
    this.bloqueActual = 0;
    this.bloqueoHasta = 0;
    this.tiempoBloqueo = 0;
    this.tiempoRespuesta = null;
    this.tiempoEspera = 0;
    this.instanteFin = 0;
    this.vecesEjecutado = 0;
    this.estado = "listo";
  }
}

// Variables globales
let procesos = [];
let siguienteId = 1;

// Algoritmos de planificación
const Algoritmos = {
  FCFS: {
    nombre: "First Come First Served",
    descripcion:
      "Ejecuta los procesos en orden de llegada estricto, manteniendo prioridad después de bloqueos.",
    ejecutar: function (procesos) {
      let tiempo = 0;
      let terminados = [];
      let listos = [];
      let bloqueados = [];
      let estadisticas = [];
      let tiempoCPU = 0;
      let tiempoPlanificacion = 0;
      let historial = {};

      function verificarLlegada(colaLlegada){
        while (colaLlegada.length > 0 && colaLlegada[0].llegada <= tiempo) {
          const nuevoProceso = colaLlegada.shift();
          // Insertar manteniendo orden FCFS estricto
          let insertado = false;
          for (let i = 0; i < listos.length; i++) {
            if (nuevoProceso.llegadaOriginal < listos[i].llegadaOriginal) {
              listos.splice(i, 0, nuevoProceso);
              insertado = true;
              break;
            }
          }
          if (!insertado) {
            historial[nuevoProceso.id] = {};
            listos.push(nuevoProceso);
          }
        }
      }
      function verificarBloqueados(){
        for (let i = 0; i < bloqueados.length; i++) {
          const proceso = bloqueados[i];
          if (tiempo >= proceso.bloqueoHasta) {
            bloqueados.splice(i, 1);
            // Insertar manteniendo orden FCFS estricto
            let insertado = false;
            for (let j = 0; j < listos.length; j++) {
              if (proceso.llegadaOriginal < listos[j].llegadaOriginal) {
                listos.splice(j, 0, proceso);
                insertado = true;
                break;
              }
            }
            if (!insertado) {
              listos.push(proceso);
            }
            i--;
          }
          historial[proceso.id][tiempo] = "b";
        }
      }
      // Copiar procesos y ordenarlos por llegada
      let colaLlegada = procesos
        .map((p) => {
          let nuevoProceso = new Proceso(p.id, p.llegada, p.ejecucionTotal, [
            ...p.bloques,
          ]);
          nuevoProceso.llegadaOriginal = p.llegada; // Guardamos la llegada original
          return nuevoProceso;
        })
        .sort((a, b) => a.llegada - b.llegada);

      while (
        colaLlegada.length > 0 ||
        listos.length > 0 ||
        bloqueados.length > 0
      ) {
        // 1. Llegada de nuevos procesos
        verificarLlegada(colaLlegada);

        // 2. Desbloqueo de procesos (manteniendo orden FCFS)
        verificarBloqueados();

        // 3. Si no hay procesos listos, avanzar el tiempo
        if (listos.length === 0) {
          tiempo++;
          tiempoPlanificacion++;
          continue;
        }

        // 4. Ejecutar proceso actual (FCFS estricto)
        const proceso = listos.shift();

        // Tiempo de respuesta si es la primera vez
        if (proceso.vecesEjecutado === 0) {
          proceso.tiempoRespuesta = tiempo - proceso.llegada;
        }

        while (proceso.ejecucionRestante > 0) {
          const bloque = proceso.bloques[proceso.bloqueActual];
          const ejecutadoHastaAhora =
            proceso.ejecucionTotal - proceso.ejecucionRestante;

          // Bloqueo si corresponde
          if (bloque && ejecutadoHastaAhora === bloque.inicio) {
            proceso.estado = "bloqueado";
            proceso.bloqueoHasta = tiempo + bloque.duracion;
            proceso.tiempoBloqueo += bloque.duracion;
            proceso.bloqueActual++;
            bloqueados.push(proceso);
            break;
          }

          proceso.ejecucionRestante--;
          proceso.vecesEjecutado++;
          historial[proceso.id][tiempo] = "e";
          verificarLlegada(colaLlegada);
          verificarBloqueados();
          for (let i = 0; i < listos.length; i++) {
            if (proceso.id != listos[i].id) {
              historial[listos[i].id][tiempo] = "es";
            }
          }
          tiempo++;
          tiempoCPU++;
        }

        // Si terminó, registramos
        if (proceso.ejecucionRestante === 0) {
          proceso.instanteFin = tiempo;
          terminados.push(proceso);
        }
      }

      // Calcular estadísticas (igual que antes)
      terminados.forEach((p) => {
        const retorno = p.instanteFin - p.llegada;
        const tiempoPerdido = retorno - p.ejecucionTotal - p.tiempoBloqueo;
        const penalidad = (retorno / p.ejecucionTotal).toFixed(2);

        estadisticas.push({
          proceso: p.id,
          ejecucion: p.ejecucionTotal,
          espera: tiempoPerdido,
          bloqueo: p.tiempoBloqueo,
          instanteFin: p.instanteFin,
          retorno: retorno,
          tiempoPerdido: tiempoPerdido,
          penalidad: penalidad,
          tiempoRespuesta: p.tiempoRespuesta,
        });
      });

      // Métricas globales
      const tiempoTotal = tiempo;
      const usoCPU = ((tiempoCPU / tiempoTotal) * 100).toFixed(2);
      const usoPlanificacion = (
        (tiempoPlanificacion / tiempoTotal) *
        100
      ).toFixed(2);

      estadisticas.sort((a, b) => a.proceso.localeCompare(b.proceso));

      return {
        historial : historial,
        estadisticas: estadisticas,
        tiempoTotal: tiempoTotal,
        tiempoCPU: tiempoCPU,
        tiempoPlanificacion: tiempoPlanificacion,
        usoCPU: usoCPU,
        usoPlanificacion: usoPlanificacion,
      };
    },
  },
  SJF: {
    nombre: "Shortest Job First",
    descripcion:
      "Ejecuta primero el proceso con menor tiempo de ejecución (no expropiativo).",
    ejecutar: function (procesos) {
      let tiempo = 0;
      let listos = [];
      let bloqueados = [];
      let terminados = [];
      let procesoActual = null;
      let estadisticas = [];
      let tiempoCPU = 0;
      let tiempoPlanificacion = 0;
      let historial = {};

      function verificarLlegada(colaLlegada) {
        while (colaLlegada.length > 0 && colaLlegada[0].llegada <= tiempo) {
          const proc = colaLlegada.shift();
          historial[proc.id] = {};
          listos.push(proc);
        }
      }

      function verificarBloqueados() {
        for (let i = 0; i < bloqueados.length; i++) {
          const proceso = bloqueados[i];
          if (tiempo >= proceso.bloqueoHasta) {
            bloqueados.splice(i, 1);
            listos.push(proceso);
            i--;
          }
          historial[proceso.id][tiempo] = "b";
        }
      }

      // Se copia los procesos y se ordenan por orden de llegada
      let colaLlegada = procesos
        .map(
          (p) => new Proceso(p.id, p.llegada, p.ejecucionTotal, [...p.bloques])
        )
        .sort((a, b) => a.llegada - b.llegada);

      while (
        colaLlegada.length > 0 ||
        listos.length > 0 ||
        bloqueados.length > 0
      ) {
        // Revisamos si llegan nuevos procesos
        verificarLlegada(colaLlegada);

        verificarBloqueados();

        // Si no hay procesos listos, el tiempo avanzara
        if (listos.length === 0) {
          tiempo++;
          tiempoPlanificacion++;
          continue;
        }

        // Seleccionamos el proceso con menor tiempo de ejecucion
        listos.sort((a, b) => a.ejecucionTotal - b.ejecucionTotal);
        procesoActual = listos.shift();

        // Se calcula el tiempo de respuesta si es la primera vez que llega
        if (procesoActual.vecesEjecutado === 0) {
          procesoActual.tiempoRespuesta = tiempo - procesoActual.llegada;
        }

        while (procesoActual.ejecucionRestante > 0) {
          const bloque = procesoActual.bloques[procesoActual.bloqueActual];
          const ejecucionHastaAhora =
            procesoActual.ejecucionTotal - procesoActual.ejecucionRestante;

          // Verificamos si inicia un bloqueo
          if (bloque && ejecucionHastaAhora === bloque.inicio) {
            procesoActual.estado = "bloqueado";
            procesoActual.bloqueoHasta = tiempo + bloque.duracion;
            procesoActual.tiempoBloqueo += bloque.duracion;
            procesoActual.bloqueActual++;
            bloqueados.push(procesoActual);
            break; // sale del while y vuelve al ciclo principal
          }

          // Ejecutamos una unidad de tiempo
          procesoActual.ejecucionRestante--;
          procesoActual.vecesEjecutado++;
          historial[procesoActual.id][tiempo] = "e";
          verificarLlegada(colaLlegada);
          verificarBloqueados();
          for (let i = 0; i < listos.length; i++) {
            if (procesoActual.id != listos[i].id) {
              historial[listos[i].id][tiempo] = "es";
            }
          }
          tiempo++;
          tiempoCPU++;
        }

        if (procesoActual.ejecucionRestante === 0) {
          procesoActual.instanteFin = tiempo;
          terminados.push(procesoActual);
        }
      }
      // Calcular estadisticas
      terminados.forEach((p) => {
        const retorno = p.instanteFin - p.llegada;
        const tiempoPerdido = retorno - p.ejecucionTotal - p.tiempoBloqueo;
        const penalidad = (retorno / p.ejecucionTotal).toFixed(2);

        estadisticas.push({
          proceso: p.id,
          ejecucion: p.ejecucionTotal,
          espera: tiempoPerdido,
          bloqueo: p.tiempoBloqueo,
          instanteFin: p.instanteFin,
          retorno: retorno,
          tiempoPerdido: tiempoPerdido,
          penalidad: penalidad,
          tiempoRespuesta: p.tiempoRespuesta,
        });
      });
      estadisticas.sort((a, b) => a.proceso.localeCompare(b.proceso));

      const tiempoTotal = tiempo;
      const usoCPU = ((tiempoCPU / tiempoTotal) * 100).toFixed(2);
      const usoPlanificacion = (
        (tiempoPlanificacion / tiempoTotal) *
        100
      ).toFixed(2);

      return {
        historial: historial,
        estadisticas: estadisticas,
        tiempoTotal: tiempoTotal,
        tiempoCPU: tiempoCPU,
        tiempoPlanificacion: tiempoPlanificacion,
        usoCPU: usoCPU,
        usoPlanificacion: usoPlanificacion,
      };
    },
  },

  SRTF: {
    nombre: "Shortest Remaining Time First",
    descripcion:
      "Ejecuta el proceso con el menor tiempo restante. Interrumpe si llega uno más corto.",
    ejecutar: function (procesos) {
      let tiempo = 0;
      let listos = [];
      let bloqueados = [];
      let terminados = [];
      let estadisticas = [];
      let tiempoCPU = 0;
      let tiempoPlanificacion = 0;
      let historial = {};
  
      function verificarLlegada(colaLlegada) {
        while (colaLlegada.length > 0 && colaLlegada[0].llegada <= tiempo) {
          const proc = colaLlegada.shift();
          historial[proc.id] = {};
          listos.push(proc);
        }
      }

      function verificarBloqueados() {
        for (let i = 0; i < bloqueados.length; i++) {
          const proceso = bloqueados[i];
          if (tiempo >= proceso.bloqueoHasta) {
            bloqueados.splice(i, 1);
            listos.push(proceso);
            i--;
          }
          historial[proceso.id][tiempo] = "b";
        }
      }

      // Se copia los procesos y se ordenan por orden de llegada
      let colaLlegada = procesos
        .map(
          (p) => new Proceso(p.id, p.llegada, p.ejecucionTotal, [...p.bloques])
        )
        .sort((a, b) => a.llegada - b.llegada);

      while (
        colaLlegada.length > 0 ||
        listos.length > 0 ||
        bloqueados.length > 0
      ) {
        // Revisamos si llegan nuevos procesos
        verificarLlegada(colaLlegada);

        verificarBloqueados();

        // Si no hay procesos listos, el tiempo avanzara
        if (listos.length === 0) {
          tiempo++;
          tiempoPlanificacion++;
          continue;
        }

        // Seleccionamos el proceso con menor tiempo de ejecucion
        listos.sort((a, b) => {
          if (a.ejecucionRestante === b.ejecucionRestante) {
            return a.llegada - b.llegada; // desempate por llegada
          }
          return a.ejecucionRestante - b.ejecucionRestante;
        });
        procesoActual = listos.shift();

        // Se calcula el tiempo de respuesta si es la primera vez que llega
        if (procesoActual.vecesEjecutado === 0) {
          procesoActual.tiempoRespuesta = tiempo - procesoActual.llegada;
        }

        while (procesoActual.ejecucionRestante > 0) {
          const bloque = procesoActual.bloques[procesoActual.bloqueActual];
          const ejecucionHastaAhora =
            procesoActual.ejecucionTotal - procesoActual.ejecucionRestante;

          // Verificamos si inicia un bloqueo
          if (bloque && ejecucionHastaAhora === bloque.inicio) {
            procesoActual.estado = "bloqueado";
            procesoActual.bloqueoHasta = tiempo + bloque.duracion;
            procesoActual.tiempoBloqueo += bloque.duracion;
            procesoActual.bloqueActual++;
            bloqueados.push(procesoActual);
            break; // sale del while y vuelve al ciclo principal
          }

          // Ejecutamos una unidad de tiempo
          procesoActual.ejecucionRestante--;
          procesoActual.vecesEjecutado++;
          historial[procesoActual.id][tiempo] = "e";
          verificarLlegada(colaLlegada);
          verificarBloqueados();
          for (let i = 0; i < listos.length; i++) {
            if (procesoActual.id != listos[i].id) {
              historial[listos[i].id][tiempo] = "es";
            }
          }
          tiempo++;
          tiempoCPU++;
        }

        if (procesoActual.ejecucionRestante === 0) {
          procesoActual.instanteFin = tiempo;
          terminados.push(procesoActual);
        }
      }
  
      // Estadísticas
      terminados.forEach((p) => {
        const retorno = p.instanteFin - p.llegada;
        const tiempoPerdido = retorno - p.ejecucionTotal - p.tiempoBloqueo;
        const penalidad = (retorno / p.ejecucionTotal).toFixed(2);
  
        estadisticas.push({
          proceso: p.id,
          ejecucion: p.ejecucionTotal,
          espera: tiempoPerdido,
          bloqueo: p.tiempoBloqueo,
          instanteFin: p.instanteFin,
          retorno: retorno,
          tiempoPerdido: tiempoPerdido,
          penalidad: penalidad,
          tiempoRespuesta: p.tiempoRespuesta,
        });
      });
  
      estadisticas.sort((a, b) => a.proceso.localeCompare(b.proceso));
  
      const tiempoTotal = tiempo;
      const usoCPU = ((tiempoCPU / tiempoTotal) * 100).toFixed(2);
      const usoPlanificacion = (
        (tiempoPlanificacion / tiempoTotal) *
        100
      ).toFixed(2);
  
      return {
        historial: historial,
        estadisticas: estadisticas,
        tiempoTotal: tiempoTotal,
        tiempoCPU: tiempoCPU,
        tiempoPlanificacion: tiempoPlanificacion,
        usoCPU: usoCPU,
        usoPlanificacion: usoPlanificacion,
      };
    },
  },
  

  RR: {
    nombre: "Round Robin",
    descripcion: "Asigna un quantum fijo a cada proceso en orden circular.",
    ejecutar: function (procesos, quantum) {
      let tiempo = 0;
      let listos = [];
      let bloqueados = [];
      let terminados = [];
      let procesoActual = null;
      let estadisticas = [];
      let tiempoCPU = 0;
      let tiempoPlanificacion = 0;
      let historial = { D: {} };

      function verificarBloqueados() {
        for (let i = 0; i < bloqueados.length; i++) {
          const proceso = bloqueados[i];
          if (tiempo >= proceso.bloqueoHasta) {
            bloqueados.splice(i, 1);
            proceso.estado = "listo";
            listos.push(proceso);
            i--;
          }
          historial[proceso.id][tiempo] = "b";
        }
      }
      function verificarLlegada(colaLlegada) {
        while (colaLlegada.length > 0 && colaLlegada[0].llegada <= tiempo) {
          const proc = colaLlegada.shift();
          historial[proc.id] = {};
          listos.push(proc);
        }
      }
      function revisarEspera(procesoActual) {
        for (let i = 0; i < listos.length; i++) {
          if (procesoActual === null || procesoActual.id != listos[i].id) {
            historial[listos[i].id][tiempo] = "es";
          }
        }
      }

      // Se copia los procesos y se ordenan por orden de llegada
      let colaLlegada = procesos
        .map(
          (p) => new Proceso(p.id, p.llegada, p.ejecucionTotal, [...p.bloques])
        )
        .sort((a, b) => a.llegada - b.llegada);

      while (
        colaLlegada.length > 0 ||
        listos.length > 0 ||
        bloqueados.length > 0
      ) {
        // Revisamos si llegan nuevos procesos
        verificarLlegada(colaLlegada);

        if (tiempo === 0) {
          // Tiempo de planificación para preparar el quantum
          revisarEspera(null);
          historial["D"][tiempo] = "q";
          tiempo++;
          tiempoPlanificacion++;
          verificarLlegada(colaLlegada);
        }

        // Revisamos si se termina algun bloqueo
        verificarBloqueados();

        // Si no hay procesos listos, el tiempo avanzara
        if (listos.length === 0) {
          historial["D"][tiempo] = "q";
          tiempo++;
          tiempoPlanificacion++;
          continue;
        }

        // Ejecutamos el primer proceso en la cola
        procesoActual = listos.shift();

        // Se calcula el tiempo de respuesta si es la primera vez que llega
        if (procesoActual.vecesEjecutado === 0) {
          procesoActual.tiempoRespuesta = tiempo - procesoActual.llegada;
        }

        let tiempoRestante = Math.min(quantum, procesoActual.ejecucionRestante);

        for (let i = 0; i < tiempoRestante; i++) {
          const bloque = procesoActual.bloques[procesoActual.bloqueActual];
          let ejecutadoHastaAhora =
            procesoActual.ejecucionTotal - procesoActual.ejecucionRestante;

          // Verificamos si se inicia un bloqueo
          if (bloque && ejecutadoHastaAhora === bloque.inicio) {
            procesoActual.estado = "bloqueado";
            procesoActual.bloqueoHasta = tiempo + bloque.duracion;
            procesoActual.tiempoBloqueo += bloque.duracion;
            procesoActual.bloqueActual++;
            bloqueados.push(procesoActual);
            tiempo++;
            tiempoPlanificacion++;
            break; // Salimos del ciclo
          }

          // Ejecutamos una unidad de tiempo
          procesoActual.ejecucionRestante--;
          procesoActual.vecesEjecutado++;
          historial[procesoActual.id][tiempo] = "e";
          revisarEspera(procesoActual);
          tiempo++;
          tiempoCPU++;
          verificarLlegada(colaLlegada);
          verificarBloqueados();
          ejecutadoHastaAhora =
            procesoActual.ejecucionTotal - procesoActual.ejecucionRestante;

          if (procesoActual.ejecucionRestante === 0) {
            break;
          } else if (bloque && ejecutadoHastaAhora === bloque.inicio) {
            procesoActual.estado = "bloqueado";
            procesoActual.bloqueoHasta = tiempo + bloque.duracion;
            procesoActual.tiempoBloqueo += bloque.duracion;
            procesoActual.bloqueActual++;
            bloqueados.push(procesoActual);
            verificarBloqueados();
            revisarEspera(null);
            historial["D"][tiempo] = "q";
            tiempo++;
            tiempoPlanificacion++;
            break; // Salimos del ciclo
          }
        }

        // Si termino su ejecucion
        if (procesoActual.ejecucionRestante === 0) {
          procesoActual.instanteFin = tiempo;
          verificarBloqueados();
          revisarEspera(null);
          historial["D"][tiempo] = "q";
          tiempo++;
          tiempoPlanificacion++;

          terminados.push(procesoActual);
        }

        if (
          procesoActual.ejecucionRestante > 0 &&
          procesoActual.estado !== "bloqueado"
        ) {
          listos.push(procesoActual);
          verificarBloqueados();
          revisarEspera(null);
          historial["D"][tiempo] = "q";
          tiempo++;
          tiempoPlanificacion++;
        }
      }
      delete historial.D[Object.keys(historial.D).pop()];
      tiempo--;
      tiempoPlanificacion--;
      // Calcular estadísticas
      terminados.forEach((p) => {
        const retorno = p.instanteFin - p.llegada;
        const tiempoPerdido = retorno - p.ejecucionTotal - p.tiempoBloqueo;
        const penalidad = (retorno / p.ejecucionTotal).toFixed(2);
        estadisticas.push({
          proceso: p.id,
          ejecucion: p.ejecucionTotal,
          espera: tiempoPerdido,
          bloqueo: p.tiempoBloqueo,
          instanteFin: p.instanteFin,
          retorno: retorno,
          tiempoPerdido: tiempoPerdido,
          penalidad: penalidad,
          tiempoRespuesta: p.tiempoRespuesta,
        });
      });

      estadisticas.sort((a, b) => a.proceso.localeCompare(b.proceso));

      const tiempoTotal = tiempo;
      const usoCPU = ((tiempoCPU / tiempoTotal) * 100).toFixed(2);
      const usoPlanificacion = (
        (tiempoPlanificacion / tiempoTotal) *
        100
      ).toFixed(2);

      return {
        historial: historial,
        estadisticas: estadisticas,
        tiempoTotal: tiempoTotal,
        tiempoCPU: tiempoCPU,
        tiempoPlanificacion: tiempoPlanificacion,
        usoCPU: usoCPU,
        usoPlanificacion: usoPlanificacion,
      };
    },
  },
};

const colores = {
  e: "green",
  b: "red",
  es: "gray",
  q: "cyan",
  "": "beige",
};

function dibujarLinea(json, tiempoMaximo) {
  const container = document.getElementById("timeline-container");
  container.innerHTML = "";

  const procesos = Object.keys(json).reverse();

  const filas = [];

  for (const proceso of procesos) {
    const row = document.createElement("div");
    row.className = "gantt-row";

    const label = document.createElement("div");
    label.className = "gantt-label";
    label.innerText = proceso;
    row.appendChild(label);

    const bar = document.createElement("div");
    bar.className = "gantt-bar";

    for (let i = 0; i <= tiempoMaximo; i++) {
      const estado = json[proceso][i] || "";
      const segmento = document.createElement("div");
      segmento.className = "gantt-segment";
      segmento.style.width = "30px";
      segmento.style.backgroundColor = colores[estado] || "#ddd";
      bar.appendChild(segmento);
    }

    row.appendChild(bar);
    filas.push(row); // Guardar fila para agregar después
  }

  // Añadir todas las filas (ya están en orden invertido)
  for (const fila of filas) {
    container.appendChild(fila);
  }

  // Línea de tiempo inferior
  const timeline = document.createElement("div");
  timeline.className = "gantt-timeline";
  for (let i = 0; i <= tiempoMaximo; i++) {
    const tick = document.createElement("div");
    tick.className = "gantt-tick";
    tick.innerText = i;
    timeline.appendChild(tick);
  }

  container.appendChild(timeline);
}

// Función para mostrar resultados
function mostrarResultados(resultados, algoritmo) {
  const resultadosSection = document.getElementById("resultados");
  resultadosSection.style.display = "block";

  // Mostrar información del algoritmo
  document.getElementById("algorithm-name").textContent =
    Algoritmos[algoritmo].nombre;
  document.getElementById("algorithm-desc").textContent =
    Algoritmos[algoritmo].descripcion;

  // Mostrar tabla de resultados
  const tablaBody = document.getElementById("cuerpo-tabla");
  tablaBody.innerHTML = "";

  let sumaRetorno = 0;
  let sumaEjecucion = 0;
  let sumaEspera = 0;
  let sumaPerdido = 0;
  let sumaPenalidad = 0;

  resultados.estadisticas.forEach((est) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${est.proceso}</td>
            <td>${est.ejecucion}</td>
            <td>${est.tiempoRespuesta}</td>
            <td>${est.espera}</td>
            <td>${est.bloqueo}</td>
            <td>${est.instanteFin}</td>
            <td>${est.retorno}</td>
            <td>${est.tiempoPerdido}</td>
            <td>${est.penalidad}</td>
        `;
    tablaBody.appendChild(row);

    // Acumular para promedios
    sumaRetorno += est.retorno;
    sumaEjecucion += est.ejecucion;
    sumaEspera += est.espera;
    sumaPerdido += est.tiempoPerdido;
    sumaPenalidad += parseFloat(est.penalidad);
  });

  // Calcular métricas globales
  const totalProcesos = resultados.estadisticas.length;

  // Mostrar métricas globales
  document.getElementById("tiempo-total").textContent = resultados.tiempoTotal;
  document.getElementById("uso-cpu").textContent = `${resultados.usoCPU}%`;
  document.getElementById(
    "cpu-procesamiento"
  ).textContent = `${resultados.usoPlanificacion}%`;
  document.getElementById("prom-retorno").textContent =
    totalProcesos > 0 ? (sumaRetorno / totalProcesos).toFixed(2) : "0";
  document.getElementById("prom-ejecucion").textContent =
    totalProcesos > 0 ? (sumaEjecucion / totalProcesos).toFixed(2) : "0";
  document.getElementById("prom-espera").textContent =
    totalProcesos > 0 ? (sumaEspera / totalProcesos).toFixed(2) : "0";
  document.getElementById("prom-penalidad").textContent =
    totalProcesos > 0 ? (sumaPenalidad / totalProcesos).toFixed(3) : "0";

  // Desplazarse a la sección de resultados
  resultadosSection.scrollIntoView({ behavior: "smooth" });
}

// Funciones de la interfaz (sin cambios)
function agregarProceso() {
  const container = document.getElementById("proceso-inputs");
  const id = "P" + (container.children.length + 1);

  const procesoDiv = document.createElement("div");
  procesoDiv.className = "proceso-row";
  procesoDiv.innerHTML = `
        <div class="proceso-cell">
            <strong>${id}</strong>
        </div>
        <div class="proceso-cell">
            <input type="number" class="llegada" min="0" value="0">
        </div>
        <div class="proceso-cell">
            <input type="number" class="ejecucion" min="1" value="5">
        </div>
        <div class="bloques-container">
            <div class="bloque-row">
                <button onclick="agregarBloque(this)" class="btn-bloque">
                    <i class="fas fa-plus"></i> Bloque
                </button>
            </div>
        </div>
        <div class="proceso-cell">
            <button onclick="eliminarProceso(this)" class="btn-remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

  container.appendChild(procesoDiv);
}

function agregarBloque(button) {
  const bloqueContainer = button.parentElement.parentElement;
  const bloqueDiv = document.createElement("div");
  bloqueDiv.className = "bloque-row";
  bloqueDiv.innerHTML = `
        <input type="number" class="inicio-bloque" min="0" value="0" placeholder="Inicio">
        <input type="number" class="duracion-bloque" min="1" value="1" placeholder="Duración">
        <button onclick="eliminarBloque(this)" class="btn-remove">
            <i class="fas fa-times"></i>
        </button>
    `;

  bloqueContainer.insertBefore(bloqueDiv, button.parentElement);
}

function eliminarBloque(button) {
  button.parentElement.remove();
}

function eliminarProceso(button) {
  const container = document.getElementById("proceso-inputs");
  if (container.children.length > 1) {
    button.closest(".proceso-row").remove();
    renumerarProcesos();
  } else {
    alert("Debe haber al menos un proceso");
  }
}

function renumerarProcesos() {
  const procesos = document.querySelectorAll(".proceso-row");
  procesos.forEach((proceso, index) => {
    proceso.querySelector("strong").textContent = "P" + (index + 1);
  });
}

function limpiarProcesos() {
  document.getElementById("proceso-inputs").innerHTML = "";
  siguienteId = 1;
  // Agregamos un proceso vacío por defecto
  agregarProceso();
}

function simular() {
  // Obtener algoritmo y quantum
  const algoritmo = document.getElementById("algoritmo").value;
  const quantum = parseInt(document.getElementById("quantum").value) || 5;

  // Obtener procesos de la interfaz
  const procesos = [];
  const procesoEntries = document.querySelectorAll(".proceso-row");

  procesoEntries.forEach((entry) => {
    const id = entry.querySelector("strong").textContent;
    const llegada = parseInt(entry.querySelector(".llegada").value) || 0;
    const ejecucion = parseInt(entry.querySelector(".ejecucion").value) || 1;

    // Obtener bloques
    const bloques = [];
    const bloqueEntries = entry.querySelectorAll(".bloque-row");

    bloqueEntries.forEach((bloque) => {
      const inicioInput = bloque.querySelector(".inicio-bloque");
      const duracionInput = bloque.querySelector(".duracion-bloque");

      if (inicioInput && duracionInput) {
        const inicio = parseInt(inicioInput.value) || 0;
        const duracion = parseInt(duracionInput.value) || 1;
        bloques.push({ inicio, duracion });
      }
    });
    procesos.push(new Proceso(id, llegada, ejecucion, bloques));
  });

  // Validar que haya al menos un proceso
  if (procesos.length === 0) {
    alert("Debe haber al menos un proceso para simular");
    return;
  }

  // Ejecutar simulación con el algoritmo seleccionado
  let resultados;
  if (algoritmo === "RR") {
    resultados = Algoritmos.RR.ejecutar(procesos, quantum);
  } else {
    resultados = Algoritmos[algoritmo].ejecutar(procesos);
  }

  // Mostrar resultados
  mostrarResultados(resultados, algoritmo);
  dibujarLinea(resultados.historial, resultados.tiempoTotal);
}

// Inicializar con un proceso al cargar
window.onload = function () {
  agregarProceso();
};
