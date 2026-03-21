from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from agent import generate_signal
import uvicorn

app = FastAPI(title="BitDrum AI Agent API")

class SignalRequest(BaseModel):
    market_id: str

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/signal")
async def get_signal(request: SignalRequest):
    """
    Triggers the ReAct agent loop and returns a signal.
    """
    try:
        signal = await generate_signal(request.market_id)
        return {"market_id": request.market_id, "signal": signal}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pom/{market_id}")
async def get_pom(market_id: str):
    """
    Uses the agent to determine the POM (Probable Outcome Multiplier).
    """
    # In a real scenario, this would part of the agent's rationale or a separate prompt
    # For now, we'll use the same engine
    try:
        result = await generate_signal(market_id)
        return {"market_id": market_id, "pom_analysis": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
