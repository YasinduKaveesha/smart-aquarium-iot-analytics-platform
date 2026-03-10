# Smart Aquarium IoT Analytics Platform

An **end-to-end IoT monitoring and analytics platform** that continuously tracks aquarium water conditions and generates intelligent maintenance recommendations using real-time sensor data and machine learning.

This project demonstrates a **complete IoT data pipeline**, including embedded sensor integration, MQTT communication, backend data ingestion, NoSQL storage, machine learning analytics, and a web-based dashboard for real-time monitoring.

---

# Overview

Maintaining stable water quality is critical for aquarium ecosystems. Manual monitoring is inconsistent and often fails to detect gradual changes that can stress or harm fish.

This system automates the monitoring process by:

- Continuously collecting water quality data  
- Analyzing sensor patterns using machine learning  
- Forecasting potential issues before they occur  
- Providing a clear maintenance recommendation through a dashboard  

The platform converts multiple sensor readings into a **Water Quality Index (WQI)** and combines it with anomaly detection and forecasting models to determine overall aquarium health.

---

# System Architecture

The platform follows a **layered IoT architecture** designed for modularity, scalability, and reliability.

```
Sensors (pH, Temperature, TDS, Turbidity)
        ↓
ESP32 Microcontroller
        ↓
MQTT Communication Layer
        ↓
Backend Data Ingestion Service
        ↓
MongoDB NoSQL Database
        ↓
Analytics Engine (WQI + ML Models)
        ↓
React Web Dashboard
```

---

## Device Layer

The ESP32 microcontroller collects sensor readings at fixed intervals and publishes structured data packets using MQTT.

---

## Communication Layer

MQTT enables lightweight and reliable real-time communication between the device and backend services.

---

## Backend Layer

Backend services handle:

- Data validation  
- Message processing  
- Data storage  
- API endpoints for dashboard access  

---

## Data Storage Layer

Sensor readings are stored in **MongoDB**, providing flexible schema design and efficient time-series data handling.

---

## Analytics Layer

The analytics engine computes water quality metrics and runs machine learning models to detect anomalies and predict trends.

---

## Dashboard Layer

A web dashboard provides real-time visualization and maintenance recommendations.

---

# Key Features

## Real-Time IoT Monitoring

Sensor readings are collected every **5 minutes** and transmitted to the backend for processing and storage.

---

## Water Quality Index (WQI)

Multiple water parameters are combined into a single health score.

```
WQI = 0.35 × pH
    + 0.35 × TDS
    + 0.20 × Turbidity
    + 0.10 × Temperature
```

WQI provides a simplified representation of overall water quality.

| WQI Range | Condition |
|----------|----------|
| 80–100 | Stable |
| 60–80 | Monitor |
| 40–60 | Recommended Soon |
| 20–40 | Maintenance Required |
| <20 | Critical |

---

## Anomaly Detection

An **Isolation Forest model** identifies abnormal patterns in sensor data that may indicate:

- Filter failures  
- Contamination  
- Sudden chemical changes  
- Equipment malfunction  

---

## Predictive Forecasting

An **ARIMA time-series model** predicts short-term trends in sensor values to detect potential issues before they become critical.

---

## Alert Persistence Logic

To reduce false alarms, the system triggers alerts only after **five consecutive degraded readings**.

---

## Interactive Dashboard

The web dashboard provides:

- Real-time sensor values  
- Historical trend charts  
- Water Quality Index visualization  
- Anomaly alerts  
- Maintenance recommendations  

The dashboard supports both **Simple Mode** (for casual users) and **Advanced Mode** (for detailed analytics).

---

# Technology Stack

## Hardware

- ESP32 Microcontroller  
- pH Sensor  
- DS18B20 Temperature Sensor  
- TDS Sensor  
- Turbidity Sensor  

---

## Backend

- Node.js / Python  
- MQTT Protocol  
- REST API Services  

---

## Database

- MongoDB (NoSQL time-series database)

---

## Machine Learning

- Isolation Forest (Anomaly Detection)  
- ARIMA (Time-Series Forecasting)

---

## Frontend

- React.js  
- Chart.js  

---

# Example Sensor Data

```json
{
  "timestamp": "2026-02-10T10:15:00Z",
  "temperature": 25.3,
  "ph": 6.8,
  "tds": 120,
  "turbidity": 2.3,
  "status": "NORMAL"
}
```

---

# Project Structure

```
smart-aquarium-iot-analytics-platform

├── firmware/
│   └── ESP32 sensor firmware
│
├── backend/
│   └── MQTT subscriber and API services
│
├── analytics/
│   └── WQI computation and machine learning models
│
├── database/
│   └── MongoDB schema and configuration
│
├── dashboard/
│   └── React frontend application
│
└── docs/
    └── System architecture diagrams and documentation
```

---

# Use Cases

- Home aquarium monitoring  
- Aquaculture water quality management  
- IoT system architecture demonstration  
- Real-time sensor data analytics research  

---

# Future Improvements

- Automated water-change system  
- Mobile application  
- Cloud deployment  
- Multi-aquarium monitoring  
- Advanced deep learning forecasting models  

---

# Authors

- **M.Y.K. Kularathne**  
- **H.M.N.S. Premachandra**  
- **H.M.T.W. Dilshan**  
- **H.M.D.C. Hennayake**

IoT & Data Analytics Project
