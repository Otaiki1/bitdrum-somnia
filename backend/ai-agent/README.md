# BitDrum AI Agent

The AI Agent is the intelligence layer of the protocol, providing real-time trading signals and determining the dynamic payout rates (POM).

## Role in the System
- **Signal Inference**: Predicts market direction (UP/DOWN/NEUTRAL).
- **POM Computation**: Calculates the profit multiplier (5-70%) based on market conditions.
- **Top Trader Aggregation**: Weighs positioning of ORACLE-tier traders to inform signals.

## Stack
- Python / FastAPI
- ONNX Runtime (Time-series classifier)
- OpenAI API (LLM for rationales)
- PostgreSQL (Historical performance)
