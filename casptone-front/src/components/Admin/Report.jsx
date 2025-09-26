import React, { useEffect, useState } from "react";
import api from "../../api/client";
import AppLayout from "../Header";
import { getForecast, downloadStockCsv, downloadUsageCsv, downloadReplenishmentCsv } from "../../api/inventoryApi";
import { exportProductionCsv } from "../../api/productionApi";

const Report = () => {
    const [reportData, setReportData] = useState([]);
    const [forecastData, setForecastData] = useState([]);
    const [windowDays, setWindowDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await api.get("/replenishment");
                setReportData(response.data || []);
                const fc = await getForecast({ window: windowDays });
                setForecastData(fc || []);
            } catch (err) {
                console.error("Error fetching reports:", err);
                setError("Failed to load reports.");
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [windowDays]);

    return (
        <AppLayout>
            <div className="container mt-4 wood-animated" role="region" aria-labelledby="inv-report-heading">
                <h2 id="inv-report-heading" className="fw-bold">Inventory Replenishment Report</h2>
                <div className="d-flex gap-2 mb-3">
                    <button className="btn btn-wood" aria-label="Download stock as CSV" onClick={downloadStockCsv}>Download Stock CSV</button>
                    <button className="btn btn-wood" aria-label="Download usage as CSV" onClick={() => downloadUsageCsv(90)}>Download Usage CSV</button>
                    <button className="btn btn-wood" aria-label="Download replenishment as CSV" onClick={downloadReplenishmentCsv}>Download Replenishment CSV</button>
                    <button className="btn btn-wood" aria-label="Download production as CSV" onClick={() => exportProductionCsv({})}>Download Production CSV</button>
                    <div className="ms-auto d-flex align-items-center gap-2">
                        <label htmlFor="fc-window" className="mb-0">Forecast window (days)</label>
                        <input id="fc-window" type="number" min="7" max="120" className="form-control" style={{width:120}}
                               value={windowDays} onChange={(e)=> setWindowDays(Number(e.target.value)||30)} aria-describedby="fc-help" />
                        <span id="fc-help" className="visually-hidden">Adjusts moving average window for forecasting</span>
                    </div>
                </div>
                {loading ? (
                    <p>Loading reports...</p>
                ) : error ? (
                    <p style={{ color: "red" }}>{error}</p>
                ) : (
                    <div className="card shadow-sm wood-card">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0" role="table" aria-label="Replenishment suggestions">
                                <thead className="table-light">
                                    <tr>
                                        <th>SKU</th>
                                        <th>Name</th>
                                        <th className="text-end">On Hand</th>
                                        <th className="text-end">Avg Daily Usage</th>
                                        <th className="text-end">ROP</th>
                                        <th className="text-end">Suggested Order</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.length > 0 ? (
                                        reportData.map((row) => (
                                            <tr key={row.sku}>
                                                <td>{row.sku}</td>
                                                <td>{row.name}</td>
                                                <td className="text-end">{row.on_hand}</td>
                                                <td className="text-end">{row.avg_daily_usage}</td>
                                                <td className="text-end">{row.rop}</td>
                                                <td className="text-end fw-bold">{row.suggested_order}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center">No data available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3">
                            <h5 id="forecast-heading">Forecast (Moving Average)</h5>
                            <div className="table-responsive">
                                <table className="table table-sm table-striped" role="table" aria-labelledby="forecast-heading">
                                    <thead>
                                        <tr>
                                            <th>SKU</th>
                                            <th>Name</th>
                                            <th className="text-end">On Hand</th>
                                            <th className="text-end">Avg Daily</th>
                                            <th className="text-end">Days to Depletion</th>
                                            <th className="text-end">ROP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {forecastData.map(row => (
                                            <tr key={row.sku}>
                                                <td>{row.sku}</td>
                                                <td>{row.name}</td>
                                                <td className="text-end">{row.on_hand}</td>
                                                <td className="text-end">{row.avg_daily_usage}</td>
                                                <td className="text-end">{row.days_to_depletion ?? '-'}</td>
                                                <td className="text-end">{row.reorder_point}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default Report;
