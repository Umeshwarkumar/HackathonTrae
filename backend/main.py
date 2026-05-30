from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import sqlite3
from datetime import datetime
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="IntentLock Backend", version="1.0.0")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load and configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

client = genai.Client(api_key=GEMINI_API_KEY)

# Initialize SQLite database for audit logging
DATABASE = "intentlock_audit.db"

def init_database():
    """Initialize SQLite database with audit_log table"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            prompt TEXT,
            contract TEXT,
            violations_count INTEGER,
            safe BOOLEAN,
            drift_report TEXT
        )
    """)
    conn.commit()
    conn.close()

# Initialize database on startup
init_database()

# Request/Response models
class GenerateContractRequest(BaseModel):
    prompt: str

class AnalyzeRequest(BaseModel):
    contract: dict
    behavior: dict

class HealthResponse(BaseModel):
    status: str

class GenerateContractResponse(BaseModel):
    allowed_routes: list
    allowed_methods: list
    allowed_dependencies: list
    forbidden_actions: list

class AnalyzeResponse(BaseModel):
    violations: list
    safe: bool
    drift_report: str

class AuditLogRequest(BaseModel):
    prompt: str
    contract: dict
    violations_count: int
    safe: bool
    drift_report: str

class AuditLogResponse(BaseModel):
    logged: bool
    id: int

class AuditLogClearResponse(BaseModel):
    cleared: bool


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return {"status": "ok"}


@app.post("/generate-contract", response_model=GenerateContractResponse)
async def generate_contract(request: GenerateContractRequest):
    """
    Generate an intent contract from a natural language prompt using Gemini API.
    
    Args:
        request: Contains the user's natural language prompt
        
    Returns:
        Parsed JSON contract with allowed_routes, allowed_methods, 
        allowed_dependencies, and forbidden_actions
    """
    try:
        system_instruction = """You are an intent contract generator. Given a developer's prompt, generate a strict JSON contract with these fields:
allowed_routes (list of API paths),
allowed_methods (HTTP methods),
allowed_dependencies (npm packages),
forbidden_actions (list from: file_system_access, outbound_network_calls, child_process_execution, hardcoded_secrets, unauthorized_db_access).
Return ONLY valid JSON, no explanation, no markdown."""

        # Call Gemini API with the new syntax
        full_prompt = f"{system_instruction}\n\nUser prompt: {request.prompt}"
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt
        )
        
        # Extract and parse the JSON response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        if response_text.endswith("```"):
            response_text = response_text[:-3].strip()
        
        # Parse JSON
        contract = json.loads(response_text)
        
        # Validate required fields
        required_fields = ["allowed_routes", "allowed_methods", "allowed_dependencies", "forbidden_actions"]
        for field in required_fields:
            if field not in contract:
                raise ValueError(f"Missing required field: {field}")
        
        return contract
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse Gemini response as JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating contract: {str(e)}"
        )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Analyze behavior against an intent contract to detect violations.
    
    Args:
        request: Contains the contract and behavior to compare
        
    Returns:
        Analysis results with violations, safety status, and drift report
    """
    try:
        contract = request.contract
        behavior = request.behavior
        
        violations = []
        drift_report = ""
        safe = True
        
        # Extract forbidden actions from contract
        forbidden_actions = contract.get("forbidden_actions", [])
        
        # Check behavior against forbidden actions
        if "actions_performed" in behavior:
            for action in behavior["actions_performed"]:
                if action in forbidden_actions:
                    violations.append(f"Forbidden action performed: {action}")
                    safe = False
        
        # Check routes
        allowed_routes = contract.get("allowed_routes", [])
        if "routes_accessed" in behavior:
            for route in behavior["routes_accessed"]:
                if route not in allowed_routes:
                    violations.append(f"Unauthorized route accessed: {route}")
                    safe = False
        
        # Check methods
        allowed_methods = contract.get("allowed_methods", [])
        if "methods_used" in behavior:
            for method in behavior["methods_used"]:
                if method not in allowed_methods:
                    violations.append(f"Unauthorized HTTP method used: {method}")
                    safe = False
        
        # Check dependencies
        allowed_dependencies = contract.get("allowed_dependencies", [])
        if "dependencies_used" in behavior:
            for dep in behavior["dependencies_used"]:
                if dep not in allowed_dependencies:
                    violations.append(f"Unauthorized dependency used: {dep}")
                    safe = False
        
        # Check for forbidden file system access
        if "file_system_access" in forbidden_actions and behavior.get("fs_access"):
            violations.append("Forbidden action: file system access detected")
            safe = False
        
        # Check for forbidden network calls
        if "outbound_network_calls" in forbidden_actions and behavior.get("network_calls"):
            violations.append("Forbidden action: outbound network calls detected")
            safe = False
        
        # Check for forbidden child process execution
        if "child_process_execution" in forbidden_actions and behavior.get("child_process"):
            violations.append("Forbidden action: child process execution detected")
            safe = False
        
        # Check for hardcoded secrets
        if "hardcoded_secrets" in forbidden_actions and behavior.get("hardcoded_secrets"):
            violations.append("Forbidden action: hardcoded secrets detected")
            safe = False
        
        # Check for unauthorized database access
        if "unauthorized_db_access" in forbidden_actions and behavior.get("db_queries"):
            violations.append("Forbidden action: unauthorized database access detected")
            safe = False
        
        # Generate drift report
        if violations:
            drift_report = f"Found {len(violations)} violation(s): " + " | ".join(violations)
        else:
            drift_report = "No violations detected. Behavior is in compliance with contract."
        
        return {
            "violations": violations,
            "safe": safe,
            "drift_report": drift_report
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing behavior: {str(e)}"
        )


@app.post("/log", response_model=AuditLogResponse)
async def log_audit(request: AuditLogRequest):
    """
    Log an analysis to the audit trail.
    
    Args:
        request: Contains prompt, contract, violations, safety status, and drift report
        
    Returns:
        Confirmation with the logged row ID
    """
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        timestamp = datetime.now().isoformat()
        contract_json = json.dumps(request.contract)
        
        cursor.execute("""
            INSERT INTO audit_log (timestamp, prompt, contract, violations_count, safe, drift_report)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            timestamp,
            request.prompt,
            contract_json,
            request.violations_count,
            request.safe,
            request.drift_report
        ))
        
        conn.commit()
        row_id = cursor.lastrowid
        conn.close()
        
        return {"logged": True, "id": row_id}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error logging audit: {str(e)}"
        )


@app.get("/audit-log")
async def get_audit_log():
    """
    Retrieve the last 50 audit log entries.
    
    Returns:
        Array of audit log entries ordered by timestamp DESC
    """
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, timestamp, prompt, contract, violations_count, safe, drift_report
            FROM audit_log
            ORDER BY timestamp DESC
            LIMIT 50
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        # Convert rows to list of dicts
        logs = []
        for row in rows:
            logs.append({
                "id": row[0],
                "timestamp": row[1],
                "prompt": row[2],
                "contract": json.loads(row[3]) if row[3] else {},
                "violations_count": row[4],
                "safe": bool(row[5]),
                "drift_report": row[6]
            })
        
        return logs
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving audit log: {str(e)}"
        )


@app.delete("/audit-log", response_model=AuditLogClearResponse)
async def clear_audit_log():
    """
    Delete all entries from the audit log.
    
    Returns:
        Confirmation that the log was cleared
    """
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM audit_log")
        
        conn.commit()
        conn.close()
        
        return {"cleared": True}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing audit log: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
