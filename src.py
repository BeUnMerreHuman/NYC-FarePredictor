import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, ConfigDict
import duckdb
import pandas as pd
import xgboost as xgb
import numpy as np
from typing import Dict, Optional
from contextlib import asynccontextmanager
import uvicorn

# --- Configuration ---
MODEL_DIR = 'models'
STATIC_DIR = 'static'  # Directory where index.html, script.js, etc. live

# Model Paths
FARE_MODEL_PATH = os.path.join(MODEL_DIR, 'xgb_fare_predictor.ubj')
TOLLS_CLF_PATH = os.path.join(MODEL_DIR, 'xgb_classifier_tolls.ubj')
TOLLS_REG_PATH = os.path.join(MODEL_DIR, 'xgb_regressor_tolls.ubj')
TIPS_CLF_PATH = os.path.join(MODEL_DIR, 'xgb_classifier_tips.ubj')
TIPS_REG_PATH = os.path.join(MODEL_DIR, 'xgb_regressor_tips.ubj')

# Feature Lists
FARE_FEATURES = [
    'trip_distance', 'RatecodeID', 'duration_min', 'pickup_hour',
    'pickup_day', 'pickup_month', 'average_speed_mph', 'is_peaktime',
    'is_LaGuardia'
]

TOLLS_FEATURES = [
    'trip_distance', 'RatecodeID', 'PULocationID', 'DOLocationID',
    'duration_min', 'is_peaktime', 'pickup_day', 'average_speed_mph',
    'is_LaGuardia', 'congestion_surcharge'
]

TIPS_FEATURES = [
    'trip_distance', 'RatecodeID', 'PULocationID', 'DOLocationID',
    'duration_min', 'is_peaktime', 'pickup_day', 'average_speed_mph',
    'is_LaGuardia', 'fare_amount'
]


# --- Pydantic Models ---
class TripInput(BaseModel):
    trip_distance: float = Field(..., gt=0, description="Trip distance in miles")
    PULocationID: int = Field(..., ge=1, description="Pickup Location ID")
    DOLocationID: int = Field(..., ge=1, description="Dropoff Location ID")
    duration_min: float = Field(..., gt=0, description="Trip duration in minutes")
    pickup_hour: int = Field(..., ge=0, le=23, description="Pickup hour (0-23)")
    pickup_day: int = Field(..., ge=1, le=7, description="Day of week (1-7)")
    pickup_month: int = Field(..., ge=1, le=12, description="Month (1-12)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "trip_distance": 17.5,
                "PULocationID": 132,
                "DOLocationID": 237,
                "duration_min": 55,
                "pickup_hour": 17,
                "pickup_day": 3,
                "pickup_month": 6
            }
        }
    )


class FareBreakdown(BaseModel):
    fare: float
    tip: float
    tolls: float
    airport_fee: float
    airport_surcharge: float
    rushhour_surcharge: float
    congestion_surcharge: float
    improvement_surcharge: float
    mta_tax: float
    total: float


class PredictionResponse(BaseModel):
    total_amount: float
    breakdown: FareBreakdown


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    gpu_available: bool


