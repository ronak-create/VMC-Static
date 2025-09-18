import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  AlertTriangle,
  Calendar,
  TrendingUp,
  Eye,
  Activity,
  Settings,
  Users,
  MapPin,
} from "lucide-react";
import Clock from "../components/Clock";

// Fix for default Leaflet markers - only do this once
if (typeof window !== "undefined" && L.Icon.Default.prototype._getIconUrl) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

const Dashboard = ({ user, onLogout }) => {
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [activeTab, setActiveTab] = useState("map");
  const [damageData, setDamageData] = useState([]);
  const [stats, setStats] = useState({
    totalDamages: 0,
    criticalDamages: 0,
    recentReports: 0,
    resolvedIssues: 0,
  });
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!dataLoaded) {
      fetchDamageData();
      fetchStats();
    }
  }, [dataLoaded]);

  const fetchDamageData = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/api/damages/fetch-damages", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDamageData(data);
      } else {
        // retrun data not fetched
        console.error("Failed to fetch damage data, using demo data.");
      }
    } catch (error) {
      console.error("Error fetching damage data:", error);
      // Use demo data as fallback
    } finally {
      setDataLoaded(true);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/dashboard/stats",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Calculate stats from current data
        calculateStatsFromData();
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      calculateStatsFromData();
    }
  }, [damageData]);

  const calculateStatsFromData = useCallback(() => {
    const currentData = damageData;
    setStats({
      totalDamages: currentData.length,
      criticalDamages: currentData.filter(
        (d) => d.severity?.toLowerCase() === "critical"
      ).length,
      recentReports: currentData.filter(
        (d) => d.status?.toLowerCase() === "pending"
      ).length,
      resolvedIssues: currentData.filter(
        (d) => d.status?.toLowerCase() === "completed"
      ).length,
    });
  }, [damageData]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    onLogout();
  };

  // Memoized functions to prevent recreation
  const getSeverityColor = useCallback((severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "red";
      case "high":
        return "orange";
      case "medium":
        return "yellow";
      case "low":
        return "green";
      default:
        return "blue";
    }
  }, []);

  const getSeverityBadgeColor = useCallback((severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getPriorityClasses = useCallback((priority) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in progress":
        return "text-yellow-600 bg-yellow-100";
      case "pending":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  }, []);

  // Memoized custom icon creation
  const createCustomIcon = useCallback(
    (severity) => {
      const color = getSeverityColor(severity);
      return new L.DivIcon({
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        className: "custom-marker",
      });
    },
    [getSeverityColor]
  );

  const MapView = () => {

    const [mapStyle, setMapStyle] = useState("cartoLight");

    // Define available styles
    const tileLayers = {
      osm: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors',
      },
      cartoLight: {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      },
      cartoDark: {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      },
      esri: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
      },
      esriSatellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
      },
    };


    const currentData = useMemo(
      () => (damageData),
      [damageData]
    );

    const filteredData = useMemo(() => {
      if (selectedSeverity === "All") return currentData;
      return currentData.filter(
        (d) => d.severity?.toLowerCase() === selectedSeverity.toLowerCase()
      );
    }, [currentData, selectedSeverity]);


    // Memoize the markers to prevent recreation
    const markers = useMemo(() => {
      return filteredData.map((damage) => (
        <Marker
          key={`marker-${damage.id}`}
          position={damage.coords}
          icon={createCustomIcon(damage.severity)}
        >
          <Popup className="custom-popup">
            <div className="p-2 min-w-[200px]">
              <div className="font-semibold text-lg text-gray-800 mb-2">
                {damage.type}
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Location:{" "}
                  </span>
                  <span className="text-sm text-gray-800">
                    {damage.location}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Severity:{" "}
                  </span>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${getSeverityBadgeColor(
                      damage.severity
                    )}`}
                  >
                    {damage.severity}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Status:{" "}
                  </span>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${getStatusColor(
                      damage.status
                    )}`}
                  >
                    {damage.status}
                  </span>
                </div>
                {damage.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      Description:{" "}
                    </span>
                    <p className="text-sm text-gray-800 mt-1">
                      {damage.description}
                    </p>
                  </div>
                )}
                {damage.reportedDate && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      Reported:{" "}
                    </span>
                    <span className="text-sm text-gray-800">
                      {damage.reportedDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ));
    }, [filteredData, createCustomIcon, getSeverityBadgeColor, getStatusColor]);

    return (
      <div className="h-full flex flex-col bg-gray-50">

        <div className="bg-white border-b border-gray-200 p-3">
          <label className="mr-2 text-sm font-medium text-gray-700">
            Select Map Style:
          </label>
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="border rounded p-1 text-sm"
          >
            <option value="osm">Default OSM</option>
            <option value="cartoLight">Carto Light</option>
            <option value="cartoDark">Carto Dark</option>
            <option value="esri">Esri Streets</option>
            <option value="esriSatellite">Esri Satellite</option>
          </select>
          <label className="ml-4 mr-2 text-sm font-medium text-gray-700">
            Filter by Severity:
          </label>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="border rounded p-1 text-sm"
          >
            <option value="All">All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

        </div>
        {/* Map Container */}
        <div className="flex-1 relative">

          <MapContainer
            center={[22.2950, 73.2000]} // Vadodara
            zoom={13.5} // good for city-level view
            style={{ height: "100%", width: "100%" }}
            className="z-0"
            key="damage-map"
          >
            <TileLayer
              attribution={tileLayers[mapStyle].attribution}
              url={tileLayers[mapStyle].url}
            />
            {markers}
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
            <h4 className="font-semibold text-gray-800 mb-3">
              Severity Legend
            </h4>
            <div className="space-y-2">
              {[
                { severity: "Critical", color: "red" },
                { severity: "High", color: "orange" },
                { severity: "Medium", color: "yellow" },
                { severity: "Low", color: "green" },
              ].map(({ severity, color }) => (
                <div key={severity} className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-sm text-gray-700">{severity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AnalyticsView = () => {
    const currentData = useMemo(
      () => (damageData),
      [damageData]
    );
    const [searchTerm, setSearchTerm] = useState("");
    const [severityFilter, setSeverityFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [sortBy, setSortBy] = useState("date-desc");

    const filteredData = useMemo(() => {
      let data = [...currentData];

      // 🔍 Search by location or type
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        data = data.filter(
          (d) =>
            d.location.toLowerCase().includes(lower) ||
            d.type.toLowerCase().includes(lower)
        );
      }

      // ⚡ Filter by severity
      if (severityFilter !== "All") {
        data = data.filter((d) => d.severity === severityFilter);
      }

      // 🎯 Filter by type
      if (typeFilter !== "All") {
        data = data.filter((d) => d.type === typeFilter);
      }

      // 📊 Sorting
      if (sortBy === "date-asc") {
        data.sort((a, b) => new Date(a.reportedDate) - new Date(b.reportedDate));
      } else if (sortBy === "date-desc") {
        data.sort((a, b) => new Date(b.reportedDate) - new Date(a.reportedDate));
      } else if (sortBy === "severity-asc") {
        const sevOrder = ["Low", "Medium", "High", "Critical"];
        data.sort(
          (a, b) => sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity)
        );
      } else if (sortBy === "severity-desc") {
        const sevOrder = ["Low", "Medium", "High", "Critical"];
        data.sort(
          (a, b) => sevOrder.indexOf(b.severity) - sevOrder.indexOf(a.severity)
        );
      }

      return data;
    }, [currentData, searchTerm, severityFilter, typeFilter, sortBy]);


    // Memoize analytics calculations to prevent recalculation on every render
    const analyticsData = useMemo(() => {
      const damageTypeData = currentData.reduce((acc, damage) => {
        const existing = acc.find((item) => item.type === damage.type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ type: damage.type, count: 1 });
        }
        return acc;
      }, []);

      const severityData = currentData.reduce((acc, damage) => {
        const existing = acc.find((item) => item.severity === damage.severity);
        if (existing) {
          existing.count++;
        } else {
          acc.push({
            severity: damage.severity,
            count: 1,
            color: getSeverityColor(damage.severity),
          });
        }
        return acc;
      }, []);

      const statusData = currentData.reduce((acc, damage) => {
        const existing = acc.find((item) => item.status === damage.status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ status: damage.status, count: 1 });
        }
        return acc;
      }, []);

      return { damageTypeData, severityData, statusData };
    }, [currentData, getSeverityColor]);

    // Static monthly trend data to prevent recreation
    const [endIndex, setEndIndex] = useState(0); // offset for pagination

    const monthlyTrendData = useMemo(() => {
      if (!currentData || currentData.length === 0) return [];

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // count damages grouped by year+month
      const counts = {};
      currentData.forEach((item) => {
        if (!item.reportedDate) return;
        const date = new Date(item.reportedDate);
        if (isNaN(date)) return;
        const key = `${date.getFullYear()}-${date.getMonth()}`; // e.g. 2025-8
        counts[key] = (counts[key] || 0) + 1;
      });

      // build a list of all months up to current
      const now = new Date();
      const months = [];
      for (let y = 2020; y <= now.getFullYear(); y++) {
        for (let m = 0; m < 12; m++) {
          if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) {
            break; // don't include future months
          }
          months.push({ key: `${y}-${m}`, label: `${monthNames[m]} ${y}`, damages: counts[`${y}-${m}`] || 0 });
        }
      }

      // slice last 3 months based on endIndex
      const sliceEnd = months.length - endIndex;
      const sliceStart = Math.max(0, sliceEnd - 6);
      return months.slice(sliceStart, sliceEnd);
    }, [currentData, endIndex]);

    const handleDownload = () => {
      if (!filteredData || filteredData.length === 0) {
        alert("No data to download!");
        return;
      }

      // Define headers
      const headers = ["ID", "Type", "Location", "Severity", "Status", "Reported Date"];

      // Build CSV rows with formatted dates
      const rows = filteredData.map(d => [
        d.id,
        d.type,
        d.location,
        d.severity,
        d.status,
        d.reportedDate
          ? new Date(d.reportedDate).toLocaleDateString("en-GB") // 👉 dd/mm/yyyy
          : "N/A"
      ]);

      const csvContent =
        [headers, ...rows]
          .map(row => row.map(value => `"${value}"`).join(",")) // wrap each cell in quotes
          .join("\n");

      // Create blob and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "damage_reports.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="h-full bg-gray-50 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
          <TrendingUp className="mr-3 text-blue-600" />
          Damage Analytics & Insights
        </h2>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Damage Types Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              {/* <BarChart3 className="mr-2 text-blue-600" /> */}
              Damage Types Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData.damageTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Severity Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Severity Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analyticsData.severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ severity, count }) => `${severity}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <TrendingUp className="mr-2 text-green-600" />
              Monthly Damage Reports Trend
            </h3>
            <div className="space-x-2">
              <button
                onClick={() => setEndIndex((prev) => Math.min(prev + 1, 100))}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                ←
              </button>
              <button
                onClick={() => setEndIndex((prev) => Math.max(prev - 1, 0))}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                disabled={endIndex === 0}
              >
                →
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="damages"
                stroke="#10b981"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>


        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">

            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Eye className="mr-2 text-purple-600" />
              Detailed Damage Reports
            </h3>
            <div className="flex flex-wrap gap-4 mb-4 items-center">
              {/* 🔍 Search */}
              <input
                type="text"
                placeholder="Search by location or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border rounded px-3 py-2 text-sm w-60"
              />

              {/* ⚡ Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="All">All Severities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>

              {/* 🎯 Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="All">All Types</option>
                {[...new Set(currentData.map((d) => d.type))].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* 📊 Sorting */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="severity-desc">Severity (High → Low)</option>
                <option value="severity-asc">Severity (Low → High)</option>
              </select>

              {/* 🔢 Results Count */}
              <span className="text-gray-600 text-sm">
                Results: {filteredData.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    ID
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    Location
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    Severity
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    Reported
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((damage) => (
                  <tr key={damage.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{damage.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {damage.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {damage.location}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityBadgeColor(
                          damage.severity
                        )}`}
                      >
                        {damage.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          damage.status
                        )}`}
                      >
                        {damage.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {damage.reportedDate
                        ? new Date(damage.reportedDate).toISOString().split("T")[0].split("-").reverse().join("/")
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                ⬇ Download CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Road Damage Detection System
              </h1>
              <p className="text-sm text-gray-600">
                Infrastructure Monitoring Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-medium text-slate-700">
                Welcome, {user.name}
              </div>
              <Clock />
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-200">
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setActiveTab("map")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === "map"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">Damage Map</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === "analytics"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Analytics</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {activeTab === "map" ? <MapView /> : <AnalyticsView />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
