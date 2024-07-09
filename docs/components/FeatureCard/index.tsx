export default function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="text-blue-400 mb-2">{icon}</div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  )}