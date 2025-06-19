import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"

// Configure default icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

function SimpleMap() {
  // Test coordinates for Entre Ríos
  const center = [-31.7505, -60.5193] // Paraná, Entre Ríos

  return (
    <div style={{ height: "500px", width: "100%" }}>
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={center}>
          <Popup>Test marker in Paraná, Entre Ríos</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

export default SimpleMap
