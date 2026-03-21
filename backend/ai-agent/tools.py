from langchain.tools import tool
import random
import httpx

@tool
def get_btc_price() -> str:
    """
    Fetch the current BTC/USD price from the Pragma Oracle (simulated here).
    Returns:
        The current BTC price as a string.
    """
    # In production, this would call the Pragma API or a Starknet indexer
    # For now, we'll simulate a dynamic price around $65,000
    base_price = 65000
    volatility = random.uniform(-50, 50)
    current_price = base_price + volatility
    return f"BTC/USD: ${current_price:.2f}"

@tool
def get_pool_ratio(market_id: str) -> str:
    """
    Fetch the current UP/DOWN pool ratio for a specific market.
    Args:
        market_id: The ID of the market to check.
    Returns:
        The pool liquidity data (UP vs DOWN).
    """
    # Simulated pool data
    up_pool = random.uniform(0.1, 5.0)
    down_pool = random.uniform(0.1, 5.0)
    return f"Market {market_id} - UP: {up_pool:.3f} sBTC | DOWN: {down_pool:.3f} sBTC"

@tool
def get_top_trader_positions() -> str:
    """
    Analyze the current direction of the top-performing (ORACLE tier) traders.
    Returns:
        A summary of where top traders are positioned.
    """
    # Simulated data from LeaderboardRegistry
    oracle_traders = ["0x123", "0x456", "0x789", "0xabc", "0xdef"]
    up_votes = random.randint(0, 5)
    down_votes = 5 - up_votes
    return f"Top Traders: {up_votes} positioned UP | {down_votes} positioned DOWN"

# List of all tools available to the agent
bitdrum_tools = [get_btc_price, get_pool_ratio, get_top_trader_positions]
