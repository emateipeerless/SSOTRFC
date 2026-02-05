import { useParams } from "react-router-dom";

export default function DevicePage() {
  const { deviceId } = useParams();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Device: {deviceId}</h2>
      <p>This is the device overview page (placeholder).</p>
    </div>
  );
}
