"use client"

function NodeDetails({ node, onClose }) {
  console.log("NodeDetails received node:", node) // Debug

  if (!node) {
    return (
      <div className="no-selection">
        <p>No node selected</p>
      </div>
    )
  }

  return (
    <div className="node-details">
      <div className="details-header">
        <h2>{node.localidad || "Nodo desconocido"}</h2>
        <button className="close-btn" onClick={onClose} title="Cerrar">
          ×
        </button>
      </div>

      <div className="details-content">
        <div className="node-info-grid">
          <div className="info-item">
            <label>ID del Nodo:</label>
            <span>{node.id_nodo || node.id || "N/A"}</span>
          </div>

          <div className="info-item">
            <label>Provincia:</label>
            <span>{node.provincia || "N/A"}</span>
          </div>

          <div className="info-item">
            <label>Localidad:</label>
            <span>{node.localidad || "N/A"}</span>
          </div>

          <div className="info-item">
            <label>Dirección:</label>
            <span>{node.direccion || "N/A"}</span>
          </div>

          <div className="info-item">
            <label>Coordenadas:</label>
            <span>
              Lat: {node.lat?.toFixed(4) || "N/A"}
              <br />
              Lng: {node.lng?.toFixed(4) || "N/A"}
            </span>
          </div>

          <div className="info-item">
            <label>Tipo de Nodo:</label>
            <span className={`node-type-badge ${node.tipo_nodo?.toLowerCase() || "default"}`}>
              {node.tipo_nodo || "Sin clasificar"}
            </span>
          </div>

          <div className="info-item">
            <label>Estado:</label>
            <span className={`status-badge ${node.estado?.toLowerCase()}`}>{node.estado || "Desconocido"}</span>
          </div>
        </div>

        <div className="node-actions">
          <button
            className="action-btn primary"
            onClick={() => {
              const url = `https://www.openstreetmap.org/?mlat=${node.lat}&mlon=${node.lng}&zoom=15`
              window.open(url, "_blank")
            }}
          >
            📍 Ver en OpenStreetMap
          </button>

          <button
            className="action-btn secondary"
            onClick={() => {
              const coords = `${node.lat},${node.lng}`
              navigator.clipboard.writeText(coords).then(() => {
                alert("Coordenadas copiadas al portapapeles")
              })
            }}
          >
            📋 Copiar Coordenadas
          </button>
        </div>
      </div>
    </div>
  )
}

export default NodeDetails
