import { useEffect, useState } from "react";
import { getMonitoringData } from "../services/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const Dashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await getMonitoringData();
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📊 API Monitoring Dashboard</h2>

      <LineChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="responseTime" />
      </LineChart>

      <h3>Recent Logs</h3>
      <ul>
        {data.map((item, index) => (
          <li key={index}>
            {item.url} - {item.statusCode} - {item.responseTime}ms
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
