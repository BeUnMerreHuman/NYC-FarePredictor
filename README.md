# NYC-FarePredictor
This project implements a hybrid machine learning system to predict taxi fares using public New York City Taxi and Limousine Commission (TLC) datasets.  By combining exploratory data analysis (EDA) with advanced modeling, the system distinguishes between deterministic business rules and stochastic, non-linear variables.

# NYC Taxi Fare Prediction System (2023)

This project implements a hybrid machine learning system designed to predict taxi fares using the **New York City Taxi and Limousine Commission (TLC)** public datasets. By merging deterministic business logic (fixed fees and taxes) with predictive modeling (stochastic variables), the system achieves high accuracy and interpretability.

---

## 🚀 Overview

The system processes over **40 million trip records** from 2023. It addresses the challenges of **Big Data** under limited computational resources by leveraging efficient storage formats and a multi-model ensemble pipeline.

### Key Features

* **Hybrid Modeling:** Explicitly models deterministic components (MTA tax, congestion surcharges) while using ML for variable components (base fare, tips, tolls).
* **Big Data Optimized:** Uses **Apache Parquet** to maintain a small storage footprint (800MB vs 5GB+ in CSV).
* **Multi-Model Pipeline:** A five-model ensemble designed to capture non-linear patterns and improve robustness.
* **Minimal Inference Input:** Requires only pickup/drop-off locations, time, and distance.

---

## 📊 Dataset Specifications

The project utilizes the **2023 Yellow Taxi Trip Records**:

* **Format:** Apache Parquet
* **Volume:** ~40 Million records (pre-cleaning)
* **Features:** Spatial (Taxi Zones 1-265), Temporal (Timestamps), and Financial (Fare breakdown).
* **Target Variable:** `total_amount` (Decomposed into deterministic and predictive components).

---

## 🛠 Tech Stack

* **Language:** Python
* **Data Handling:** DuckDB / Pandas (for Parquet processing)
* **Machine Learning:** XGBoost / Scikit-learn
* **Compute:** Training and Testing on GPU 
* **Backend/UI:** Python-based inference server

---

## ⚙️ Installation & Setup

### Prerequisites

* Python 3.8+
* Jupyter Notebook

### Step-by-Step Execution

Follow these steps in order to prepare the models and launch the application:

1. **Data Processing & Training:**
Open and run all cells in the training notebook to process the 2023 Parquet files and save the trained models.
```bash
# Run in your Jupyter environment
EDA_and_Model_training.ipynb

```


2. **Install Dependencies:**
Install the necessary Python libraries.
```bash
pip install -r requirements.txt

```


3. **Launch the Inference Server:**
Run the source script to start the local backend.
```bash
python src.py

```


4. **Access the UI:**
Open your web browser and navigate to:
`http://localhost:8000`

---

## 📐 Methodology

The system operates on the principle that a taxi fare is not a "black box."


1. **EDA:** Identified deterministic business rules (e.g., $0.50 MTA tax, $2.50 congestion surcharge).
2. **Explicit Modeling:** Fixed surcharges are added via a logic layer based on `RatecodeID` and location.
3. **ML Layer:** Gradient Boosted Decision Trees handle the non-linear relationship between distance, time of day, and the base meter fare.

---

## ⚠️ Limitations

* Valid only for **2023 operational context**.
* Does not account for inflation or regulatory changes post-2023.
* Designed for academic demonstration, not real-time production deployment.