# --- Taxi Fare Predictor Class ---
class TaxiFarePredictor:
    """
    Optimized taxi fare prediction system using DuckDB and GPU Acceleration.
    """

    def __init__(self, model_dir=MODEL_DIR):
        """Initialize predictor with model paths."""
        self.model_dir = model_dir
        self.models_loaded = False
        self.gpu_available = False
        self._load_models()

    def _load_models(self):
        """Load all XGBoost models."""
        print(f"Loading models from {self.model_dir}...")

        try:
            # Method 1: Try loading as sklearn estimators
            try:
                self.fare_reg = xgb.XGBRegressor()
                self.fare_reg.load_model(FARE_MODEL_PATH)
                
                self.tolls_clf = xgb.XGBClassifier()
                self.tolls_clf.load_model(TOLLS_CLF_PATH)
                
                self.tolls_reg = xgb.XGBRegressor()
                self.tolls_reg.load_model(TOLLS_REG_PATH)
                
                self.tips_clf = xgb.XGBClassifier()
                self.tips_clf.load_model(TIPS_CLF_PATH)
                
                self.tips_reg = xgb.XGBRegressor()
                self.tips_reg.load_model(TIPS_REG_PATH)
                
            except TypeError:
                # Method 2: Load as Booster then wrap in sklearn estimator
                print("⚠️  Loading as Booster objects...")
                
                fare_booster = xgb.Booster()
                fare_booster.load_model(FARE_MODEL_PATH)
                self.fare_reg = xgb.XGBRegressor()
                self.fare_reg._Booster = fare_booster
                
                tolls_clf_booster = xgb.Booster()
                tolls_clf_booster.load_model(TOLLS_CLF_PATH)
                self.tolls_clf = xgb.XGBClassifier()
                self.tolls_clf._Booster = tolls_clf_booster
                
                tolls_reg_booster = xgb.Booster()
                tolls_reg_booster.load_model(TOLLS_REG_PATH)
                self.tolls_reg = xgb.XGBRegressor()
                self.tolls_reg._Booster = tolls_reg_booster
                
                tips_clf_booster = xgb.Booster()
                tips_clf_booster.load_model(TIPS_CLF_PATH)
                self.tips_clf = xgb.XGBClassifier()
                self.tips_clf._Booster = tips_clf_booster
                
                tips_reg_booster = xgb.Booster()
                tips_reg_booster.load_model(TIPS_REG_PATH)
                self.tips_reg = xgb.XGBRegressor()
                self.tips_reg._Booster = tips_reg_booster

            # Try to set GPU params after loading
            try:
                gpu_params = {'device': 'cuda'}
                self.fare_reg.set_params(**gpu_params)
                self.tolls_clf.set_params(**gpu_params)
                self.tolls_reg.set_params(**gpu_params)
                self.tips_clf.set_params(**gpu_params)
                self.tips_reg.set_params(**gpu_params)
                self.gpu_available = True
                print("✅ Models loaded successfully on GPU!")
            except:
                print("⚠️  GPU not available, using CPU")
                self.gpu_available = False

            self.models_loaded = True
            print(f"✅ All models loaded successfully!")

        except Exception as e:
            print(f"❌ Error loading models: {e}")
            import traceback
            traceback.print_exc()
            # For development, we don't raise here to allow the server to start even if models fail
            # In production, you might want to raise
            pass

    def apply_business_logic_duckdb(self, conn, table_name='trips'):
        """
        Applies business logic using DuckDB SQL.
        Corrects RatecodeID logic and accurately calculates surcharges.
        """
        query = f"""
        CREATE OR REPLACE TABLE processed_trips AS
        SELECT
            *,
            -- 1. Ratecode Rules
            CASE
                -- If PULocationID or DOLocationID == 132 (JFK), Then RatecodeID == 2
                WHEN PULocationID = 132 OR DOLocationID = 132 THEN 2
                -- If DOLocation == 265 or 86, Then RatecodeID == 4
                WHEN DOLocationID = 265 OR DOLocationID = 86 THEN 4
                -- Else RatecodeID == 1
                ELSE 1
            END AS RatecodeID,

            -- 2. Airport Fee Rules (Seasonality check on JFK/Ratecode 2)
            CASE
                -- Only apply if JFK (132) is involved (which implies Ratecode 2 logic above)
                WHEN (PULocationID = 132 OR DOLocationID = 132) THEN
                    CASE
                        -- Months 1-3 -> $1.25
                        WHEN pickup_month BETWEEN 1 AND 3 THEN 1.25
                        -- Months 4-12 -> $1.75
                        WHEN pickup_month BETWEEN 4 AND 12 THEN 1.75
                        ELSE 0.00
                    END
                ELSE 0.00
            END AS airport_fee,

            -- 3. Airport Surcharge (LaGuardia Only)
            CASE
                WHEN PULocationID = 138 OR DOLocationID = 138 THEN 5.00
                ELSE 0.00
            END AS airport_surcharge,

            -- 4. Rushhour Surcharge (Full 24h coverage)
            CASE
                WHEN pickup_hour BETWEEN 0 AND 5 THEN 1.00
                WHEN pickup_hour BETWEEN 6 AND 15 THEN 0.50
                WHEN pickup_hour BETWEEN 16 AND 19 THEN 2.50
                WHEN pickup_hour BETWEEN 20 AND 23 THEN 1.00
                ELSE 0.00
            END AS rushhour_surcharge,

            -- 5. Congestion Surcharge
            CASE
                WHEN PULocationID IN (236, 237, 238, 239) OR
                     DOLocationID IN (236, 237, 238, 239) THEN 2.50
                ELSE 0.00
            END AS congestion_surcharge,

            -- Fixed Taxes
            0.50 AS mta_tax,
            1.00 AS improvement_surcharge,

            -- Feature placeholders needed for model columns (will be updated below)
            0 AS is_LaGuardia,
            0 AS is_peaktime,
            0 AS average_speed_mph
        FROM {table_name}
        """
        conn.execute(query)

        # FINAL SAFETY: Calculate derived features inside SQL
        conn.execute("""
            UPDATE processed_trips
            SET
                average_speed_mph = CASE WHEN duration_min > 0 THEN trip_distance/(duration_min/60.0) ELSE 0 END,
                is_LaGuardia = CASE WHEN PULocationID = 138 OR DOLocationID = 138 THEN 1 ELSE 0 END,
                is_peaktime = CASE WHEN pickup_hour BETWEEN 16 AND 19 THEN 1 ELSE 0 END
        """)

    def predict(self, data: Dict):
        """Predict for a single trip."""
        if not self.models_loaded:
            raise RuntimeError("Models not loaded!")

        conn = duckdb.connect(':memory:')
        
        try:
            df_input = pd.DataFrame([data])
            conn.execute("CREATE TABLE trips AS SELECT * FROM df_input")

            self.apply_business_logic_duckdb(conn)
            df = conn.execute("SELECT * FROM processed_trips").df()

            result = self._run_predictions(df)
            
            return self._format_result(result)
        finally:
            conn.close()

    def _run_predictions(self, df):
        """Run all model predictions on processed data."""
        # 1. Predict Fare
        pred_fares = self.fare_reg.predict(df[FARE_FEATURES])

        # Apply Rule:
        # Ratecode 2 = Fixed $70
        # Ratecode 1 & 4 = Regression (Variable)
        df['pred_fare_amount'] = np.where(
            df['RatecodeID'] == 2,
            70.0,
            pred_fares
        )
        df['pred_fare_amount'] = np.maximum(0, df['pred_fare_amount'])

        # 2. Predict Tolls
        has_tolls = self.tolls_clf.predict(df[TOLLS_FEATURES])
        tolls_amounts = self.tolls_reg.predict(df[TOLLS_FEATURES])

        df['pred_tolls_amount'] = np.maximum(0, has_tolls * tolls_amounts)

        # 3. Predict Tips (uses predicted fare)
        df['fare_amount'] = df['pred_fare_amount']
        tip_given = self.tips_clf.predict(df[TIPS_FEATURES])
        tip_percentages = self.tips_reg.predict(df[TIPS_FEATURES])

        raw_tips = df['pred_fare_amount'] * tip_percentages * tip_given
        df['pred_tip_amount'] = np.maximum(0, raw_tips)

        # 4. Calculate Total
        df['pred_total_amount'] = (
            df['pred_fare_amount'] +
            df['airport_fee'] +
            df['airport_surcharge'] +
            df['rushhour_surcharge'] +
            df['congestion_surcharge'] +
            df['improvement_surcharge'] +
            df['mta_tax'] +
            df['pred_tolls_amount'] +
            df['pred_tip_amount']
        )

        return df

    def _format_result(self, df):
        """Format prediction result - returns only numbers."""
        row = df.iloc[0]
        
        breakdown = {
            'fare': round(float(row['pred_fare_amount']), 2),
            'tip': round(float(row['pred_tip_amount']), 2),
            'tolls': round(float(row['pred_tolls_amount']), 2),
            'airport_fee': round(float(row['airport_fee']), 2),
            'airport_surcharge': round(float(row['airport_surcharge']), 2),
            'rushhour_surcharge': round(float(row['rushhour_surcharge']), 2),
            'congestion_surcharge': round(float(row['congestion_surcharge']), 2),
            'improvement_surcharge': round(float(row['improvement_surcharge']), 2),
            'mta_tax': round(float(row['mta_tax']), 2),
            'total': round(float(row['pred_total_amount']), 2)
        }
        
        return {
            'total_amount': breakdown['total'],
            'breakdown': breakdown
        }


