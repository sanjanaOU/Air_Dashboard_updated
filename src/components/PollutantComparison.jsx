import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import { useLocation } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Brush,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import "./PollutantComparison.css";

const PollutantComparison = () => {
  const pollutantColors = {
    "CO(GT)": "#8dd3c7",
    "C6H6(GT)": "#b15928",
    "NMHC(GT)": "#bebada",
    "NO2(GT)": "#fb8072",
    "PT08.S5(O3)": "#80b1d3",
    "NOx(GT)": "#fdb462",
  };

  const pollutantUnits = {
    "CO(GT)": "mg/m³",
    "C6H6(GT)": "µg/m³",
    "NMHC(GT)": "µg/m³",
    "NO2(GT)": "µg/m³",
    "PT08.S5(O3)": "units",
    "NOx(GT)": "ppb",
  };

  const months = [
    { key: "01", label: "January" },
    { key: "02", label: "February" },
    { key: "03", label: "March" },
    { key: "04", label: "April" },
    { key: "05", label: "May" },
    { key: "06", label: "June" },
    { key: "07", label: "July" },
    { key: "08", label: "August" },
    { key: "09", label: "September" },
    { key: "10", label: "October" },
    { key: "11", label: "November" },
    { key: "12", label: "December" },
  ];

  const years = ["2004", "2005"];

  const getDaysInMonth = (year, month) => {
    if (!year || !month) return [];
    const numDays = new Date(Number(year), Number(month), 0).getDate();
    return Array.from({ length: numDays }, (_, i) => (i + 1).toString().padStart(2, "0"));
  };

  const { state } = useLocation();
  const { file } = state || {};
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(["CO(GT)", "NOx(GT)"]);
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [brushedData, setBrushedData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const recordsPerPage = 10; // 10 records per page

  const pollutants = Object.keys(pollutantColors);

  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const parsed = d3.csvParse(text, (d) => {
          const date = d3.timeParse("%m/%d/%Y")(d.Date);
          if (!date) return null;
          return {
            date: date.getTime(),
            year: date.getFullYear().toString(),
            month: (date.getMonth() + 1).toString().padStart(2, "0"),
            day: date.getDate().toString().padStart(2, "0"),
            ...pollutants.reduce((acc, p) => {
              const val = +d[p];
              acc[p] = val >= 0 ? val : null;
              return acc;
            }, {}),
          };
        });

        const cleaned = parsed.filter((d) => d && d.date);
        setData(cleaned);
      } catch (error) {
        console.error("CSV parse error:", error);
      }
    };
    reader.readAsText(file);
  }, [file]);

  const filteredData = data.filter((d) => {
    return (
      (!yearFilter || d.year === yearFilter) &&
      (!monthFilter || d.month === monthFilter) &&
      (!dayFilter || d.day === dayFilter)
    );
  });

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const getStatsData = () => {
    const stats = (key) => {
      const values = filteredData.map((d) => d[key]).filter((v) => v != null);
      return {
        min: d3.min(values) || 0,
        max: d3.max(values) || 0,
        avg: d3.mean(values) || 0,
      };
    };

    const stat1 = stats(selected[0]);
    const stat2 = stats(selected[1]);

    return [
      { name: "Min", [selected[0]]: stat1.min, [selected[1]]: stat2.min },
      { name: "Avg", [selected[0]]: stat1.avg, [selected[1]]: stat2.avg },
      { name: "Max", [selected[0]]: stat1.max, [selected[1]]: stat2.max },
    ];
  };

  const barData = getStatsData();

  const handleBrushChange = (brush) => {
    if (!brush) {
      setBrushedData([]);
      return;
    }

    const { startX, endX } = brush;
    const xKey = selected[0];
    const yKey = selected[1];

    const brushed = filteredData.filter((d) => {
      const xValue = d[xKey];
      const yValue = d[yKey];
      return (
        xValue != null &&
        yValue != null &&
        xValue >= startX &&
        xValue <= endX
      );
    });

    setBrushedData(brushed);
  };

  return (
    <div className="pollutant-comparison-container">
      {/* Dropdown Filters */}
      <div className="pollutant-select-container">
        <div>
          <label>Pollutant 1: </label>
          <select
            value={selected[0]}
            onChange={(e) => setSelected([e.target.value, selected[1]])}
            className="pollutant-select"
          >
            {pollutants.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Pollutant 2: </label>
          <select
            value={selected[1]}
            onChange={(e) => setSelected([selected[0], e.target.value])}
            className="pollutant-select"
          >
            {pollutants.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Year</label>
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setMonthFilter("");
              setDayFilter("");
              setBrushedData([]);
              setCurrentPage(1); // Reset to first page on filter change
            }}
            className="pollutant-select"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Month</label>
          <select
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setDayFilter("");
              setBrushedData([]);
              setCurrentPage(1); // Reset to first page on filter change
            }}
            disabled={!yearFilter}
            className="pollutant-select"
          >
            <option value="">All Months</option>
            {months.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Day</label>
          <select
            value={dayFilter}
            onChange={(e) => {
              setDayFilter(e.target.value);
              setBrushedData([]);
              setCurrentPage(1); // Reset to first page on filter change
            }}
            disabled={!monthFilter}
            className="pollutant-select"
          >
            <option value="">All Days</option>
            {getDaysInMonth(yearFilter, monthFilter).map((d) => (
              <option key={d} value={d}>{parseInt(d)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts Section */}
      <div className="pollutant-charts-container">
        {[0, 1].map((i) => (
          <div key={i} className="pollutant-chart-card">
            <h4>{`Pollutant ${i + 1}`}</h4>
            <h5
              style={{
                fontSize: "1rem",
                color: "#4a5568",
                marginTop: "-0.5rem",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              {selected[i]}
            </h5>
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(ts) => d3.timeFormat("%d/%m/%Y")(new Date(ts))}
                  angle={-10}
                />
                <YAxis
                  label={{
                    value: `Concentration (${pollutantUnits[selected[i]]})`,
                    angle: -90,
                    position: "insideLeft",
                    fill: "#4a5568",
                  }}
                />
                <Tooltip
                  formatter={(val) => [val?.toFixed?.(2) ?? val, selected[i]]}
                  labelFormatter={(ts) => d3.timeFormat("%d/%m/%Y")(new Date(ts))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={selected[i]}
                  stroke={pollutantColors[selected[i]]}
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Statistical Comparison */}
      <h4 style={{ marginLeft: "1rem" }}>Statistical Comparison</h4>
      <div className="pollutant-charts-container">
        <div className="pollutant-chart-card pollutant-bar-chart">
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={selected[0]} fill={pollutantColors[selected[0]]} />
              <Bar dataKey={selected[1]} fill={pollutantColors[selected[1]]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pollutant-chart-card pollutant-area-chart">
          <ResponsiveContainer width="100%" height={500}>
            <AreaChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(ts) => d3.timeFormat("%d/%m/%Y")(new Date(ts))}
                angle={-10}
              />
              <YAxis />
              <Tooltip
                formatter={(val, name) => [val?.toFixed?.(2) ?? val, name]}
                labelFormatter={(ts) => d3.timeFormat("%d/%m/%Y")(new Date(ts))}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey={selected[0]}
                stackId="1"
                stroke={pollutantColors[selected[0]]}
                fill={pollutantColors[selected[0]]}
              />
              <Area
                type="monotone"
                dataKey={selected[1]}
                stackId="1"
                stroke={pollutantColors[selected[1]]}
                fill={pollutantColors[selected[1]]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter Plot Section */}
      <h4 style={{ marginLeft: "1rem", marginTop: "2rem" }}>Pollutant Values Scatter Plot</h4>
      <div className="pollutant-charts-container">
        <div className="pollutant-chart-card pollutant-scatter-chart">
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid />
              <XAxis
                type="category"
                dataKey="pollutant"
                name="Pollutant"
                label={{
                  value: "Pollutants",
                  position: 'insideBottom',
                  offset: -5,
                }}
                stroke="#4a5568"
              />
              <YAxis
                type="number"
                dataKey="value"
                name="Value"
                label={{
                  value: "Pollutant Value",
                  angle: -90,
                  position: 'insideLeft',
                }}
                stroke="#4a5568"
                domain={[0, 'auto']}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [`${value?.toFixed?.(2) ?? value}`, name]}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
              <Scatter
                name={selected[0]}
                data={filteredData
                  .filter((d) => d[selected[0]] !== null && !isNaN(d[selected[0]]))
                  .map((d) => ({
                    pollutant: selected[0],
                    value: parseFloat(d[selected[0]]),
                  }))
                }
                fill={pollutantColors[selected[0]]}
                shape="circle"
              />
              <Scatter
                name={selected[1]}
                data={filteredData
                  .filter((d) => d[selected[1]] !== null && !isNaN(d[selected[1]]))
                  .map((d) => ({
                    pollutant: selected[1],
                    value: parseFloat(d[selected[1]]),
                  }))
                }
                fill={pollutantColors[selected[1]]}
                shape="triangle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Paginated Table Section */}
      <h4 style={{ marginLeft: "1rem", marginTop: "2rem" }}>Pollutant Data Table</h4>
      <div className="pollutant-charts-container">
        <div className="pollutant-chart-card" style={{ width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
            <thead>
              <tr style={{ backgroundColor: "cyan" }}>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Date</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>
                  {selected[0]} ({pollutantUnits[selected[0]]})
                </th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>
                  {selected[1]} ({pollutantUnits[selected[1]]})
                </th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((record, index) => (
                <tr key={index} >
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                    {d3.timeFormat("%d/%m/%Y")(new Date(record.date))}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                    {record[selected[0]] != null ? record[selected[0]].toFixed(2) : "N/A"}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                    {record[selected[1]] != null ? record[selected[1]].toFixed(2) : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: "8px 16px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                backgroundColor: currentPage === 1 ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Previous
            </button>
            <span style={{ alignSelf: "center" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: "8px 16px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                backgroundColor: currentPage === totalPages ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollutantComparison;