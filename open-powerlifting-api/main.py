from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date
import os
from dotenv import load_dotenv
import math
import json
from decimal import Decimal

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()


DATABASE_URL = "dbname=" + os.getenv('PG_DB_NAME') + " user=" + os.getenv('PG_USER') + " password=" + os.getenv('PG_PASSWORD') + " host=" + os.getenv('PG_DB_HOST')


def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

class Entry(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    sex: Optional[str] = None
    event: Optional[str] = None
    equipment: Optional[str] = None
    age: Optional[float] = None
    division: Optional[str] = None
    bodyweight: Optional[float] = None
    weight_class: Optional[str] = None
    best_squat: Optional[float] = None
    best_bench: Optional[float] = None
    best_deadlift: Optional[float] = None
    total: Optional[float] = None
    place: Optional[str] = None
    date: Optional[date]
    meet_name: Optional[str] = None
    ranking: Optional[int] = None
    federation: Optional[str] = None
    dots: Optional[float] = None

class Values(BaseModel):
    value: str

@app.get("/")
def read_root():
    return {"message": "Welcome to the API!"}

# complete
@app.get("/entries/", response_model=List[Entry])
def read_entries():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM entries;")
    entries = cursor.fetchall()
    cursor.close()
    conn.close()
    return entries

@app.get("/entries/{entry_id}", response_model=Entry)
def read_item(entry_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM entries WHERE id = %s;", (entry_id,))
    entry= cursor.fetchone()
    cursor.close()
    conn.close()
    if entry is None:
        raise HTTPException(status_code=404, detail="entry not found")
    return entry

# get unique column values
@app.get("/entries/column/{column_name}", response_model=List[Values])
def read_column_values(column_name: str):
    # Validate column name to prevent SQL injection
    valid_columns = {'equipment', 'federation', 'division', 'weight_class'}
    if column_name not in valid_columns:
        raise HTTPException(status_code=400, detail=f"Invalid column name. Must be one of: {valid_columns}")

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    query = f"""
        SELECT DISTINCT {column_name} as value 
        FROM entries 
        WHERE {column_name} IS NOT NULL 
        AND {column_name} != '' 
        AND {column_name} != 'NaN'
        ORDER BY {column_name};
    """
    print(f"Executing query: {query}")  # Debug print
    
    try:
        cursor.execute(query)
        values = cursor.fetchall()
        print(f"Retrieved {len(values)} values for {column_name}: {values[:5]}")  # Debug print first 5 values
    except Exception as e:
        print(f"Error executing query: {str(e)}")  # Debug print
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
    
    return values


# complete
@app.get("/entries/athlete/{athlete_name}", response_model=List[Entry])
def read_entry(athlete_name: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT 
            id, name, sex, event, equipment,
            CASE WHEN age = 'NaN'::float OR age = 'Infinity'::float OR age = '-Infinity'::float THEN NULL ELSE age END AS age,
            division,
            CASE WHEN bodyweight = 'NaN'::float OR bodyweight = 'Infinity'::float OR bodyweight = '-Infinity'::float THEN NULL ELSE bodyweight END AS bodyweight,
            weight_class,
            CASE WHEN best_squat = 'NaN'::float OR best_squat = 'Infinity'::float OR best_squat = '-Infinity'::float THEN NULL ELSE best_squat END AS best_squat,
            CASE WHEN best_bench = 'NaN'::float OR best_bench = 'Infinity'::float OR best_bench = '-Infinity'::float THEN NULL ELSE best_bench END AS best_bench,
            CASE WHEN best_deadlift = 'NaN'::float OR best_deadlift = 'Infinity'::float OR best_deadlift = '-Infinity'::float THEN NULL ELSE best_deadlift END AS best_deadlift,
            CASE WHEN total = 'NaN'::float OR total = 'Infinity'::float OR total = '-Infinity'::float THEN NULL ELSE total END AS total,
            CASE WHEN dots = 'NaN'::float OR dots = 'Infinity'::float OR dots = '-Infinity'::float THEN NULL ELSE dots END AS dots,
            place, date, meet_name, federation
        FROM entries 
        WHERE name = %s 
        ORDER BY date ASC;
    """, (athlete_name,))
    entries = cursor.fetchall()
    cursor.close()
    conn.close()
    if not entries:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entries

@app.get("/entries/date_range/", response_model=List[Entry])
def read_entries_by_date_range(start_date: date, end_date: date):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT * FROM entries
        WHERE date BETWEEN %s AND %s;
    """, (start_date, end_date))
    entries = cursor.fetchall()
    cursor.close()
    conn.close()
    return entries

# AND bodyweight IN (SELECT bodyweight FROM entries WHERE name = %s AND DATE_TRUNC('year', date) = DATE_TRUNC('year', %s) ORDER BY date desc LIMIT 1)

@app.get("/entries/athlete_ranking/{athlete}/{year}/{equipment}/{federation}/{division}/{weight_class}", response_model=List[Entry])
def read_entries_by_rank(athlete: str, year: str, equipment: str, federation: str, division: str , weight_class: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""   
        WITH RankedAthletes AS (
            SELECT 
                name,
                CASE WHEN total = 'NaN'::float OR total = 'Infinity'::float OR total = '-Infinity'::float THEN 0 ELSE CAST(total as FLOAT) END AS total,
                sex,
                date,
                weight_class,
                division,
                equipment,
                meet_name,
                federation,
                dots,
                CASE WHEN best_squat = 'NaN'::float OR best_squat = 'Infinity'::float OR best_squat = '-Infinity'::float THEN NULL ELSE best_squat END AS best_squat,
                CASE WHEN best_bench = 'NaN'::float OR best_bench = 'Infinity'::float OR best_bench = '-Infinity'::float THEN NULL ELSE best_bench END AS best_bench,
            CASE WHEN best_deadlift = 'NaN'::float OR best_deadlift = 'Infinity'::float OR best_deadlift = '-Infinity'::float THEN NULL ELSE best_deadlift END AS best_deadlift,
                RANK() OVER (
                    PARTITION BY federation, sex, weight_class, division, equipment, DATE_TRUNC('year', date) 
                    ORDER BY total DESC NULLS LAST
                ) AS ranking
            FROM entries
            WHERE DATE_TRUNC('year', date) = TO_DATE(%s, 'YYYY')
            AND weight_class = %s
            AND division = %s
            AND federation = %s 
            AND equipment = %s
            AND total > 0
            GROUP BY name, total, sex, date, weight_class, division, equipment, meet_name, federation, dots, best_squat, best_bench, best_deadlift
        )
        SELECT ra.*
        FROM RankedAthletes ra
        JOIN (
            SELECT ranking, sex 
            FROM RankedAthletes 
            WHERE name = %s
        ) target_rank
        ON ra.ranking BETWEEN target_rank.ranking - 3 AND target_rank.ranking + 3
        WHERE total > 0
        ORDER BY ra.ranking;
    """, (year, weight_class, division, federation, equipment, athlete))
    entries = cursor.fetchall()
    cursor.close()
    conn.close()
    if not entries:
        raise HTTPException(status_code=404, detail="No ranking data found")
    return entries


@app.get("/entries/bodyweight/", response_model=List[Entry])
def get_lifters_by_bodyweight(bodyweight: float, tolerance: float = 0.5):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT id, name, sex, event, equipment,
            CASE WHEN age = 'NaN'::float OR age = 'Infinity'::float OR age = '-Infinity'::float THEN NULL ELSE age END AS age,
            division,
            CASE WHEN bodyweight = 'NaN'::float OR bodyweight = 'Infinity'::float OR bodyweight = '-Infinity'::float THEN NULL ELSE bodyweight END AS bodyweight,
            weight_class,
            CASE WHEN best_squat = 'NaN'::float OR best_squat = 'Infinity'::float OR best_squat = '-Infinity'::float THEN NULL ELSE best_squat END AS best_squat,
            CASE WHEN best_bench = 'NaN'::float OR best_bench = 'Infinity'::float OR best_bench = '-Infinity'::float THEN NULL ELSE best_bench END AS best_bench,
            CASE WHEN best_deadlift = 'NaN'::float OR best_deadlift = 'Infinity'::float OR best_deadlift = '-Infinity'::float THEN NULL ELSE best_deadlift END AS best_deadlift,
            CASE WHEN total = 'NaN'::float OR total = 'Infinity'::float OR total = '-Infinity'::float THEN NULL ELSE total END AS total,
            place, date, meet_name
        FROM entries
        WHERE bodyweight BETWEEN %s AND %s
        ORDER BY total desc
        LIMIT 100;
    """, (bodyweight - tolerance, bodyweight + tolerance))
    entries = cursor.fetchall()
    entries = sanitize_data(entries)
    cursor.close()
    conn.close()
    return entries

@app.get("/entries/performance/", response_model=List[Entry])
def get_lifters_by_performance(squat: float, bench: float, deadlift: float, tolerance: float = 5.0):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT * FROM entries
        WHERE best_squat BETWEEN %s AND %s
        AND best_bench BETWEEN %s AND %s
        AND best_deadlift BETWEEN %s AND %s;
    """, (squat - tolerance, squat + tolerance,
          bench - tolerance, bench + tolerance,
          deadlift - tolerance, deadlift + tolerance))
    entries = cursor.fetchall()
    cursor.close()
    conn.close()
    return entries

@app.get("/entries/compare/{entry_id}", response_model=Entry)
def compare_lifter(entry_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get the specific lifter's entry
    cursor.execute("SELECT * FROM entries WHERE id = %s;", (entry_id,))
    lifter = cursor.fetchone()
    if lifter is None:
        raise HTTPException(status_code=404, detail="Lifter not found")
    
    # Get competitors in the same weight class
    cursor.execute("SELECT * FROM entries WHERE weight_class = %s;", (lifter['weight_class'],))
    competitors = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"lifter": lifter, "competitors": competitors}


def sanitize_data(data):
    if isinstance(data, list):
        return [sanitize_data(item) for item in data]
    elif isinstance(data, dict):
        return {k: sanitize_data(v) for k, v in data.items()}
    elif isinstance(data, float) and (math.isnan(data) or math.isinf(data)):
        return None  # Convert NaN, Infinity, -Infinity to None
    elif isinstance(data, Decimal):
        return float(data)  # Convert Decimal to float
    else:
        return data  # Return other types unchanged