# Initialize predictor
predictor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the predictor on startup."""
    global predictor
    try:
        predictor = TaxiFarePredictor()
        print("✅ API ready to serve predictions!")
    except Exception as e:
        print(f"❌ Failed to initialize predictor: {e}")
        # We don't raise here so you can still serve the static UI even if models fail
        # raise 
    yield
    print("🔄 Shutting down...")


# --- FastAPI Application ---
app = FastAPI(
    title="NYC Taxi Fare Prediction API",
    description="AI-powered taxi fare prediction system with detailed breakdowns",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    """Check API health and model status."""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return {
        "status": "healthy",
        "models_loaded": predictor.models_loaded,
        "gpu_available": predictor.gpu_available
    }


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict_fare(trip: TripInput):
    """
    Predict taxi fare for a given trip.
    """
    if predictor is None or not predictor.models_loaded:
        # Fallback simulation if models aren't loaded (so UI doesn't crash)
        # In production, you would raise error
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        result = predictor.predict(trip.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/simple", tags=["Prediction"])
async def predict_fare_simple(trip: TripInput):
    """
    Predict taxi fare and return only the total amount.
    """
    if predictor is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        result = predictor.predict(trip.dict())
        return {"total_amount": result['total_amount']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# --- STATIC FILES CONFIGURATION ---

# 1. Mount the folder to specific routes to avoid conflicts
# We check if 'static' folder exists first
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    # 2. Serve index.html at root
    @app.get("/")
    async def read_index():
        return FileResponse(os.path.join(STATIC_DIR, 'index.html'))

    # 3. Fallback to serve files from root (like script.js/csvs that HTML requests relatively)
    @app.get("/{filename}")
    async def serve_frontend_file(filename: str):
        file_path = os.path.join(STATIC_DIR, filename)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        # If it's not a file in static, standard 404 will occur or allow API to handle it
        raise HTTPException(status_code=404, detail="File not found")

else:
    @app.get("/")
    async def read_index():
        return {"error": "Static directory not found. Please create a 'static' folder and place frontend files there."}


if __name__ == "__main__":
    uvicorn.run(
        "src:app",  
        host="0.0.0.0",
        port=8000,
        reload=True
    )