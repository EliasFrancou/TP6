function DebugPanel({ nodes, visible = false }) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "10px",
        left: "10px",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        padding: "10px",
        borderRadius: "5px",
        zIndex: 1000,
        maxHeight: "200px",
        overflowY: "auto",
        fontSize: "12px",
      }}
    >
      <h3>Debug Info</h3>
      <p>Nodes loaded: {nodes.length}</p>
      <ul>
        {nodes.slice(0, 5).map((node, index) => (
          <li key={index}>
            {node.id_nodo}: [{node.lat}, {node.lng}] - {node.localidad}
          </li>
        ))}
        {nodes.length > 5 && <li>... and {nodes.length - 5} more</li>}
      </ul>
    </div>
  );
}

export default DebugPanel;