"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import "./App.css"
import NodeDetails from "./components/NodeDetails"
import Papa from "papaparse"
import { csvData } from "./data/csvData"

// Importar Leaflet directamente para configurar los iconos
import L from "leaflet"

// Configuración de iconos por estado de nodo
const createIcon = (color) =>
  L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

const icons = {
  Activo: createIcon("green"),
  Inactivo: createIcon("red"),
  Mantenimiento: createIcon("yellow"),
  "En Construcción": createIcon("blue"),
  Planificado: createIcon("grey"),
  Suspendido: createIcon("black"),
  default: createIcon("grey"),
}

function App() {
  const [nodes, setNodes] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dataSource, setDataSource] = useState("loading")
  const [debugInfo, setDebugInfo] = useState("")
  const [nodeStats, setNodeStats] = useState({})
  const [statusStats, setStatusStats] = useState({})

  // Función para manejar la selección de nodos
  const handleNodeSelect = (node) => {
    console.log("Node selected:", node)
    setSelectedNode(node)
  }

  // Función para procesar nodos (tanto de CSV como de datos internos)
  const processNodes = (rawNodes) => {
    const processed = rawNodes
      .map((node, index) => {
        const lat = Number.parseFloat(node.latitud)
        const lng = Number.parseFloat(node.longitud)

        return {
          ...node,
          lat: lat,
          lng: lng,
          id: node.id_nodo || `node-${index}`,
        }
      })
      .filter((node) => !isNaN(node.lat) && !isNaN(node.lng))

    // Calcular estadísticas por tipo
    const typeStats = processed.reduce((acc, node) => {
      const tipo = node.tipo_nodo || "Sin clasificar"
      acc[tipo] = (acc[tipo] || 0) + 1
      return acc
    }, {})

    // Calcular estadísticas por estado
    const statusStats = processed.reduce((acc, node) => {
      const estado = node.estado || "Desconocido"
      acc[estado] = (acc[estado] || 0) + 1
      return acc
    }, {})

    setNodeStats(typeStats)
    setStatusStats(statusStats)
    return processed
  }

  // Función para crear conexiones entre nodos - MÁS CONEXIONES
  const createConnections = (nodeList) => {
    const connections = []

    // Conectar todos los nodos operativos (activos, en construcción, mantenimiento)
    const connectableNodes = nodeList.filter(
      (n) => n.estado === "Activo" || n.estado === "En Construcción" || n.estado === "Mantenimiento",
    )

    // Separar por tipos
    const principales = connectableNodes.filter((n) => n.tipo_nodo === "Principal")
    const secundarios = connectableNodes.filter((n) => n.tipo_nodo === "Secundario")
    const terciarios = connectableNodes.filter((n) => n.tipo_nodo === "Terciario")
    const especiales = connectableNodes.filter((n) => n.tipo_nodo === "Especial")

    // 1. Conectar TODOS los nodos principales entre sí (red troncal completa)
    for (let i = 0; i < principales.length; i++) {
      for (let j = i + 1; j < principales.length; j++) {
        connections.push([
          [principales[i].lat, principales[i].lng],
          [principales[j].lat, principales[j].lng],
        ])
      }
    }

    // 2. Conectar cada nodo secundario al principal más cercano
    secundarios.forEach((sec) => {
      if (principales.length > 0) {
        const principal = principales.reduce((closest, p) => {
          const distSec = Math.sqrt(Math.pow(sec.lat - p.lat, 2) + Math.pow(sec.lng - p.lng, 2))
          const distClosest = Math.sqrt(Math.pow(sec.lat - closest.lat, 2) + Math.pow(sec.lng - closest.lng, 2))
          return distSec < distClosest ? p : closest
        }, principales[0])

        connections.push([
          [sec.lat, sec.lng],
          [principal.lat, principal.lng],
        ])
      }
    })

    // 3. Conectar TODOS los nodos secundarios entre sí (red de distribución completa)
    for (let i = 0; i < secundarios.length; i++) {
      for (let j = i + 1; j < secundarios.length; j++) {
        const distance = Math.sqrt(
          Math.pow(secundarios[i].lat - secundarios[j].lat, 2) + Math.pow(secundarios[i].lng - secundarios[j].lng, 2),
        )
        // Conectar si están a menos de 1.5 grados de distancia (más permisivo)
        if (distance < 1.5) {
          connections.push([
            [secundarios[i].lat, secundarios[i].lng],
            [secundarios[j].lat, secundarios[j].lng],
          ])
        }
      }
    }

    // 4. Conectar cada nodo terciario a MÚLTIPLES nodos cercanos
    terciarios.forEach((ter) => {
      const allHigherNodes = [...principales, ...secundarios]

      // Conectar a los 2 nodos más cercanos
      const sortedByDistance = allHigherNodes
        .map((node) => ({
          node,
          distance: Math.sqrt(Math.pow(ter.lat - node.lat, 2) + Math.pow(ter.lng - node.lng, 2)),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2) // Tomar los 2 más cercanos

      sortedByDistance.forEach(({ node }) => {
        connections.push([
          [ter.lat, ter.lng],
          [node.lat, node.lng],
        ])
      })
    })

    // 5. Conectar nodos terciarios cercanos entre sí
    for (let i = 0; i < terciarios.length; i++) {
      for (let j = i + 1; j < terciarios.length; j++) {
        const distance = Math.sqrt(
          Math.pow(terciarios[i].lat - terciarios[j].lat, 2) + Math.pow(terciarios[i].lng - terciarios[j].lng, 2),
        )
        // Conectar si están muy cerca (menos de 0.5 grados)
        if (distance < 0.5) {
          connections.push([
            [terciarios[i].lat, terciarios[i].lng],
            [terciarios[j].lat, terciarios[j].lng],
          ])
        }
      }
    }

    // 6. Conectar nodos especiales a múltiples nodos cercanos
    especiales.forEach((esp) => {
      const allOtherNodes = [...principales, ...secundarios, ...terciarios]

      // Conectar a los 2 nodos más cercanos
      const sortedByDistance = allOtherNodes
        .map((node) => ({
          node,
          distance: Math.sqrt(Math.pow(esp.lat - node.lat, 2) + Math.pow(esp.lng - node.lng, 2)),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2) // Tomar los 2 más cercanos

      sortedByDistance.forEach(({ node }) => {
        connections.push([
          [esp.lat, esp.lng],
          [node.lat, node.lng],
        ])
      })
    })

    console.log(`Conexiones creadas: ${connections.length}`)
    return connections
  }

  useEffect(() => {
    const loadData = () => {
      try {
        setDebugInfo("📊 Cargando datos del CSV original...")
        console.log("📊 Loading CSV data from nodos_refefos.csv...")

        const { data, errors } = Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          transform: (value) => value.trim(),
        })

        console.log("🔧 Parsed data:", data)
        console.log("🔧 Data length:", data.length)
        console.log("⚠️ Parse errors:", errors)

        if (errors.length > 0) {
          console.warn("CSV parsing errors:", errors)
        }

        if (data.length === 0) {
          throw new Error("CSV parseado pero sin datos")
        }

        // Filtrar nodos de Entre Ríos (aunque ya sabemos que todos lo son)
        const entreRiosFromCSV = data.filter((node) => {
          const provincia = node.provincia?.toLowerCase() || ""
          return provincia.includes("entre") || provincia.includes("ríos") || provincia.includes("rios")
        })

        console.log("🗺️ Entre Ríos nodes found:", entreRiosFromCSV.length)

        const processedNodes = processNodes(entreRiosFromCSV)
        console.log("✅ Processed nodes:", processedNodes.length)

        if (processedNodes.length === 0) {
          throw new Error("No se pudieron procesar los nodos del CSV")
        }

        setNodes(processedNodes)
        setConnections(createConnections(processedNodes))
        setDataSource("csv")
        setDebugInfo(`✅ CSV nodos_refefos.csv cargado: ${processedNodes.length} nodos`)
        console.log("🎉 CSV loaded successfully!")
      } catch (error) {
        console.error("💥 Error loading CSV:", error)
        setError(error.message)
        setDebugInfo(`❌ Error: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    // Simular un pequeño delay para mostrar el loading
    setTimeout(loadData, 300)
  }, [])

  // Centro del mapa en Paraná, Entre Ríos
  const mapCenter = [-31.7505, -60.5193]

  if (loading) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>ARSAT Fiber Optic Network - Entre Ríos</h1>
        </header>
        <div className="loading">
          <p>Loading map data...</p>
          <p style={{ fontSize: "0.9rem", marginTop: "10px" }}>{debugInfo}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ARSAT Fiber Optic Network - Entre Ríos</h1>
        {dataSource === "csv" && (
          <div className="success">✅ Datos cargados desde nodos_refefos.csv ({nodes.length} nodos)</div>
        )}
        {error && <div className="error">❌ {error}</div>}

        {/* Leyenda de estados de nodos */}
        <div className="node-legend">
          <span className="legend-item">
            <span className="legend-color green"></span>
            Activo ({statusStats.Activo || 0})
          </span>
          <span className="legend-item">
            <span className="legend-color red"></span>
            Inactivo ({statusStats.Inactivo || 0})
          </span>
          <span className="legend-item">
            <span className="legend-color yellow"></span>
            Mantenimiento ({statusStats.Mantenimiento || 0})
          </span>
          <span className="legend-item">
            <span className="legend-color blue"></span>
            En Construcción ({statusStats["En Construcción"] || 0})
          </span>
          <span className="legend-item">
            <span className="legend-color grey"></span>
            Planificado ({statusStats.Planificado || 0})
          </span>
          <span className="legend-item">
            <span className="legend-color black"></span>
            Suspendido ({statusStats.Suspendido || 0})
          </span>
        </div>

        {/* Leyenda de tipos de nodos */}
        <div className="type-legend">
          <span className="legend-item">
            <span className="legend-color red"></span>
            Principal ({nodeStats.Principal || 0})
          </span>
          <span className="legend-item">
            <span className="legend-color blue"></span>
            Secundario ({nodeStats.Secundario || 0})
          </span>
          <span className="legend-item">
            <span className="legend-color green"></span>
            Terciario ({nodeStats.Terciario || 0})
          </span>
          <span className="legend-item">
            <span className="legend-color violet"></span>
            Especial ({nodeStats.Especial || 0})
          </span>
        </div>
      </header>

      <div className="content-container">
        <div className="map-container">
          <MapContainer center={mapCenter} zoom={8} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Líneas entre nodos (fibra óptica) */}
            {connections.map((connection, idx) => (
              <Polyline
                key={idx}
                positions={connection}
                pathOptions={{
                  color: "#ff6b35",
                  weight: 2.5,
                  opacity: 0.8,
                  dashArray: "5, 3",
                }}
              />
            ))}

            {/* Marcadores para los nodos */}
            {nodes.map((node) => (
              <Marker
                key={node.id}
                position={[node.lat, node.lng]}
                icon={icons[node.estado] || icons.default}
                eventHandlers={{
                  click: () => {
                    handleNodeSelect(node)
                  },
                }}
              >
                <Popup>
                  <div style={{ minWidth: "200px" }}>
                    <strong>{node.localidad}</strong>
                    <br />
                    <strong>Dirección:</strong> {node.direccion}
                    <br />
                    <strong>Tipo:</strong> {node.tipo_nodo}
                    <br />
                    <strong>Estado:</strong>{" "}
                    <span className={`status-indicator ${node.estado?.toLowerCase().replace(" ", "-") || "unknown"}`}>
                      {node.estado}
                    </span>
                    <br />
                    <strong>ID:</strong> {node.id_nodo || node.id}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="details-panel">
          {selectedNode ? (
            <NodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} />
          ) : (
            <div className="no-selection">
              <p>Haz clic en un nodo del mapa para ver sus detalles</p>
              <p>Total nodes: {nodes.length}</p>
              <p>Total conexiones: {connections.length}</p>

              <div className="stats-summary">
                <h3>Resumen de la Red</h3>
                <h4>Por Tipo de Nodo:</h4>
                {Object.entries(nodeStats).map(([tipo, count]) => (
                  <p key={tipo}>
                    <strong>{tipo}:</strong> {count} nodos
                  </p>
                ))}

                <h4>Por Estado:</h4>
                {Object.entries(statusStats).map(([estado, count]) => (
                  <p key={estado}>
                    <strong>{estado}:</strong> {count} nodos
                  </p>
                ))}
              </div>

              <div className="quick-access">
                <h4>Acceso Rápido</h4>
                <div className="node-list">
                  {nodes.slice(0, 8).map((node) => (
                    <button
                      key={node.id}
                      className={`node-quick-btn ${node.estado?.toLowerCase().replace(" ", "-") || "unknown"}`}
                      onClick={() => handleNodeSelect(node)}
                      title={`${node.localidad} - ${node.estado}`}
                    >
                      {node.localidad}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
